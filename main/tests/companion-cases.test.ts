import test from 'node:test';
import assert from 'node:assert/strict';
import { companionCases, getCompanionCase, applyCompanionCase, withCompanionCaseSkills, isCompanionCaseMethod } from '../shared/companion-cases';
import { newCompanion, readCompanions, type LearningCompanion } from '../shared/learning-companion';
import { companionEndingInput, practiceInputs } from '../shared/companion-practice';
import { packageTeachingMethod } from '../shared/teaching-method';
import type { SkillEntry } from '../shared/marketplace';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { createPreviewRuntime, previewStorageKey } from '../src/features/execution/preview-runtime';
import type { Trial, TrialSession, Verification } from '../shared/execution';

const bundle = getCompanionCase(companionCases[0].id)!;
const caseMethod = () => ({ entryId: bundle.methods[0].entryId, skill: bundle.methods[0].skill });
const lastReply = (session: TrialSession) => session.messages.at(-1)!;

function setup() {
  const values = new Map<string, string>(); let full = false;
  const storage = { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => {
    if (full) throw new Error('quota'); values.set(key, value);
  } };
  const request = createPreviewRuntime(storage, 'teacher-a');
  const companion = applyCompanionCase(newCompanion('buddy'), bundle.id);
  const regular = { entryId: 'personal:owner:reflect', skill: packageTeachingMethod(completeTeachingMethod({
    teachingSteps: [{ condition: '学生第一次答错', action: '让学生回顾解题思路' }] }), 'reflect') };
  async function open(current: LearningCompanion = companion) {
    const { trial } = await request<{ trial: Trial }>('/trials', { companion: current, methods: [caseMethod()], hours: 24, capacity: 1 });
    const session = await request<TrialSession>(`/trials/${trial.id}/teacher-session`, {});
    return { trial, session };
  }
  const send = (session: TrialSession, content: string) =>
    request<TrialSession>(`/sessions/${session.id}/practice-turn`, { content, requestId: crypto.randomUUID() });
  return { request, companion, regular, open, send, values, fill: () => { full = true; }, restore: () => { full = false; } };
}

test('内置案例可完整填入学伴，保留 id 并回到草稿第一步', () => {
  assert.ok(companionCases.length >= 1);
  for (const item of companionCases) {
    assert.ok(item.id && item.name && item.description);
    assert.ok(item.turns.length >= 3);
    assert.ok(item.methods.every(method => method.entryId.startsWith('case:')));
  }
  const before = newCompanion('buddy'), snapshot = JSON.stringify(before);
  const filled = applyCompanionCase(before, bundle.id);
  assert.equal(JSON.stringify(before), snapshot);
  assert.equal(filled.id, 'buddy');
  assert.equal(filled.caseId, bundle.id);
  assert.equal(filled.step, 1);
  assert.equal(filled.status, 'draft');
  assert.equal(filled.name, bundle.companion.name);
  assert.equal(filled.task.taskAndGoals, bundle.companion.task.taskAndGoals);
  assert.deepEqual(filled.skillIds, bundle.methods.map(item => item.entryId));
  assert.equal(applyCompanionCase(newCompanion('copy'), bundle.id).id, 'copy');
  assert.throws(() => applyCompanionCase(before, 'missing-case'), /没有找到/);
});

test('案例方法白名单严格，普通方法或改动后的方法都不能免核对', () => {
  const companion = applyCompanionCase(newCompanion('buddy'), bundle.id);
  const method = caseMethod();
  assert.equal(isCompanionCaseMethod(companion, method), true);
  assert.equal(isCompanionCaseMethod(newCompanion('buddy'), method), false);
  assert.equal(isCompanionCaseMethod(companion, { ...method, entryId: 'case:unknown' }), false);
  assert.equal(isCompanionCaseMethod(companion, { ...method, skill: { ...method.skill, purpose: '换成别的目标' } }), false);
  assert.equal(isCompanionCaseMethod(companion, { ...method, skill: { ...method.skill, id: 'other:case' } }), false);
  assert.equal(isCompanionCaseMethod(companion, { entryId: 'personal:owner:reflect', skill: method.skill }), false);
});

test('案例方法只补入内置条目，不冒充已核对状态', () => {
  const companion = applyCompanionCase(newCompanion('buddy'), bundle.id);
  const mine: SkillEntry = { id: 'personal:owner:reflect', skill: packageTeachingMethod(completeTeachingMethod(), 'reflect'),
    creator: '我', grade: '初中', subject: '数学', area: 'daily', scene: '课堂学习', version: 'v1.0',
    validation: '教师已核对', example: '', source: '', demo: false };
  const merged = withCompanionCaseSkills(companion, [mine]);
  assert.equal(merged.length, 2);
  assert.equal(merged[0], mine);
  const added = merged[1];
  assert.equal(added.id, bundle.methods[0].entryId);
  assert.doesNotMatch(added.validation, /已核对|verified/i);
  assert.equal(added.demo, false);
  assert.equal(withCompanionCaseSkills(newCompanion('buddy'), [mine])[0], mine);
  assert.equal(withCompanionCaseSkills(companion, merged), merged);
});

