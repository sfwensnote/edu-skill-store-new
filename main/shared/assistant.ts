import { z } from 'zod';
import { maxTeachingTags, maxTagLength, storedTeachingCategories } from './teaching-tags';
import { skillIconSchema } from './skill-icon';

const text = (max = 2000) => z.string().trim().min(1).max(max);

export const assistantStatusSchema = z.enum(['DRAFT', 'GENERATED', 'TESTED', 'TRIAL', 'ACTIVE']);
export type AssistantStatus = z.infer<typeof assistantStatusSchema>;

export const skillSchema = z.object({
  id: z.string().trim().min(1).max(80),
  name: text(80),
  summary: text(300),
  description: z.string().optional(),
  category: z.enum(storedTeachingCategories).nullable().optional(),
  icon: skillIconSchema.optional(),
  tags: z.array(z.string().trim().min(1).max(maxTagLength)).max(maxTeachingTags).optional(),
  steps: z
    .array(z.object({ condition: text(500), action: text(500) }))
    .min(1)
    .max(8)
    .optional(),
  purpose: text(800),
  problem: text(800).optional(),
  trigger: text(800),
  behaviorSteps: z.array(text(500)).min(1).max(8),
  constraints: z.array(text(500)).max(8),
});
export type EducationalSkill = z.infer<typeof skillSchema>;

export const assistantSchema = z.object({
  id: z.string().min(1).max(80),
  userId: z.string().min(1).max(80),
  name: text(120),
  goal: text(1200),
  grade: text(30),
  subject: text(30),
  activity: text(40),
  status: assistantStatusSchema,
  isPublic: z.boolean(),
  skills: z.array(skillSchema).max(8),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  area: z.enum(['daily', 'inquiry']).optional(),
  revision: z.number().int().positive().optional(),
  sourceDesignId: z.string().optional(),
  skillAreas: z.record(z.string(), z.enum(['daily', 'inquiry'])).optional(),
  skillSources: z.record(z.string(), z.string()).optional(),
});
export type TeachingAssistant = z.infer<typeof assistantSchema>;

export function canGenerateAssistant(assistant: TeachingAssistant) {
  return Boolean(assistant.name.trim() && assistant.goal.trim() && assistant.skills.length);
}

export const designerMessageSchema = z.object({
  id: z.string(),
  assistantId: z.string(),
  role: z.enum(['user', 'assistant']),
  content: text(4000),
  createdAt: z.string().datetime(),
});
export type DesignerMessage = z.infer<typeof designerMessageSchema>;

export type AssistantSummary = Omit<TeachingAssistant, 'skills' | 'userId' | 'createdAt'> & {
  skillCount: number;
};

export type LibraryFilters = {
  query: string;
  grade: string;
  subject: string;
  activity: string;
};

export function filterAssistants(items: AssistantSummary[], filters: LibraryFilters) {
  const query = filters.query.trim().toLocaleLowerCase('zh-CN');
  return items.filter((item) => {
    const searchable =
      `${item.name} ${item.goal} ${item.grade} ${item.subject} ${item.activity}`.toLocaleLowerCase('zh-CN');
    return (
      (!query || searchable.includes(query)) &&
      (filters.grade === '全部' || item.grade === filters.grade) &&
      (filters.subject === '全部' || item.subject === filters.subject) &&
      (filters.activity === '全部' || item.activity === filters.activity)
    );
  });
}

type AssistantAction = 'generate' | 'test' | 'trial' | 'activate';
const transitions: Record<AssistantStatus, Partial<Record<AssistantAction, AssistantStatus>>> = {
  DRAFT: { generate: 'GENERATED' },
  GENERATED: { generate: 'GENERATED', test: 'TESTED' },
  TESTED: { generate: 'GENERATED', test: 'TESTED', trial: 'TRIAL' },
  TRIAL: { generate: 'GENERATED', test: 'TESTED', trial: 'TRIAL', activate: 'ACTIVE' },
  ACTIVE: { generate: 'GENERATED' },
};

export function nextAssistantStatus(current: AssistantStatus, action: AssistantAction): AssistantStatus {
  const next = transitions[current][action];
  if (!next) throw new Error(`当前状态不能执行“${action}”操作。`);
  return next;
}

export type UsageSessionRecord = {
  id: string;
  assistantId: string;
  startedAt: string;
  endedAt: string;
  turnCount: number;
  anomalyCount: number;
  skillCounts: Record<string, number>;
};

export function summarizeUsage(sessions: UsageSessionRecord[]) {
  const skillCounts: Record<string, number> = {};
  let conversations = 0;
  let anomalies = 0;
  for (const session of sessions) {
    conversations += session.turnCount;
    anomalies += session.anomalyCount;
    for (const [skillId, count] of Object.entries(session.skillCounts)) {
      skillCounts[skillId] = (skillCounts[skillId] || 0) + count;
    }
  }
  return {
    conversations,
    skillTriggers: Object.values(skillCounts).reduce((total, count) => total + count, 0),
    anomalies,
    skillCounts,
  };
}

export type TestVerdict = 'pass' | 'attention' | 'fail';
export type TestCaseType = 'typical' | 'boundary' | 'constraint';

export type TestCaseResult = {
  id: string;
  skillId: string;
  type: TestCaseType;
  title: string;
  scenario: string;
  studentInput: string;
  expectedBehaviors: string[];
  forbiddenBehaviors: string[];
  agentResponse: string;
  activeSkillIds: string[];
  trigger: { status: TestVerdict; reason: string };
  behavior: { status: TestVerdict; reason: string };
  constraints: { status: TestVerdict; reason: string };
  verdict: TestVerdict;
  summary: string;
};

export type TestRunView = {
  id: string;
  assistantId: string;
  version: string;
  status: 'RUNNING' | 'COMPLETED';
  startedAt: string;
  completedAt?: string;
  cases: TestCaseResult[];
};
