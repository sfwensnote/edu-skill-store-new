import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer, type Server } from 'node:http';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createProtocolModel } from './fixtures/execution-model';
import { newCompanion } from '../shared/learning-companion';
import { type Detection, type Trial, type TrialSession } from '../shared/execution';

const listen = (server: Server) => new Promise<string>(resolve => server.listen(0, '127.0.0.1', () => {
  const address = server.address(); resolve(`http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}`);
}));
const close = (server: Server) => new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()));

test('真实执行闭环：隔离协议夹具验证，不代替真实模型效果评估', async t => {
  const directory = await mkdtemp(path.join(os.tmpdir(), 'skill-execution-'));
  const keys = ['DATABASE_PATH', 'DESIGN_MODEL_URL', 'DESIGN_MODEL_NAME', 'DESIGN_MODEL_KEY', 'TEACHING_MODEL_URL', 'TEACHING_MODEL_NAME', 'TEACHING_MODEL_KEY', 'ENABLE_LEGACY_SEED', 'FRONTEND_ORIGINS'];
  const previous = keys.map(key => process.env[key]);
  process.env.DATABASE_PATH = path.join(directory, 'test.sqlite'); delete process.env.ENABLE_LEGACY_SEED;
  const { server: model, state } = createProtocolModel();
  let apiServer: Server | undefined;
  let database: { close(): void } | undefined;
  try {
    const modelRoot = await listen(model);
    for (const role of ['DESIGN', 'TEACHING']) { process.env[`${role}_MODEL_URL`] = `${modelRoot}/v1`; process.env[`${role}_MODEL_NAME`] = `fixture-${role}`; delete process.env[`${role}_MODEL_KEY`]; }
    const { createApp } = await import('../server/app');
    const { db } = await import('../server/store'); database = db;
    const repository = await import('../server/execution/repository');
    apiServer = createServer(createApp()); const root = await listen(apiServer);
    async function request(route: string, token = '', body?: unknown) {
      const response = await fetch(`${root}/api${route}`, { method: body === undefined ? 'GET' : 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
      return { status: response.status, body: await response.json() };
    }
    const a = (await request('/auth/register', '', { login: 'teacher-a', password: 'test-password', name: '教师甲', transport: 'bearer' })).body;
    const b = (await request('/auth/register', '', { login: 'teacher-b', password: 'test-password', name: '教师乙', transport: 'bearer' })).body;
    const method = { entryId: 'method-one', skill: { id: 'reflect', name: '错因反思', summary: '引导学生解释错因', purpose: '能自己修正错误', trigger: '学生第一次答错',
      steps: [{ condition: '学生尚未解释原因', action: '请学生回顾自己的解题思路' }], behaviorSteps: ['请学生回顾自己的解题思路'],
      constraints: ['第一次答错不要直接给答案', '结束条件：学生解释错因并正确完成题目'] } };
    async function detect(input = method): Promise<Detection> {
      const started = await request('/execution/detections', a.token, input); assert.equal(started.status, 202);
      for (let attempt = 0; attempt < 100; attempt++) {
        const result = (await request(`/execution/detections/${started.body.id}`, a.token)).body as Detection;
        if (result.status !== 'running') return result;
        await new Promise(resolve => setTimeout(resolve, 15));
      }
      throw new Error('检测夹具未完成');
    }
    let detection: Detection;
    await t.test('真实身份只由服务器授权，会话只存摘要，无固定样例账号', async () => {
      assert.equal(a.user.role, 'teacher'); assert.equal(a.user.disabled, false);
      assert.equal((db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number }).count, 2);
      assert.equal(db.prepare('SELECT token FROM sessions WHERE token=?').get(a.token), undefined);
      assert.equal((await request('/execution/detections')).status, 401);
      assert.equal((await request('/auth/accounts', a.token)).status, 403);
    });
    await t.test('生成全覆盖情境，保存真实协议回复；教师确认前不能挂载', async () => {
      detection = await detect(); assert.equal(detection.status, 'review');
      assert.equal(detection.cases.length, 6); assert.ok(detection.cases.every(item => item.messages.some(message => message.role === 'assistant')));
      assert.equal((await request('/execution/verified', a.token)).body.length, 0);
      assert.equal((await request(`/execution/detections/${detection.id}`, b.token)).status, 404);
      assert.equal((await request(`/execution/detections/${detection.id}/confirm`, b.token, {})).status, 404);
      const companion = { ...newCompanion('companion'), name: '反思学伴', introduction: '帮助整理思路', skillIds: ['method-one'],
        task: { audience: '个别学生', scenario: '课后练习', taskAndGoals: '解释错因并完成练习' } };
      assert.equal((await request('/execution/trials', a.token, { companion, methods: [method], hours: 24, capacity: 2 })).status, 400);
      assert.equal((await request(`/execution/detections/${detection.id}/confirm`, a.token, {})).body.status, 'verified');
    });
    const companion = { ...newCompanion('companion'), name: '反思学伴', introduction: '帮助整理思路', skillIds: ['method-one'], status: 'ready' as const,
      task: { audience: '个别学生', scenario: '课后练习', taskAndGoals: '解释错因并完成练习' } };
    let trial: Trial, studentToken: string, session: TrialSession;
    await t.test('客户端伪造通过状态不能挂载，修改内容和模型配置使旧资格失效', async () => {
      assert.equal((await request('/execution/trials', a.token, { companion, methods: [{ ...method, skill: { ...method.skill, purpose: '修改后的目标' }, status: 'verified' }], hours: 24, capacity: 2 })).status, 400);
      const name = process.env.TEACHING_MODEL_NAME; process.env.TEACHING_MODEL_NAME = 'changed';
      assert.equal((await request('/execution/verified', a.token)).body.length, 0);
      process.env.TEACHING_MODEL_NAME = name;
    });
    await t.test('试用快照独立、材料实际解析、受控名额和邀请轮换', async () => {
      const text = '学生先展示原来的解题过程，教师据此判断错因。';
      const material = { id: 'file', name: '课堂.txt', type: 'text/plain', size: Buffer.byteLength(text), text: '伪造的浏览器正文', data: `data:text/plain;base64,${Buffer.from(text).toString('base64')}` };
      const created = await request('/execution/trials', a.token, { companion: { ...companion, materials: [material] }, methods: [method], hours: 24, capacity: 2 });
      assert.equal(created.status, 201); trial = created.body.trial;
      assert.equal(trial.companion.materials[0].text, text); assert.equal(trial.companion.materials[0].data, '');
      assert.equal((await request(`/execution/trials/${trial.id}`, b.token)).status, 404);
      const invitation = (await request(`/execution/trials/${trial.id}/invitation`, a.token, {})).body.invitation;
      assert.equal((await request('/execution/public/join', '', { invitation: created.body.invitation, name: '旧链接' })).status, 403);
      const requestId = randomUUID();
      const first = await request('/execution/public/join', '', { invitation, name: '学生甲', requestId }); assert.equal(first.status, 200);
      const retried = await request('/execution/public/join', '', { invitation, name: '学生甲', requestId });
      assert.equal(retried.body.session.id, first.body.session.id);
      studentToken = retried.body.token; session = first.body.session;
      assert.equal((await request('/execution/public/join', '', { invitation, name: '学生甲', token: studentToken })).body.session.id, session.id);
      assert.equal((await request('/execution/public/join', '', { invitation, name: '学生乙' })).status, 200);
      assert.equal((await request('/execution/public/join', '', { invitation, name: '学生丙' })).status, 409);
    });
    await t.test('学生真实对话有方法触发记录，重复发送不增加模型调用', async () => {
      const input = { content: '我不知道错在哪里。', requestId: randomUUID() };
      const result = await request('/execution/public/turn', studentToken, input); assert.equal(result.status, 200);
      assert.equal(result.body.messages.length, 2); assert.equal(result.body.messages[1].activations[0].entryId, method.entryId);
      const before = state.calls; assert.equal((await request('/execution/public/turn', studentToken, input)).body.messages.length, 2); assert.equal(state.calls, before);
      assert.equal((await request('/execution/public/turn', studentToken, { ...input, content: '不同内容' })).status, 400);
      assert.equal((await request(`/execution/sessions/${session.id}/turn`, a.token, input)).status, 403);
    });
    await t.test('失败保留学生输入和异常，重试不删除失败证据', async () => {
      const input = { content: '我仍不确定怎么检查。', requestId: randomUUID() };
      state.rejectModel = true;
      const failed = await request('/execution/public/turn', studentToken, input); state.rejectModel = false;
      assert.ok(failed.body.error); assert.equal(failed.body.messages.length, 3); assert.equal(failed.body.failures.length, 1);
      const retried = await request('/execution/public/turn', studentToken, input);
      assert.equal(retried.body.messages.length, 4); assert.equal(retried.body.failures.length, 1); assert.equal(retried.body.error, '');
    });
    await t.test('教师自行试用不占学生名额，回收报告引用学生原文并排除教师对话', async () => {
      const preview = (await request(`/execution/trials/${trial.id}/teacher-session`, a.token, {})).body;
      assert.equal((await request(`/execution/sessions/${preview.id}/turn`, a.token, { content: '教师自己试试。', requestId: randomUUID() })).status, 200);
      assert.equal((await request(`/execution/trials/${trial.id}/report`, a.token, {})).status, 400);
      assert.equal((await request(`/execution/trials/${trial.id}/stop`, a.token, { status: 'closed' })).status, 200);
      assert.equal((await request('/execution/public/session', studentToken)).status, 410);
      async function reportResult() {
        const started = await request(`/execution/trials/${trial.id}/report`, a.token, {}); assert.equal(started.status, 200);
        for (let attempt = 0; attempt < 100; attempt++) {
          const latest = (await request(`/execution/trials/${trial.id}`, a.token)).body.reports[0];
          if (latest.status !== 'running') return latest;
          await new Promise(resolve => setTimeout(resolve, 15));
        }
        throw new Error('报告夹具未完成');
      }
      state.invalidEvidence = true; assert.equal((await reportResult()).status, 'failed'); state.invalidEvidence = false;
      const report = await reportResult(); assert.equal(report.status, 'ready');
      assert.equal(report.studentCount, 2); assert.equal(report.turnCount, 2); assert.match(report.limitation, /不能据此认定/);
      assert.equal(report.findings.find((item: { aspect: string }) => item.aspect === 'learning').evidence[0].quote, '我不知道错在哪里。');
      assert.match(report.findings.find((item: { aspect: string }) => item.aspect === 'runtime').description, /HTTP 503/);
      assert.equal((await request(`/execution/reports/${report.id}/review`, b.token, { decision: 'expand-trial', note: '符合预期' })).status, 404);
      const reviewed = await request(`/execution/reports/${report.id}/review`, a.token, { decision: 'adjust-scene', note: '补充学习任务说明再试用' });
      assert.equal(reviewed.body.review.decision, 'adjust-scene');
    });
    await t.test('撤销与过期阻止已有学生继续，不删除历史证据', async () => {
      const created = (await request('/execution/trials', a.token, { companion, methods: [method], hours: 24, capacity: 1 })).body;
      const joined = (await request('/execution/public/join', '', { invitation: created.invitation, name: '学生丁' })).body;
      const expired = repository.get('trial', created.trial.id, a.user.id); expired.expiresAt = new Date(Date.now() - 1000).toISOString(); repository.save('trial', a.user.id, expired, companion.id);
      assert.equal((await request('/execution/public/session', joined.token)).status, 410);
      assert.equal((await request(`/execution/trials/${created.trial.id}/stop`, a.token, { status: 'revoked' })).body.status, 'revoked');
      assert.equal((await request(`/execution/trials/${trial.id}`, a.token)).body.sessions.find((item: TrialSession) => item.id === session.id).messages.length, 4);
    });
    await t.test('无覆盖、伪造证据、模型失败与缺配置都不能产生验证资格', async () => {
      state.invalidCoverage = true; assert.equal((await detect()).status, 'failed'); state.invalidCoverage = false;
      state.invalidEvidence = true; const bad = await detect(); state.invalidEvidence = false;
      assert.equal(bad.status, 'failed'); assert.match(bad.error, /证据/);
      state.rejectModel = true; const failed = await detect(); state.rejectModel = false;
      assert.equal(failed.status, 'failed'); assert.ok(failed.error); assert.equal((await request('/execution/verified', a.token)).body.length, 0);
      assert.equal((await request(`/execution/detections/${failed.id}/confirm`, a.token, {})).status, 400);
      delete process.env.TEACHING_MODEL_NAME;
      assert.equal((await request('/execution/detections', a.token, method)).status, 503);
      assert.equal((await request('/execution/status', a.token)).body.ready, false);
    });
  } finally {
    if (apiServer) await close(apiServer); await close(model); database?.close();
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
    await rm(directory, { recursive: true, force: true });
  }
});