test('案例试运行的建议输入来自案例本身', () => {
  const companion = applyCompanionCase(newCompanion('buddy'), bundle.id);
  assert.deepEqual(practiceInputs(companion, [caseMethod()]), [...bundle.turns.map(turn => turn.example), companionEndingInput]);
  assert.equal(practiceInputs(newCompanion('buddy'), []).at(-1), companionEndingInput);
});

test('案例学伴无需教师核对即可试运行，且不写入 verified 记录', async () => {
  const s = setup();
  const { trial } = await s.open();
  assert.deepEqual(trial.verifications, []);
  assert.deepEqual(await s.request<Verification[]>('/verified'), []);
  await assert.rejects(s.request('/trials', { companion: { ...s.companion, skillIds: [s.regular.entryId] },
    methods: [s.regular], hours: 24, capacity: 1 }), /教师确认/);
});

test('案例试运行按案例轮次回复，未知与否定表达只追问，成功与结束才有轨迹', async () => {
  const s = setup();
  const { session } = await s.open();
  let result = await s.send(session, '我不知道该怎么检查');
  assert.match(lastReply(result).content, /你是怎么算的/);
  assert.deepEqual(lastReply(result).activations, []);
  result = await s.send(result, bundle.turns[0].example);
  assert.match(lastReply(result).content, /算法说给我听/);
  assert.equal(lastReply(result).activations[0].step, 0);
  assert.equal(lastReply(result).activations[0].ended, false);
  result = await s.send(result, '我不会做');
  assert.match(lastReply(result).content, /分子和分母/);
  assert.deepEqual(lastReply(result).activations, []);
  result = await s.send(result, bundle.turns[1].example);
  assert.match(lastReply(result).content, /份数/);
  assert.equal(lastReply(result).activations[0].step, 1);
  result = await s.send(result, bundle.turns[2].example);
  assert.match(lastReply(result).content, /分母是 6 的分数/);
  result = await s.send(result, bundle.turns[3].example);
  assert.match(lastReply(result).content, /什么情况下才能直接把分子相加/);
  assert.equal(lastReply(result).activations[0].step, 3);
  result = await s.send(result, bundle.turns[4].example);
  assert.match(lastReply(result).content, /本次引导到这里结束/);
  assert.equal(lastReply(result).activations[0].ended, true);
  assert.equal(lastReply(result).activations[0].step, 4);
  result = await s.send(result, '再讲一遍');
  assert.match(lastReply(result).content, /已经结束/);
  assert.deepEqual(lastReply(result).activations, []);
});

test('错误算式与否定说法不会被确认为正确', async () => {
  const s = setup();
  const { session } = await s.open();
  let result = await s.send(session, bundle.turns[0].example);
  result = await s.send(result, bundle.turns[1].example);
  assert.match(lastReply(result).content, /份数/);
  result = await s.send(result, '不需要通分，直接相加就行');
  assert.deepEqual(lastReply(result).activations, []);
  assert.match(lastReply(result).content, /要不要先通分/);
  assert.doesNotMatch(lastReply(result).content, /份数不同时不能直接相加/);
  result = await s.send(result, '分母不同也可以直接相加');
  assert.deepEqual(lastReply(result).activations, []);
  assert.match(lastReply(result).content, /要不要先通分/);
  result = await s.send(result, bundle.turns[2].example);
  assert.match(lastReply(result).content, /分母是 6 的分数/);
  assert.equal(lastReply(result).activations[0].step, 2);
  result = await s.send(result, '1/2 = 3/6，1/3 = 2/6，3/6 + 2/6 = 4/6。');
  assert.deepEqual(lastReply(result).activations, []);
  assert.doesNotMatch(lastReply(result).content, /结果对了/);
  assert.match(lastReply(result).content, /再算一次结果/);
  result = await s.send(result, '我觉得答案是 5/6。');
  assert.deepEqual(lastReply(result).activations, []);
  assert.doesNotMatch(lastReply(result).content, /结果对了/);
  result = await s.send(result, bundle.turns[3].example);
  assert.match(lastReply(result).content, /结果对了/);
  assert.equal(lastReply(result).activations[0].step, 3);
  result = await s.send(result, '分母相同时可以直接相加，分母不同也能直接把分子相加。');
  assert.deepEqual(lastReply(result).activations, []);
  assert.doesNotMatch(lastReply(result).content, /总结到位/);
  result = await s.send(result, bundle.turns[4].example);
  assert.match(lastReply(result).content, /总结到位/);
  assert.equal(lastReply(result).activations[0].ended, true);
});

