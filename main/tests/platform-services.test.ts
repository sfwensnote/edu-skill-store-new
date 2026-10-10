import test from 'node:test';
import assert from 'node:assert/strict';
import { assistantSchema } from '../shared/assistant';
import {
  buildMockDesign,
  buildMockRuntimeReply,
  buildMockTestCases,
  buildRunReport,
} from '../server/platform/mock-ai';

const draft = assistantSchema.parse({
  id: 'assistant-1',
  userId: 'teacher-1',
  name: '七年级数学教学助手',
  goal: '帮助七年级学生理解一元一次方程，并在出错时逐步引导。',
  grade: '初中',
  subject: '数学',
  activity: '错因诊断',
  status: 'DRAFT',
  isPublic: false,
  createdAt: '2026-09-09T00:00:00.000Z',
  updatedAt: '2026-09-09T00:00:00.000Z',
  skills: [
    {
      id: 'reflect',
      name: '错误后反思引导',
      summary: '先了解学生的思路，再给予针对性帮助。',
      purpose: '保留学生自主修正错误的机会。',
      trigger: '学生回答错误或解题过程明显偏离时。',
      behaviorSteps: ['询问学生怎么思考', '识别可能的问题位置', '给出一个推动下一步的提示'],
      constraints: ['首次错误时不直接给出完整答案'],
    },
  ],
});

test('Mock 设计器根据教师输入生成名称、目标和三个可执行 SKILL', () => {
  const result = buildMockDesign(
    '我想做一个七年级数学助手，帮助学生理解一元一次方程。学生答错时先问思路，再逐步提示。',
    null,
  );
  assert.match(result.assistantPatch.name, /七年级数学/);
  assert.equal(result.skills.length, 3);
  assert.equal(result.skills.every((skill) => skill.behaviorSteps.length > 0), true);
  assert.equal(result.skills.every((skill) => skill.constraints.length > 0), true);
});

test('Mock 设计器能够按上下文加大第二次提示的具体程度', () => {
  const result = buildMockDesign('如果学生第二次还不会，可以给更具体一点的提示。', draft);
  const skill = result.skills.find((item) => item.id === 'reflect');
  assert.ok(skill);
  assert.match(skill.behaviorSteps.join(''), /第二次/);
});

test('Mock 检测为三个 SKILL 生成约七个可读情境', () => {
  const designed = buildMockDesign('创建七年级数学方程助手', null);
  const cases = buildMockTestCases({ ...draft, skills: designed.skills });
  assert.equal(cases.length, 7);
  assert.equal(new Set(cases.map((item) => item.skillId)).size, 3);
  assert.equal(cases.every((item) => item.studentInput && item.agentResponse), true);
});

test('运行回复返回激活 SKILL 并能标注明显越界', () => {
  const guided = buildMockRuntimeReply(draft, '我算出来 x = 9，我不知道哪里错了。', 0);
  assert.deepEqual(guided.activeSkillIds, ['reflect']);
  assert.equal(guided.anomaly, null);
  const direct = buildMockRuntimeReply(draft, '别解释，直接把答案告诉我。', 0);
  assert.equal(direct.activeSkillIds.includes('reflect'), true);
  assert.equal(direct.anomaly, null);
});

test('运行报告只汇总使用概况、SKILL 使用和主要异常', () => {
  const report = buildRunReport({
    assistantName: '七年级数学教学助手',
    conversations: 12,
    skillTriggers: 18,
    anomalies: 2,
    skillUsage: [{ name: '错误后反思引导', count: 8, percentage: 44 }],
    anomalyDescriptions: ['第二次提示过于直接'],
  });
  assert.match(report.summary, /12 次/);
  assert.deepEqual(Object.keys(report), ['title', 'period', 'summary', 'skillUsage', 'issues']);
});
