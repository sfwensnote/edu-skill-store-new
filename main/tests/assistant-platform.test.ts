import test from 'node:test';
import assert from 'node:assert/strict';
import {
  assistantSchema,
  canGenerateAssistant,
  filterAssistants,
  nextAssistantStatus,
  skillSchema,
  summarizeUsage,
  type AssistantSummary,
  type UsageSessionRecord,
} from '../shared/assistant';

const assistants: AssistantSummary[] = [
  {
    id: 'math',
    name: '一元一次方程错因诊断助手',
    goal: '帮助学生定位方程解答中的错误步骤。',
    grade: '初中',
    subject: '数学',
    activity: '错因诊断',
    status: 'ACTIVE',
    isPublic: true,
    skillCount: 3,
    updatedAt: '2026-09-09T00:00:00.000Z',
  },
  {
    id: 'reading',
    name: '阅读理解引导助手',
    goal: '用追问帮助学生梳理文章信息。',
    grade: '小学',
    subject: '语文',
    activity: '阅读',
    status: 'ACTIVE',
    isPublic: true,
    skillCount: 2,
    updatedAt: '2026-09-08T00:00:00.000Z',
  },
];

test('SKILL 必须包含可执行步骤与教学边界', () => {
  assert.equal(
    skillSchema.safeParse({
      id: 'reflect',
      name: '错误后反思引导',
      summary: '先了解学生的思路。',
      purpose: '保留自主修正机会。',
      trigger: '学生第一次回答错误时。',
      behaviorSteps: ['询问学生怎么思考', '给出一个推动思考的提示'],
      constraints: ['不直接给完整答案'],
    }).success,
    true,
  );
  assert.equal(
    skillSchema.safeParse({
      id: 'broken',
      name: '空能力',
      summary: '没有可执行行为。',
      purpose: '测试',
      trigger: '测试',
      behaviorSteps: [],
      constraints: [],
    }).success,
    false,
  );
});

test('助手状态只允许按设计、生成、检测、试用、发布顺序流转', () => {
  assert.equal(nextAssistantStatus('DRAFT', 'generate'), 'GENERATED');
  assert.equal(nextAssistantStatus('GENERATED', 'test'), 'TESTED');
  assert.equal(nextAssistantStatus('TESTED', 'trial'), 'TRIAL');
  assert.equal(nextAssistantStatus('TRIAL', 'activate'), 'ACTIVE');
  assert.throws(() => nextAssistantStatus('TESTED', 'activate'), /不能/);
  assert.throws(() => nextAssistantStatus('DRAFT', 'activate'), /不能/);
});

test('助手库搜索与三个维度筛选可以组合使用', () => {
  assert.deepEqual(
    filterAssistants(assistants, {
      query: '方程',
      grade: '初中',
      subject: '数学',
      activity: '错因诊断',
    }).map((item) => item.id),
    ['math'],
  );
  assert.deepEqual(
    filterAssistants(assistants, {
      query: '语文',
      grade: '全部',
      subject: '全部',
      activity: '全部',
    }).map((item) => item.id),
    ['reading'],
  );
});

test('运行摘要只统计对话、SKILL 触发和异常', () => {
  const sessions: UsageSessionRecord[] = [
    {
      id: 'one',
      assistantId: 'math',
      startedAt: '2026-09-09T14:32:00.000Z',
      endedAt: '2026-09-09T14:36:00.000Z',
      turnCount: 4,
      anomalyCount: 1,
      skillCounts: { reflect: 3, hint: 2 },
    },
    {
      id: 'two',
      assistantId: 'math',
      startedAt: '2026-09-08T10:15:00.000Z',
      endedAt: '2026-09-08T10:18:00.000Z',
      turnCount: 3,
      anomalyCount: 0,
      skillCounts: { reflect: 1, check: 2 },
    },
  ];
  assert.deepEqual(summarizeUsage(sessions), {
    conversations: 7,
    skillTriggers: 8,
    anomalies: 1,
    skillCounts: { reflect: 4, hint: 2, check: 2 },
  });
});

test('空设计稿允许保存，但名称、目标和 SKILL 齐全后才能生成', () => {
  const emptyDraft = assistantSchema.parse({
    id: 'a',
    userId: 'u',
    name: '七年级数学教学助手',
    goal: '帮助学生理解一元一次方程。',
    grade: '初中',
    subject: '数学',
    activity: '错因诊断',
    status: 'DRAFT',
    isPublic: false,
    skills: [],
    createdAt: '2026-09-09T00:00:00.000Z',
    updatedAt: '2026-09-09T00:00:00.000Z',
  });
  assert.equal(canGenerateAssistant(emptyDraft), false);
  assert.equal(canGenerateAssistant({ ...emptyDraft, skills: [
    {
      id: 'guide',
      name: '渐进式提示',
      summary: '逐步增加帮助。',
      purpose: '保留学生思考机会。',
      trigger: '学生遇到困难时。',
      behaviorSteps: ['先确认卡点'],
      constraints: ['不直接给完整答案'],
    },
  ] }), true);
});
