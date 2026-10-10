import type { EducationalSkill } from './assistant';
import { normalizeTeachingTags, type TeachingCategory } from './teaching-tags';

export type TeachingMethod = {
  name?: string;
  description?: string;
  category?: TeachingCategory | null;
  tags?: string[];
  problem: string;
  expectedOutcome: string;
  trigger: string;
  teachingSteps: { condition: string; action: string }[];
  principles: string[];
};

export type MethodAnswer = { questionId: string; question: string; answer: string };

export type CreationDraft = {
  sourceRevision?: number;
  originalIdea: string;
  exampleIdea?: boolean;
  grade: string;
  subject: string;
  teachingScene: string;
  stage: 'idea' | 'method' | 'preview';
  method: TeachingMethod;
  conversation: MethodAnswer[];
  questionIndex: number;
  manualEdits: string[];
  editingSkillId?: string;
  pendingAnswer?: { questionId: string; value: string };
  pendingSupplement?: { condition: string; action: string };
};

export const demoIdea =
  '学生做错题以后经常等答案。我希望第一次做错的时候不要马上告诉他答案，而是先让他看看自己的思路哪里有问题。';

export const mockQuestions = [
  {
    id: 'outcome',
    question: '你希望学生学会什么？',
    placeholder: '说说你最希望学生学会什么……',
    example: '我希望他不要马上依赖答案，而是先回顾自己的思路，尝试自己发现哪里出了问题。',
  },
  {
    id: 'trigger',
    question: '学生出现什么情况时，你会这样做？',
    placeholder: '说说你通常在什么情况下开始……',
    example: '学生第一次回答错误，而且自己还没有意识到问题的时候。',
  },
  {
    id: 'first-action',
    question: '这种情况下，你通常会先怎么做？',
    placeholder: '说说你会先做什么……',
    example: '我会先让他回顾一下刚才的解题思路，说说自己是怎么想的。',
  },
  {
    id: 'next-condition',
    question: '如果学生仍有困难，你会在什么情况下继续帮助？',
    placeholder: '说说什么情况会让你继续介入……',
    example: '如果他回顾以后还是没有发现问题，我就会继续介入。',
  },
  {
    id: 'next-action',
    question: '这种情况下，你通常会怎么处理？',
    placeholder: '说说你接下来会怎么做……',
    example: '我会提醒他检查可能出错的那一步，但是不会直接告诉他错误在哪里。',
  },
  {
    id: 'principle',
    question: '有哪些做法需要避免？',
    placeholder: '写下需要遵守的原则……',
    example: '第一次答错的时候不要直接给完整答案。',
  },
] as const;

export function emptyMethod(): TeachingMethod {
  return { problem: '', expectedOutcome: '', trigger: '', teachingSteps: [], principles: [], category: null, tags: [] };
}

export function defaultCreationDraft(): CreationDraft {
  return {
    originalIdea: demoIdea,
    exampleIdea: true,
    grade: '初中',
    subject: '数学',
    teachingScene: '错因辅导',
    stage: 'idea',
    method: { ...emptyMethod(), category: '错因辅导' },
    conversation: [],
    questionIndex: 0,
    manualEdits: [],
  };
}

// 只整理教师已经写下的想法；其他方法字段由教师后续回答。
export function prepareMethod(idea: string, current: TeachingMethod): TeachingMethod {
  if (current.problem.trim()) return current;
  return { ...current, problem: idea.trim() === demoIdea ? '学生答错后容易依赖直接答案' : idea.trim() };
}

