import { test } from 'node:test';
import assert from 'node:assert/strict';
import { packageTeachingMethod } from '../shared/teaching-method';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { newCompanion } from '../shared/learning-companion';
import { previewCases, previewModel } from '../shared/execution-preview';
import { createPreviewRuntime, previewStorageKey } from '../src/features/execution/preview-runtime';
import { compileSkillInstructions } from '../shared/skill-preview';
import type { Detection, Trial, TrialSession, Verification } from '../shared/execution';

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
    return request<Detection>(`/detections/${detection.id}/confirm`, {});
  }
  return { request, method, companion, confirm, storage, values, fill: () => { full = true; }, restore: () => { full = false; } };
}
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