test('未完成时结束表达只收束，不谎报掌握；错误答案不会推进', async () => {
  const s = setup();
  const { session } = await s.open();
  let result = await s.send(session, '2/5 应该是对的吧？');
  assert.match(lastReply(result).content, /你是怎么算的/);
  assert.deepEqual(lastReply(result).activations, []);
  result = await s.send(result, bundle.turns[0].example);
  assert.match(lastReply(result).content, /算法说给我听/);
  result = await s.send(result, '我不会通分');
  assert.deepEqual(lastReply(result).activations, []);
  assert.doesNotMatch(lastReply(result).content, /份数不同的分数能直接合并吗/);
  result = await s.send(result, companionEndingInput);
  assert.match(lastReply(result).content, /你已经完成前 1 步/);
  assert.equal(lastReply(result).activations[0].ended, true);
  assert.equal(lastReply(result).activations[0].step, 0);
  assert.match(lastReply(result).activations[0].reason, /结束/);
});

test('改动学习任务后不再套用原题，改为按新任务有限引导', async () => {
  const s = setup();
  const changed = { ...s.companion, task: { ...s.companion.task, taskAndGoals: '完成 3/4 + 1/6 的通分与相加，并说清做法。' } };
  const inputs = practiceInputs(changed, [caseMethod()]);
  assert.ok(inputs.every(item => !/1\/2|1\/3|2\/5|份数/.test(item)));
  assert.match(inputs[0], /3\/4 \+ 1\/6/);
  const { session } = await s.open(changed);
  let result = await s.send(session, '老师好');
  assert.match(lastReply(result).content, /请先把这道题的题目/);
  assert.deepEqual(lastReply(result).activations, []);
  result = await s.send(result, '题目是 3/4 + 1/6，我先把两个分母乘起来。');
  assert.match(lastReply(result).content, /第一步做了什么/);
  assert.deepEqual(lastReply(result).activations, []);
  result = await s.send(result, '我不确定第一步对不对，这里可能错了。');
  assert.match(lastReply(result).content, /改一次/);
  result = await s.send(result, '我改成先找 4 和 6 的最小公倍数 12，因为通分后分母要相同。');
  assert.match(lastReply(result).content, /本次引导到这里结束/);
  assert.ok(result.messages.filter(message => message.role === 'assistant').every(message => !/1\/2 \+ 1\/3|平均分成/.test(message.content)));
});

test('只改名称、简介和学习对象时仍使用案例对话', async () => {
  const s = setup();
  const renamed = { ...s.companion, name: '我的数学学伴', introduction: '检查错因',
    task: { ...s.companion.task, audience: '全班学生', scenario: '课堂学习' } };
  assert.equal(practiceInputs(renamed, [caseMethod()]).length, bundle.turns.length + 1);
  const { session } = await s.open(renamed);
  const result = await s.send(session, bundle.turns[0].example);
  assert.match(lastReply(result).content, /算法说给我听/);
  assert.equal(lastReply(result).activations[0].step, 0);
});

test('试运行沿用创建时的案例快照，之后编辑源学伴不影响已开始的对话', async () => {
  const s = setup();
  const { trial } = await s.open();
  s.companion.task.taskAndGoals = '改成完全不同的任务';
  s.companion.name = '改过的学伴';
  const loaded = await s.request<{ trial: Trial }>(`/trials/${trial.id}`);
  assert.equal(loaded.trial.companion.task.taskAndGoals, bundle.companion.task.taskAndGoals);
  assert.equal(loaded.trial.companion.name, bundle.companion.name);
  const session = await s.request<TrialSession>(`/trials/${trial.id}/teacher-session`, {});
  const result = await s.send(session, bundle.turns[0].example);
  assert.match(lastReply(result).content, /算法说给我听/);
});

test('旧学伴记录缺少 caseId 仍可读取，复制案例学伴不复制个人 SKILL', () => {
  const legacy = newCompanion('old'); legacy.name = '旧学伴'; legacy.introduction = '旧简介';
  legacy.task = { audience: '个别学生', scenario: '课后练习', taskAndGoals: '旧任务' };
  const [restored] = readCompanions(JSON.stringify([legacy]));
  assert.equal(restored.caseId, undefined);
  assert.deepEqual(readCompanions(JSON.stringify([restored]))[0], restored);
  const filled = applyCompanionCase(restored, bundle.id);
  assert.equal(readCompanions(JSON.stringify([filled]))[0].caseId, bundle.id);
  const copy = { ...filled, id: 'copy' };
  assert.equal(isCompanionCaseMethod(copy, caseMethod()), true);
  assert.equal(withCompanionCaseSkills(copy, []).length, bundle.methods.length);
});

test('存储失败不假报回复成功，损坏记录不覆盖，恢复后可重试', async () => {
  const s = setup();
  const { session } = await s.open();
  const before = s.values.get(previewStorageKey('teacher-a'));
  s.fill();
  await assert.rejects(s.send(session, bundle.turns[0].example), /未保存/);
  assert.equal(s.values.get(previewStorageKey('teacher-a')), before);
  s.restore();
  assert.equal((await s.send(session, bundle.turns[0].example)).messages.length, 2);
  s.values.set(previewStorageKey('teacher-a'), '{invalid');
  await assert.rejects(s.request('/verified'), /无法读取/);
  assert.equal(s.values.get(previewStorageKey('teacher-a')), '{invalid');
});
