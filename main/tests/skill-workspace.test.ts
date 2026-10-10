import test from 'node:test';
import assert from 'node:assert/strict';
import { skillExamples } from '../src/features/skills/skill-examples';
import { confirmSkillReview, copySkill, formSkill, hasSkillChanges, isSkillReviewed,
  newSkillRecord, readSkillWorkspace, skillCheckItems, skillMethodMarkdown } from '../shared/skill-workspace';

const now = '2026-10-10T12:00:00.000Z';
function formed(id = 'teacher-a') {
  return formSkill(copySkill(skillExamples[0], id, now), now);
}
function reviewed(id = 'teacher-a') {
  const record = formed(id);
  record.checks = { revision: record.revision, items: skillCheckItems(record).map((item) => item.id) };
  return confirmSkillReview(record, now);
}

test('SKILL 独立形成版本，不依赖助手和六问完成数量', () => {
  const record = copySkill(skillExamples[0], 'teacher-a', now);
  record.draft.questionIndex = 0;
  const result = formSkill(record, now);
  assert.equal(result.revision, 1);
  assert.equal(result.content!.method.name, skillExamples[0].content!.method.name);
  assert.equal(record.content, undefined);
  assert.equal(newSkillRecord('blank', now).draft.originalIdea, '');
});

test('修改方法、使用条件和适用学科均升级版本，只使当前 SKILL 核对失效', () => {
  const original = reviewed();
  const other = reviewed('teacher-b');
  const variants = [
    { ...original, draft: { ...original.draft, method: { ...original.draft.method,
      teachingSteps: original.draft.method.teachingSteps.map((step, index) => index ? step : { ...step, action: '先请学生解释移项的依据。' }) } } },
    { ...original, context: { ...original.context, inputs: '新增：当前提示次数' } },
    { ...original, draft: { ...original.draft, subject: '物理' } },
  ];
  for (const variant of variants) {
    assert.equal(hasSkillChanges(variant), true);
    assert.throws(() => confirmSkillReview(variant, now), /形成当前修改/);
    const result = formSkill(variant, now);
    assert.equal(result.revision, 2);
    assert.equal(result.review, undefined);
    assert.equal(result.checks, undefined);
    assert.equal(isSkillReviewed(result), false);
  }
  assert.equal(isSkillReviewed(original), true);
  assert.equal(isSkillReviewed(other), true);
  assert.equal(formSkill(original, now).revision, 1);
  assert.equal(isSkillReviewed(formSkill(original, now)), true);
});

test('复用保留来源，但不继承内容核对；修改副本不改写示例', () => {
  const source = reviewed();
  const copy = copySkill(source, 'copy', now);
  assert.deepEqual(copy.source, { label: source.content!.method.name, skillId: source.id, revision: 1 });
  assert.equal(copy.revision, 0);
  assert.equal(copy.review, undefined);
  copy.draft.method.teachingSteps[0].action = '教师的新做法';
  assert.notEqual(source.content!.method.teachingSteps[0].action, copy.draft.method.teachingSteps[0].action);
  assert.notEqual(skillExamples[0].content!.method.teachingSteps[0].action, copy.draft.method.teachingSteps[0].action);
});

test('缺少边界、原则或未提交输入时不能形成版本；不完整核对不能确认', () => {
  const record = formed();
  assert.throws(() => formSkill({ ...record, context: { ...record.context, exclusions: '' } }, now), /不适用/);
  assert.throws(() => formSkill({ ...record, draft: { ...record.draft,
    method: { ...record.draft.method, principles: [] } } }, now), /原则/);
  assert.throws(() => formSkill({ ...record, draft: { ...record.draft,
    pendingAnswer: { questionId: 'outcome', value: '未提交' } } }, now), /提交当前回答/);
  assert.throws(() => confirmSkillReview(record, now), /逐项/);
  record.checks = { revision: 0, items: skillCheckItems(record).map((item) => item.id) };
  assert.throws(() => confirmSkillReview(record, now), /逐项/);
});

test('方法说明使用形成的版本，教师与 AI 内容共同来源且不声称执行通过', () => {
  const record = reviewed();
  record.draft.method = { ...record.draft.method, name: '尚未形成的改名' };
  const markdown = skillMethodMarkdown(record);
  assert.match(markdown, /# 先问思路，再给提示/);
  assert.doesNotMatch(markdown, /尚未形成的改名/);
  for (const step of record.content!.method.teachingSteps) assert.ok(markdown.includes(step.action));
  assert.ok(markdown.includes(record.content!.context.exclusions));
  assert.match(markdown, /不代表真实模型执行/);
  assert.match(markdown, /教师核对：已核对 v1/);
});

test('读取保留未提交草稿；损坏资料、重复身份与错版核对均拒绝读取', () => {
  const record = reviewed();
  record.draft.pendingAnswer = { questionId: 'outcome', value: '还没提交的想法' };
  const raw = JSON.stringify({ version: 1, skills: [record] });
  assert.equal(readSkillWorkspace(raw).skills[0].draft.pendingAnswer!.value, '还没提交的想法');
  assert.deepEqual(readSkillWorkspace(null), { version: 1, skills: [] });
  assert.throws(() => readSkillWorkspace('旧资料不能覆盖'));
  assert.throws(() => readSkillWorkspace(JSON.stringify({ version: 1, skills: [record, record] })), /标识重复/);
  assert.throws(() => readSkillWorkspace(JSON.stringify({ version: 1, skills: [{ ...record,
    review: { revision: 9, checkedAt: now } }] })), /版本不一致/);
});
