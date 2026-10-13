import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packageTeachingMethod } from '../shared/teaching-method';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { newCompanion } from '../shared/learning-companion';
import { previewCases, previewModel } from '../shared/execution-preview';
import { createPreviewRuntime, previewStorageKey } from '../src/features/execution/preview-runtime';
import { compileSkillInstructions } from '../shared/skill-preview';
import type { Detection, Trial, TrialSession, Verification } from '../shared/execution';
import type { ReviewedDetection } from '../src/features/execution/case-review';

function setup() {
  const values = new Map<string, string>(); let full = false, now = Date.now();
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {
    if (full) throw new Error('quota'); values.set(key, value);
  } };
  const request = createPreviewRuntime(storage, 'teacher-a', () => now);
  const method = { entryId: 'personal:owner:reflect', skill: packageTeachingMethod(completeTeachingMethod({
    teachingSteps: [{ condition: '学生第一次答错', action: '让学生回顾解题思路' },
      { condition: '学生回顾后仍没有找到问题', action: '提醒学生检查不确定的一步' }],
  }), 'reflect') };
  const companion = { ...newCompanion('buddy'), name: '反思学伴', introduction: '一起检查思路', skillIds: [method.entryId],
    status: 'ready' as const, step: 4 as const, task: { audience: '个别学生', scenario: '课后练习', taskAndGoals: '解释并改正错误' } };
  async function confirm() {
    const detection = await request<Detection>('/detections', method); now += 10000;
    await request(`/detections/${detection.id}`);
    let result = detection;
    for (const item of detection.cases) result = await request<Detection>(`/detections/${detection.id}/confirm-case`, { caseId: item.id, fingerprint: detection.fingerprint });
    return result;
  }
  return { request, method, companion, confirm, storage, values, advance: () => { now += 10000; }, fill: () => { full = true; }, restore: () => { full = false; } };
}
test('逐个核对不可跳过，返回与刷新恢复进度，修改当前方法后重新确认', async () => {
  const s = setup();
  let d = await s.request<ReviewedDetection>('/detections', s.method); s.advance();
  d = await s.request(`/detections/${d.id}`);
  const send = (operation: string, index: number, extra = {}) => s.request<ReviewedDetection>(`/detections/${d.id}/${operation}`, { caseId: d.cases[index].id, fingerprint: d.fingerprint, ...extra });
  await assert.rejects(send('confirm-case', 1), /前面的情况/);
  await assert.rejects(s.request(`/detections/${d.id}/confirm`, {}), /逐个确认/);
  d = await send('confirm-case', 0);
  assert.deepEqual(d.review, { cursor: 1, confirmed: 1 });
  d = await send('view-case', 0);
  assert.deepEqual(d.review, { cursor: 0, confirmed: 1 });
  d = await send('confirm-case', 0);
  const restored = await createPreviewRuntime(s.storage, 'teacher-a')<ReviewedDetection>(`/detections/${d.id}`);
  assert.deepEqual(restored.review, { cursor: 1, confirmed: 1 });
  const body = { caseId: d.cases[1].id, fingerprint: d.fingerprint, edit: { scenario: '学生回顾后仍没有找到问题', action: '我会问：“你最不确定的是哪一步？”' } };
  await assert.rejects(s.request(`/detections/${d.id}/revise-case`, body), /只读/);
  const original = s.values.get(previewStorageKey('teacher-a'));
  await assert.rejects(s.request(`/detections/${d.id}/revise-case`, body, () => false), /原方法和核对进度已保留/);
  assert.equal(s.values.get(previewStorageKey('teacher-a')), original);
  let committed = false; s.fill();
  await assert.rejects(s.request(`/detections/${d.id}/revise-case`, body, () => { committed = true; return true; }), /未保存/);
  assert.equal(committed, false); s.restore();
  d = await s.request(`/detections/${d.id}/revise-case`, body, method => { assert.equal(method.teachingSteps[1].action, body.edit.action); return true; });
  assert.deepEqual(d.review, { cursor: 1, confirmed: 1 });
  assert.equal(d.cases[1].messages[1].content, '你最不确定的是哪一步？');
  await assert.rejects(s.request(`/detections/${d.id}/confirm-case`, { ...body, edit: undefined }), /其他页面修改/);
  d = await send('confirm-case', 1); d = await send('confirm-case', 2);
  assert.equal(d.status, 'verified');
  d = await s.request(`/detections/${d.id}/revise-case`, { caseId: d.cases[2].id, fingerprint: d.fingerprint, edit: { scenario: '学生能独立完成两道题', action: d.cases[2].expected } }, () => true);
  assert.deepEqual(d.review, { cursor: 0, confirmed: 0 });
  assert.deepEqual(await s.request('/verified'), []);
});
test('学伴整场试运行按学生表达匹配挂载方法，不按轮次推进，未知输入追问且历史场景保留', async () => {
  const s = setup(); await s.confirm();
  const { trial } = await s.request<{ trial: Trial }>('/trials', { companion: s.companion, methods: [s.method], hours: 24, capacity: 1 });
  const session = await s.request<TrialSession>(`/trials/${trial.id}/teacher-session`, {});
  const send = (content: string) => s.request<TrialSession>(`/sessions/${session.id}/practice-turn`, { content, requestId: crypto.randomUUID() });
  let result = await send('今天下雨了');
  assert.deepEqual(result.messages.at(-1)?.activations, []);
  assert.match(result.messages.at(-1)!.content, /解释并改正错误/);
  result = await send('我的答案不对，但我还不知道问题出在哪里。');
  assert.equal(result.messages.at(-1)?.activations[0].step, 0);
  result = await send('我的答案不对，但我还不知道问题出在哪里。');
  assert.equal(result.messages.at(-1)?.activations[0].step, 0);
  result = await send('我已经回顾了自己的思路，但还是没有找到哪里出了问题。');
  assert.equal(result.messages.at(-1)?.activations[0].step, 1);
  result = await send('我已经完成这次任务，能说清自己的做法。');
  assert.equal(result.messages.at(-1)?.activations[0].ended, true);
  await assert.rejects(s.request(`/sessions/${session.id}/practice-turn`, { content: '指定步骤', requestId: crypto.randomUUID(), caseId: 'step1' }), /无需指定/);
  const body = { content: '还需要帮助', requestId: crypto.randomUUID() };
  const once = await s.request<TrialSession>(`/sessions/${session.id}/practice-turn`, body);
  assert.deepEqual(await s.request(`/sessions/${session.id}/practice-turn`, body), once);
  s.companion.task.audience = '全班学生';
  assert.equal((await s.request<{ trial: Trial }>(`/trials/${trial.id}`)).trial.companion.task.audience, '个别学生');
});
test('前端情境使用教师自己的步骤，第二种情况和结束方式对应原方法', () => {
  const { method } = setup(), cases = previewCases(method);
  assert.equal(cases.length, 3);
  assert.match(cases[1].studentTurns[0], /已经回顾.*还是没有找到/);
  assert.match(cases[1].messages[1].content, /已经回顾.*检查/);
  assert.equal(cases.at(-1)?.kind, 'ending');
  assert.ok(cases.every(item => item.verdicts.every(v => v.status !== 'pass')));
});
test('核对前不能挂载；确认记录按账号保存，重新核对及内容修改不沿用旧资格', async () => {
  const s = setup();
  await assert.rejects(s.request('/trials', { companion: s.companion, methods: [s.method], hours: 24, capacity: 1 }), /教师确认/);
  const waiting = await s.request<Detection>('/detections', s.method);
  await assert.rejects(s.request(`/detections/${waiting.id}/confirm`, {}), /情境准备/);
  const confirmed = await s.confirm();
  assert.equal(confirmed.model, previewModel);
  const proofs = await s.request<Verification[]>('/verified');
  assert.equal(proofs.length, 1);
  assert.equal((await createPreviewRuntime(s.storage, 'teacher-b')<Verification[]>('/verified')).length, 0);
  const modified = { ...s.method, skill: { ...s.method.skill, purpose: '新的目标' } };
  assert.notEqual(compileSkillInstructions(proofs[0].skill), compileSkillInstructions(modified.skill));
  await assert.rejects(s.request('/trials', { companion: s.companion, methods: [modified], hours: 24, capacity: 1 }), /教师确认/);
  await s.request('/detections', s.method);
  assert.deepEqual(await s.request('/verified'), []);
});
test('试运行保留场景和方法快照，明确选择第二步，重试不重复记录，结束后只读', async () => {
  const s = setup(); await s.confirm();
  const { trial } = await s.request<{ trial: Trial }>('/trials', { companion: s.companion, methods: [s.method], hours: 24, capacity: 1 });
  const session = await s.request<TrialSession>(`/trials/${trial.id}/teacher-session`, {});
  const body = { content: '回顾过后我还是不知道哪里错了', requestId: crypto.randomUUID(), entryId: s.method.entryId, caseId: previewCases(s.method)[1].id };
  const result = await s.request<TrialSession>(`/sessions/${session.id}/turn`, body);
  assert.match(result.messages[1].content, /已经回顾.*检查/);
  assert.equal(result.messages[1].activations[0].step, 1);
  assert.deepEqual(await s.request(`/sessions/${session.id}/turn`, body), result);
  const next = await s.request<TrialSession>(`/sessions/${session.id}/turn`, { ...body, content: '我已经找到了问题', requestId: crypto.randomUUID() });
  assert.deepEqual(await s.request(`/sessions/${session.id}/turn`, body), next);
  await assert.rejects(s.request(`/sessions/${session.id}/turn`, { ...body, content: '修改旧请求' }), /请求内容已变化/);
  const loaded = await createPreviewRuntime(s.storage, 'teacher-a')<{ trial: Trial; sessions: TrialSession[] }>(`/trials/${trial.id}`);
  assert.deepEqual(loaded.sessions[0], next);
  s.companion.task.taskAndGoals = '后续修改';
  assert.equal(loaded.trial.companion.task.taskAndGoals, '解释并改正错误');
  await assert.rejects(createPreviewRuntime(s.storage, 'teacher-b')(`/trials/${trial.id}`), /没有找到/);
  await s.request(`/trials/${trial.id}/stop`, {});
  await assert.rejects(s.request(`/sessions/${session.id}/turn`, { ...body, requestId: crypto.randomUUID() }), /已结束/);
});
test('存储失败不假报确认或回复成功，损坏记录不覆盖，恢复后可重试', async () => {
  const s = setup(); await s.confirm();
  const { trial } = await s.request<{ trial: Trial }>('/trials', { companion: s.companion, methods: [s.method], hours: 24, capacity: 1 });
  const session = await s.request<TrialSession>(`/trials/${trial.id}/teacher-session`, {});
  const before = s.values.get(previewStorageKey('teacher-a'));
  s.fill();
  const body = { content: '我不知道如何检查', requestId: crypto.randomUUID(), entryId: s.method.entryId, caseId: previewCases(s.method)[0].id };
  await assert.rejects(s.request(`/sessions/${session.id}/turn`, body), /未保存/);
  assert.equal(s.values.get(previewStorageKey('teacher-a')), before);
  s.restore();
  assert.equal((await s.request<TrialSession>(`/sessions/${session.id}/turn`, body)).messages.length, 2);
  s.values.set(previewStorageKey('teacher-a'), '{invalid');
  await assert.rejects(s.request('/verified'), /无法读取/);
  assert.equal(s.values.get(previewStorageKey('teacher-a')), '{invalid');
});
test('preview 学伴试运行与教师会话一次落盘，保存失败保留原记录并可重试恢复', async () => {
  const s = setup(); await s.confirm();
  const settled = await s.request<{ trial: Trial; session: TrialSession }>('/practice-trials',
    { companion: s.companion, methods: [s.method], hours: 168, capacity: 1 });
  assert.equal(settled.session.trialId, settled.trial.id);
  assert.equal(settled.session.audience, 'teacher');
  const stored = JSON.parse(s.values.get(previewStorageKey('teacher-a'))!) as { trials: Trial[]; sessions: TrialSession[] };
  assert.equal(stored.trials.length, 1);
  assert.equal(stored.sessions.length, 1);
  assert.equal(stored.sessions[0].trialId, stored.trials[0].id);
  // 再次创建在同一次保存内关闭旧试运行并写入新试运行与会话。
  const again = await s.request<{ trial: Trial; session: TrialSession }>('/practice-trials',
    { companion: s.companion, methods: [s.method], hours: 168, capacity: 1 });
  const afterCreate = s.values.get(previewStorageKey('teacher-a'))!;
  const second = JSON.parse(afterCreate) as { trials: Trial[]; sessions: TrialSession[] };
  assert.equal(second.trials.length, 2);
  assert.equal(second.trials.find(item => item.id === settled.trial.id)?.status, 'closed');
  assert.equal(second.trials.find(item => item.id === again.trial.id)?.status, 'open');
  // 落盘失败时原子路径整体失败，原试运行与会话保留，界面与实际状态不出现 open/closed 不一致。
  s.fill();
  await assert.rejects(s.request('/practice-trials', { companion: s.companion, methods: [s.method], hours: 168, capacity: 1 }), /未保存/);
  assert.equal(s.values.get(previewStorageKey('teacher-a')), afterCreate);
  const preserved = await s.request<{ trial: Trial; sessions: TrialSession[] }>(`/trials/${again.trial.id}`);
  assert.equal(preserved.trial.status, 'open');
  assert.equal(preserved.sessions.length, 1);
  s.restore();
  // 释放空间后重试成功，刷新仍恢复正确的试运行与会话。
  const retried = await s.request<{ trial: Trial; session: TrialSession }>('/practice-trials',
    { companion: s.companion, methods: [s.method], hours: 168, capacity: 1 });
  const loaded = await createPreviewRuntime(s.storage, 'teacher-a')<{ trial: Trial; sessions: TrialSession[] }>(`/trials/${retried.trial.id}`);
  assert.equal(loaded.sessions.length, 1);
  assert.equal(loaded.sessions[0].trialId, retried.trial.id);
  assert.equal(loaded.trial.status, 'open');
});

