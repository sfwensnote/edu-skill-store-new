import type { EducationalSkill, TeachingAssistant, TestCaseResult } from '../../shared/assistant';

const defaultSkills: EducationalSkill[] = [
  {
    id: 'reflect',
    name: '错误后反思引导',
    summary: '学生答错后先了解他的思路，再给予针对性帮助。',
    purpose: '帮助学生反思自己的错误思路，并保留自主修正的机会。',
    trigger: '学生回答错误，或当前解题过程出现明显偏差时。',
    behaviorSteps: [
      '询问学生当前是怎么思考的',
      '根据学生回答识别可能的错误位置',
      '给出一个能够推动下一步思考的提示',
      '等待学生再次尝试，再决定是否继续帮助',
    ],
    constraints: ['首次错误时不直接给出完整答案', '不一次性给出完整解题步骤', '提示必须针对学生当前回答'],
  },
  {
    id: 'progressive-hint',
    name: '渐进式提示',
    summary: '学生仍然无法继续时，根据情况逐步增加支持。',
    purpose: '在不过度代替思考的前提下，让学生获得恰好够用的帮助。',
    trigger: '学生表示不会、停滞，或第一次提示后仍无法继续时。',
    behaviorSteps: ['确认学生卡住的具体位置', '先给方向性提示', '仍未继续时补充更具体的操作提示', '让学生完成下一步'],
    constraints: ['提示强度逐步增加', '学生尚未尝试时不直接展示完整过程', '一次只处理一个卡点'],
  },
  {
    id: 'understanding-check',
    name: '理解确认',
    summary: '通过新的问题检查学生是否真正理解。',
    purpose: '用可观察的再次作答确认学生已经掌握，而不是只听到“懂了”。',
    trigger: '学生完成纠错，或表示已经理解当前知识点时。',
    behaviorSteps: ['简短概括刚才解决的关键点', '给出一道同类但数字不同的问题', '等待学生独立回答', '根据回答确认或继续引导'],
    constraints: ['检测题不附带答案', '不只询问学生是否听懂', '题目难度与当前学习目标一致'],
  },
];

export function createDefaultSkills() {
  return cloneSkills(defaultSkills);
}

function cloneSkills(skills: EducationalSkill[]) {
  return skills.map((skill) => ({
    ...skill,
    behaviorSteps: [...skill.behaviorSteps],
    constraints: [...skill.constraints],
  }));
}

export function buildMockDesign(message: string, current: TeachingAssistant | null) {
  const skills = cloneSkills(current?.skills.length ? current.skills : defaultSkills);
  if (/第二次|更具体|具体一点/.test(message)) {
    const target = skills.find((skill) => skill.id === 'reflect') || skills[0];
    target.behaviorSteps = [
      ...target.behaviorSteps.filter((step) => !step.includes('第二次')),
      '如果学生第二次仍无法继续，给出更具体但不包含最终答案的提示',
    ];
  }
  return {
    assistantReply: current
      ? '已经按你的想法调整了教学技能。你可以在右侧展开查看。'
      : '我已经整理出助手目标和三项核心教学技能。你可以展开查看，也可以继续告诉我哪里需要调整。',
    assistantPatch: {
      name: current?.name || '七年级数学教学助手',
      goal:
        current?.goal ||
        '帮助七年级学生理解一元一次方程，在出现错误时先引导学生解释思路，再根据需要逐步提供帮助。',
      grade: current?.grade || '初中',
      subject: current?.subject || '数学',
      activity: current?.activity || '错因诊断',
    },
    skills,
  };
}

type CaseSeed = Pick<
  TestCaseResult,
  'type' | 'title' | 'scenario' | 'studentInput' | 'expectedBehaviors' | 'forbiddenBehaviors'
>;

const caseSeeds: CaseSeed[] = [
  {
    type: 'typical',
    title: '第一次回答错误',
    scenario: '学生第一次尝试回答题目，但给出了错误答案。检测助手是否先了解学生思路。',
    studentInput: '我算出来 x = 9。',
    expectedBehaviors: ['触发错误后反思引导', '先询问学生的计算过程'],
    forbiddenBehaviors: ['直接给出完整答案'],
  },
  {
    type: 'constraint',
    title: '学生索要答案',
    scenario: '学生要求跳过解释直接获得答案。检测助手能否守住教学边界。',
    studentInput: '别解释了，直接告诉我答案。',
    expectedBehaviors: ['邀请学生先说明思路'],
    forbiddenBehaviors: ['直接给出最终答案'],
  },
  {
    type: 'boundary',
    title: '学生已经答对',
    scenario: '学生给出正确答案。检测助手不会错误地进行错因诊断。',
    studentInput: '我算出 x = 2，代回原式也成立。',
    expectedBehaviors: ['不进行错误诊断', '确认计算依据'],
    forbiddenBehaviors: ['宣称学生回答错误'],
  },
  {
    type: 'typical',
    title: '第一次表示不会',
    scenario: '学生不知道如何开始。检测助手是否先给方向性提示。',
    studentInput: '这道方程我不会，第一步做什么？',
    expectedBehaviors: ['触发渐进式提示', '只提供一个起步提示'],
    forbiddenBehaviors: ['一次展示完整过程'],
  },
  {
    type: 'constraint',
    title: '提示后仍然卡住',
    scenario: '学生收到一次提示后仍无法继续。检测助手是否适度增加帮助。',
    studentInput: '我还是不知道两边应该怎么变。',
    expectedBehaviors: ['给出更具体的下一步提示'],
    forbiddenBehaviors: ['直接完成所有步骤'],
  },
  {
    type: 'typical',
    title: '完成纠错后检查理解',
    scenario: '学生已经完成原题。检测助手是否用新问题确认理解。',
    studentInput: '明白了，两边要同时减去 6。',
    expectedBehaviors: ['触发理解确认', '给出一道同类问题'],
    forbiddenBehaviors: ['同类题同时附答案'],
  },
  {
    type: 'boundary',
    title: '学生只说听懂了',
    scenario: '学生没有展示新的作答证据。检测助手不能只凭口头表达判断掌握。',
    studentInput: '我懂了。',
    expectedBehaviors: ['要求学生用新问题展示理解'],
    forbiddenBehaviors: ['直接宣布已经掌握'],
  },
];

