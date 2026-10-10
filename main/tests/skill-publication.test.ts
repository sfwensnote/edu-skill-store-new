import test from 'node:test';
import assert from 'node:assert/strict';
import { skillExamples } from '../src/features/skills/skill-examples';
import { makeSkillDetectionCases, runDemoDetection } from '../src/features/skills/demo-detection';
import { confirmSkillReview, copySkill, formSkill, isSkillDetectionPassed, isSkillPublished,
  publishSkill, readSkillWorkspace, skillCheckItems, skillMountMarkdown } from '../shared/skill-workspace';

const now = '2026-10-10T12:00:00.000Z';
function checked() {
  const record = formSkill(copySkill(skillExamples[0], 'my-method', now), now);
  return confirmSkillReview({ ...record, checks: { revision: 1, items: skillCheckItems(record).map((item) => item.id) } }, now);
}

test('发布需要教师核对及完整同版本检测，不得仅凭人工核对进入集市', async () => {
  const record = checked();
  assert.throws(() => publishSkill(record, now), /LLM 检测/);
  const cases = makeSkillDetectionCases(record);
  assert.equal(cases.length, record.content!.method.teachingSteps.length + 1);
  const detection = await runDemoDetection(record, cases, 'pass', new AbortController().signal);
  const tested = { ...record, detection };
  assert.equal(isSkillDetectionPassed(tested), true);
  assert.equal(isSkillPublished(publishSkill(tested, now)), true);
  assert.equal(isSkillDetectionPassed({ ...tested, review: undefined }), false);
  assert.equal(isSkillDetectionPassed({ ...tested, detection: { ...detection, revision: 2 } }), false);
  assert.equal(isSkillDetectionPassed({ ...tested, detection: { ...detection, cases: detection.cases.slice(1) } }), false);
  assert.equal(isSkillDetectionPassed({ ...tested, content: { ...record.content!, context: { inputs: '新的信息', exclusions: '新的边界' } } }), false);
});

test('演示检测发现信息不足时越界，不能发布；缺失分支也不能检测', async () => {
  const record = checked();
  const cases = makeSkillDetectionCases(record);
  const detection = await runDemoDetection(record, cases, 'review', new AbortController().signal);
  assert.equal(detection.mode, 'demo');
  assert.equal(detection.cases.at(-1)!.status, 'review');
  assert.equal(isSkillDetectionPassed({ ...record, detection }), false);
  assert.throws(() => publishSkill({ ...record, detection }, now), /未通过/);
  await assert.rejects(runDemoDetection(record, cases.slice(1), 'pass', new AbortController().signal), /每个教学分支/);
  await assert.rejects(runDemoDetection(record, cases.map((item) => ({ ...item, input: '' })), 'pass', new AbortController().signal));
});

test('新版本撤回旧检测与发布；副本不继承检测，存储恢复保留检测和来源', async () => {
  const record = checked();
  const detection = await runDemoDetection(record, makeSkillDetectionCases(record), 'pass', new AbortController().signal);
  const published = publishSkill({ ...record, detection }, now);
  const restored = readSkillWorkspace(JSON.stringify({ version: 1, skills: [published] })).skills[0];
  assert.equal(isSkillPublished(restored), true);
  assert.equal(restored.source.skillId, 'example-reflection');
  const draft = { ...restored, draft: { ...restored.draft, method: { ...restored.draft.method, name: '修订方法' } } };
  assert.throws(() => publishSkill(draft, now), /重新核对与检测/);
  const revised = formSkill(draft, now);
  assert.equal(revised.revision, 2);
  assert.equal(revised.detection, undefined);
  assert.equal(revised.publication, undefined);
  const copy = copySkill(published, 'copy', now);
  assert.equal(copy.detection, undefined);
  assert.equal(copy.publication, undefined);
});

test('挂载文件包含版本和方法边界，不嵌入检测对话或声称完成自动挂载', async () => {
  const record = checked();
  const detection = await runDemoDetection(record, makeSkillDetectionCases(record), 'pass', new AbortController().signal);
  const markdown = skillMountMarkdown(publishSkill({ ...record, detection }, now));
  assert.match(markdown, /^---\nname: teaching-my-method\ndescription:/);
  assert.ok(markdown.includes(record.content!.context.exclusions));
  assert.match(markdown, /版本：v1/);
  assert.match(markdown, /自行挂载/);
  assert.match(markdown, /不代表已自动完成挂载/);
  assert.doesNotMatch(markdown, /本情境采用的做法/);
});

test('离开检测页面后取消请求，不产生检测结果', async () => {
  const record = checked();
  const abort = new AbortController();
  const pending = runDemoDetection(record, makeSkillDetectionCases(record), 'pass', abort.signal);
  abort.abort();
  await assert.rejects(pending, /检测已取消/);
});