test('运行与试运行独立筛选、结束和保存，兼容未带类型的历史试运行', async () => {
  const s = setup(); await s.confirm();
  const input = { companion: s.companion, methods: [s.method], hours: 24, capacity: 1 };
  const run = await s.request<{ trial: Trial }>('/trials', input);
  const practice = await s.request<{ trial: Trial; session: TrialSession }>('/practice-trials', input);
  assert.equal((await s.request<{ trial: Trial }>(`/trials/${run.trial.id}`)).trial.status, 'open');
  assert.deepEqual((await s.request<Trial[]>('/trials?purpose=run')).map(item => item.id), [run.trial.id]);
  assert.deepEqual((await s.request<Trial[]>('/trials?purpose=practice')).map(item => item.id), [practice.trial.id]);
  const again = await s.request<{ trial: Trial }>('/trials', input);
  assert.equal((await s.request<{ trial: Trial }>(`/trials/${run.trial.id}`)).trial.status, 'closed');
  assert.equal((await s.request<{ trial: Trial }>(`/trials/${practice.trial.id}`)).trial.status, 'open');
  await s.request(`/trials/${practice.trial.id}/stop`, {});
  assert.equal((await s.request<{ trial: Trial }>(`/trials/${again.trial.id}`)).trial.status, 'open');
  const data = JSON.parse(s.values.get(previewStorageKey('teacher-a'))!);
  delete data.trials.find((trial: Trial) => trial.id === practice.trial.id).purpose;
  s.values.set(previewStorageKey('teacher-a'), JSON.stringify(data));
  assert.equal((await s.request<Trial[]>('/trials?purpose=practice'))[0].id, practice.trial.id);
  assert.equal((await s.request<Trial[]>('/trials?purpose=run')).length, 2);
});