export function buildMockTestCases(assistant: TeachingAssistant): TestCaseResult[] {
  const allocation = [assistant.skills[0], assistant.skills[0], assistant.skills[0], assistant.skills[1], assistant.skills[1], assistant.skills[2], assistant.skills[2]];
  return caseSeeds.map((seed, index) => {
    const skill = allocation[index] || assistant.skills[index % assistant.skills.length];
    const attention = index === 4;
    return {
      id: `case-${index + 1}`,
      skillId: skill.id,
      ...seed,
      agentResponse:
        index === 0
          ? '你能说说从 3x + 6 = 12 到 x = 9 这一步是怎么计算的吗？'
          : index === 4
            ? '先想一想：为了消去左边的加 6，等式两边都可以减去几？'
            : index === 5
              ? '试试这道题：2x + 5 = 11。请先独立写出第一步。'
              : '我先不替你完成。请说说你目前想到哪一步，我们从这个位置继续。',
      activeSkillIds: seed.type === 'boundary' && index === 2 ? [] : [skill.id],
      trigger: { status: 'pass', reason: '在预期情境中进行了正确判断。' },
      behavior: {
        status: attention ? 'attention' : 'pass',
        reason: attention ? '第二次提示可以再明确一点。' : '回复包含预期的教学行为。',
      },
      constraints: { status: 'pass', reason: '没有直接给出完整答案，也未越过教学边界。' },
      verdict: attention ? 'attention' : 'pass',
      summary: attention ? '提示方向正确，但第二次提示仍可更具体。' : '符合这项教学技能的触发与行为要求。',
    };
  });
}

export function buildMockRuntimeReply(assistant: TeachingAssistant, input: string, turn: number) {
  const skills = assistant.skills;
  const wantsAnswer = /直接.*答案|告诉我答案/.test(input);
  const isCorrect = /x\s*=\s*2|代回|懂了|明白/.test(input);
  const isStuck = /不会|不知道|卡住|还是/.test(input);
  const selected = isCorrect
    ? skills.find((skill) => skill.id === 'understanding-check')
    : isStuck && turn > 0
      ? skills.find((skill) => skill.id === 'progressive-hint')
      : skills.find((skill) => skill.id === 'reflect') || skills[0];
  const content = isCorrect
    ? '很好。为了确认你真的掌握了，请独立试一试：2x + 5 = 11。先写出第一步，不用急着给最终答案。'
    : isStuck && turn > 0
      ? '我们只看下一步：想消去左边的 +6，等式两边都应该同时减去什么？'
      : wantsAnswer
        ? '我先不直接给答案。你能告诉我从原式到现在这一步是怎么想的吗？我会根据你的思路给一个提示。'
        : '先别急着改答案。你能把从 3x + 6 = 12 到当前结果的计算过程写出来吗？';
  return { content, activeSkillIds: selected ? [selected.id] : [], anomaly: null as null | string };
}

export type ReportInput = {
  assistantName: string;
  conversations: number;
  skillTriggers: number;
  anomalies: number;
  skillUsage: { name: string; count: number; percentage: number }[];
  anomalyDescriptions: string[];
};

export function buildRunReport(input: ReportInput) {
  const end = new Date();
  const start = new Date(end.getTime() - 6 * 86400000);
  return {
    title: `${input.assistantName}运行报告`,
    period: `${start.toLocaleDateString('zh-CN')}—${end.toLocaleDateString('zh-CN')}`,
    summary: `最近 7 天共完成 ${input.conversations} 次对话，触发教学技能 ${input.skillTriggers} 次，记录异常 ${input.anomalies} 次。`,
    skillUsage: input.skillUsage,
    issues: input.anomalyDescriptions.length ? input.anomalyDescriptions : ['当前没有需要关注的异常。'],
  };
}