export function recordAnswer(draft: CreationDraft, answer: string): CreationDraft {
  const item = mockQuestions[draft.questionIndex];
  if (!item || !answer.trim()) return draft;
  const value = answer.trim();
  const method = {
    ...draft.method,
    teachingSteps: draft.method.teachingSteps.map((step) => ({ ...step })),
    principles: [...draft.method.principles],
  };
  const editable = (field: string) => !draft.manualEdits.includes(field);
  switch (item.id) {
    case 'outcome':
      if (editable('expectedOutcome')) method.expectedOutcome = value;
      break;
    case 'trigger':
      if (editable('trigger')) method.trigger = value;
      if (!method.teachingSteps.length) method.teachingSteps.push({ condition: method.trigger, action: '' });
      else if (editable('step-0-condition')) method.teachingSteps[0].condition = method.trigger;
      break;
    case 'first-action':
      if (!method.teachingSteps.length) method.teachingSteps.push({ condition: method.trigger, action: '' });
      if (editable('step-0-action')) method.teachingSteps[0].action = value;
      break;
    case 'next-condition':
      if (method.teachingSteps.length < 2) method.teachingSteps.push({ condition: value, action: '' });
      else if (editable('step-1-condition')) method.teachingSteps[1].condition = value;
      break;
    case 'next-action':
      if (method.teachingSteps.length < 2) method.teachingSteps.push({ condition: '', action: '' });
      if (editable('step-1-action')) method.teachingSteps[1].action = value;
      break;
    case 'principle':
      if (editable('principles') && !method.principles.includes(value)) method.principles.push(value);
      break;
  }
  return {
    ...draft,
    method,
    pendingAnswer: undefined,
    questionIndex: draft.questionIndex + 1,
    conversation: [...draft.conversation, { questionId: item.id, question: item.question, answer: value }],
  };
}

export function methodFromSkill(skill: EducationalSkill): TeachingMethod {
  return {
    name: skill.name,
    description: skill.description || skill.summary,
    category: skill.category,
    tags: skill.tags === undefined ? undefined : normalizeTeachingTags(skill.tags),
    problem: skill.problem || skill.purpose,
    expectedOutcome: skill.purpose,
    trigger: skill.trigger,
    teachingSteps:
      skill.steps?.map((step) => ({ ...step })) ||
      skill.behaviorSteps.map((action, index) => ({
        condition: index === 0 ? skill.trigger : `完成上一步后，需要继续第 ${index + 1} 步时`,
        action,
      })),
    principles: [...skill.constraints],
  };
}

export function methodError(method: TeachingMethod): string {
  if (method.category === null) return '请选择教学分类，再确认方法。';
  if (
    !method.problem.trim() ||
    !method.expectedOutcome.trim() ||
    !method.trigger.trim() ||
    !method.teachingSteps.length ||
    method.teachingSteps.some((step) => !step.condition.trim() || !step.action.trim())
  ) {
    return '请补全教学方法中标记为“待补充”的内容。';
  }
  if (method.teachingSteps.length > 8) return '一项 SKILL 最多包含 8 种情况，请合并相近情况后再确认。';
  const principles = method.principles.filter((item) => item.trim());
  if (principles.length > 8) return '一项 SKILL 最多保留 8 条原则，请合并相近原则后再确认。';
  if ((method.name?.trim().length || 0) > 80) return '请将 SKILL 名称缩短至 80 字以内。';
  if ([method.problem, method.expectedOutcome, method.trigger].some((item) => item.trim().length > 800))
    return '请将问题、学习目标和开始条件分别缩短至 800 字以内。';
  if (
    method.teachingSteps.some((step) => step.condition.trim().length > 500 || step.action.trim().length > 500)
  )
    return '请将每种情况和做法分别缩短至 500 字以内。';
  if (principles.some((item) => item.trim().length > 500)) return '请将每条原则缩短至 500 字以内。';
  return '';
}

export function packageTeachingMethod(method: TeachingMethod, id: string, scene = ''): EducationalSkill {
  const error = methodError(method);
  if (error) throw new Error(error);
  const description =
    method.description?.trim() ||
    `触发：${method.trigger}；做法：${method.teachingSteps[0].action}；目标：${method.expectedOutcome}`.slice(
      0,
      300,
    );
  return {
    id,
    name: method.name?.trim() || `${scene.trim() || method.problem.slice(0, 24)} · 教学引导`.slice(0, 80),
    description,
    category: method.category || null,
    tags: normalizeTeachingTags(method.tags),
    summary: description.slice(0, 300),
    purpose: method.expectedOutcome,
    problem: method.problem,
    trigger: method.trigger,
    steps: method.teachingSteps.map((step) => ({ ...step })),
    behaviorSteps: method.teachingSteps.map((step) => step.action),
    constraints: method.principles.filter((principle) => principle.trim()),
  };
}

export function upsertMethodSkill(skills: EducationalSkill[], skill: EducationalSkill) {
  return skills.some((item) => item.id === skill.id)
    ? skills.map((item) => (item.id === skill.id ? skill : item))
    : [...skills, skill];
}
