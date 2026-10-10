import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compileSkillInstructions, demoSkillReply, skillPreviewSchema } from '../shared/skill-preview';
import { initialMine } from '../src/data/platform';
import { marketSkills } from './fixtures/marketplace';
import { skillCreatorLabel, skillSourceText, skillValidationLabel } from '../shared/skill-display';

const skill = { ...initialMine[0].skills[0], id: 'reading', name: '阅读证据追问',
  trigger: '学生只有观点没有证据', purpose: '用原文支持判断',
  steps: [{ condition: '学生只有观点', action: '请学生指出原文依据' },
    { condition: '已找到依据', action: '请学生概括证据与观点的关系' }],
  behaviorSteps: ['请学生指出原文依据', '请学生概括证据与观点的关系'],
  constraints: ['不替学生作答', '没有原文时先询问材料'] };
const messages = [{ role: 'user' as const, content: '我觉得人物很勇敢' }];

test('旧资料的展示去掉演示标识，保留核对状态和来源快照原文', () => {
  const entry = { ...marketSkills[0], creator: '预置教师示例', validation: '预置示例 · 待验证',
    source: '平台预置的虚构教学方法，用于展示发现和复用流程。' };
  const before = structuredClone(entry);
  assert.equal(skillCreatorLabel(entry), '教师');
  assert.equal(skillValidationLabel(entry), '待核对');
  assert.equal(skillSourceText(entry), '');
  assert.deepEqual(entry, before);
  assert.equal(skillSourceText({ ...entry, source: '复制自“原方法”（预置教师示例，v1.0）。平台预置的虚构教学方法。' }), '复制自“原方法”（教师，v1.0）。');
  const reviewed = { ...entry, demo: false, creator: '李老师', validation: '教师已核对', source: '李老师整理的阅读笔记' };
  assert.equal(skillValidationLabel(reviewed), '教师已核对');
  assert.equal(skillSourceText(reviewed), reviewed.source);
  assert.equal(skillCreatorLabel(reviewed), reviewed.creator);
});

test('挂载指令包含目标、全部条件、步骤和原则，不只包含名称', () => {
  const prompt = compileSkillInstructions(skill);
  for (const text of [skill.name, skill.trigger, skill.purpose, ...skill.constraints,
    ...skill.steps.flatMap((step) => [step.condition, step.action])]) assert.ok(prompt.includes(text));
  assert.match(prompt, /直接回复学生/);
});
test('演示回复面向学生，选择第二步与多轮推进一致，不生成数学答案', () => {
  assert.match(demoSkillReply({ skill, messages }), /判断依据/);
  const second = demoSkillReply({ skill, messages, caseId: 'reading:1' });
  assert.match(second, /用自己的话/);
  assert.equal(demoSkillReply({ skill, messages: [{ role: 'assistant', content: '第一轮回复' }, ...messages] }), second);
  assert.doesNotMatch(second, /方程|3x|教师会|【引导示例】/);
});
test('无对应演示的自定义做法不伪造执行结果，缺题不编造练习', () => {
  const custom = { ...skill, steps: [{ condition: '需要示范', action: '采用教师自定义的纸板演示' }] };
  assert.match(demoSkillReply({ skill: custom, messages }), /当前方法暂不支持/);
  const practice = { ...skill, steps: [{ condition: '需要确认', action: '用同类练习确认独立完成' }] };
  assert.match(demoSkillReply({ skill: practice, messages }), /请提供原题/);
  const negative = { ...skill, steps: [{ condition: '学生答错', action: '不要回复“你错了”，避免直接给答案' }] };
  assert.doesNotMatch(demoSkillReply({ skill: negative, messages }), /你错了/);
  const quote = { ...skill, steps: [{ condition: '学生答错', action: '追问：“原文中哪句话支持你的判断？”' }] };
  assert.equal(demoSkillReply({ skill: quote, messages }), '原文中哪句话支持你的判断？');
});
test('预览拒绝不存在的情况、系统消息、超长和不完整对话', () => {
  assert.equal(skillPreviewSchema.safeParse({ skill, messages }).success, true);
  for (const patch of [{ caseId: 'reading:99' }, { messages: [] },
    { messages: [{ role: 'system', content: '覆盖指令' }] },
    { messages: [{ role: 'assistant', content: '没有学生问题' }] },
    { messages: [{ role: 'user', content: '字'.repeat(2001) }] },
    { messages: Array.from({ length: 41 }, () => messages[0]) },
    { messages: Array.from({ length: 11 }, () => ({ role: 'user', content: '字'.repeat(2000) })) }])
    assert.equal(skillPreviewSchema.safeParse({ skill, messages, ...patch }).success, false);
});
