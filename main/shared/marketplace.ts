import { z } from 'zod';
import { skillSchema, type EducationalSkill, type TeachingAssistant } from './assistant';
import type { ContextualDesign, DesignLevel } from './contextual-design';
import { isActivityDraft, type LearningSettings, type TeachingActivityDraft } from './teaching-activity';
import { isStoredDesign, isStoredTask } from './workspace-storage';

export type TeachingArea = 'daily' | 'inquiry';
export type SkillEntry = {
  id: string;
  skill: EducationalSkill;
  creator: string;
  grade: string;
  subject: string;
  area: TeachingArea;
  scene: string;
  version: string;
  validation: string;
  example: string;
  source: string;
  demo: boolean;
  assistantId?: string;
  addedFrom?: { id: string; addedAt: string };
};
const addedSkillSchema = z.object({
  id: z.string().min(1),
  skill: skillSchema,
  creator: z.string(), grade: z.string(), subject: z.string(),
  area: z.enum(['daily', 'inquiry']), scene: z.string(), version: z.string(),
  validation: z.string(), example: z.string(), source: z.string(), demo: z.boolean(),
  addedFrom: z.object({ id: z.string().min(1), addedAt: z.string().datetime() }),
}).refine((entry) => entry.id === `added:${entry.addedFrom.id}`);

// 添加保留来源版本的快照，不授予编辑、核对或发布权限。
export function addMarketSkill(current: SkillEntry[], source: SkillEntry, addedAt: string): SkillEntry[] {
  const sourceId = source.addedFrom?.id || source.id;
  if (current.some((entry) => entry.addedFrom?.id === sourceId)) return current;
  const snapshot = addedSkillSchema.parse({
    ...structuredClone(source), id: `added:${sourceId}`, addedFrom: { id: sourceId, addedAt },
  });
  return [snapshot, ...current];
}
function restoreAddedSkills(value: unknown): SkillEntry[] {
  const entries = new Map<string, SkillEntry>();
  if (!Array.isArray(value)) return [];
  for (const item of value) {
    const parsed = addedSkillSchema.safeParse(item);
    if (parsed.success) entries.set(parsed.data.addedFrom.id, parsed.data);
  }
  return [...entries.values()];
}
export type TaskSubmission = { answers: Record<string, string>; submittedAt: string; feedback: string };
export type LocalTeachingTask = {
  id: string;
  title: string;
  kind: 'skill' | 'design';
  level: DesignLevel;
  skill?: SkillEntry;
  design?: ContextualDesign;
  instructions: string;
  feedback: string;
  submissions: TaskSubmission[];
  createdAt: string;
  status?: 'draft';
  activitySettings?: LearningSettings;
  supportSkill?: SkillEntry;
};
export type MarketWorkspace = {
  version: 1;
  designs: ContextualDesign[];
  favorites: string[];
  sharedSkillIds: string[];
  addedSkills: SkillEntry[];
  tasks: LocalTeachingTask[];
  activityDrafts: TeachingActivityDraft[];
};

export function assistantSkillEntries(assistants: TeachingAssistant[]): SkillEntry[] {
  return assistants.flatMap((assistant) =>
    assistant.skills.map((skill) => ({
      id: `personal:${assistant.id}:${skill.id}`,
      skill,
      creator: assistant.id.startsWith('assistant-demo-') && !assistant.revision ? '教师' : '我',
      grade: assistant.grade,
      subject: assistant.subject,
      area: assistant.skillAreas?.[skill.id] || assistant.area || 'daily',
      scene: assistant.activity,
      version: `v${assistant.revision || 1}.0`,
      validation:
        assistant.id.startsWith('assistant-demo-') && !assistant.revision
          ? '方法待核对'
          : ['TESTED', 'TRIAL', 'ACTIVE'].includes(assistant.status)
            ? '教师已核对'
            : '方法待核对',
      example: `在“${skill.trigger}”时，${skill.steps?.[0]?.action || skill.behaviorSteps[0] || '按已确认方法引导学生'}。`,
      source:
        assistant.skillSources?.[skill.id] ||
        (assistant.sourceDesignId
          ? '来自项目中的教学指导方法，由教师整理并确认。'
          : assistant.id.startsWith('assistant-demo-') && !assistant.revision
            ? ''
            : '来自教师课堂经验，由教师整理并确认。'),
      demo: assistant.id.startsWith('assistant-demo-') && !assistant.revision,
      assistantId: assistant.id,
    })),
  );
}

export function parseMarketWorkspace(raw: string | null): MarketWorkspace {
  const empty: MarketWorkspace = {
    version: 1,
    designs: [],
    favorites: [],
    sharedSkillIds: [],
    addedSkills: [],
    tasks: [],
    activityDrafts: [],
  };
  if (!raw) return empty;
  try {
    const data = JSON.parse(raw);
    if (data.version !== 1) return empty;
    return {
      ...empty,
      addedSkills: restoreAddedSkills(data.addedSkills),
      designs: Array.isArray(data.designs) ? data.designs.filter(isStoredDesign) : [],
      favorites: Array.isArray(data.favorites)
        ? data.favorites.filter((x: unknown) => typeof x === 'string')
        : [],
      sharedSkillIds: Array.isArray(data.sharedSkillIds)
        ? data.sharedSkillIds.filter((x: unknown) => typeof x === 'string')
        : [],
      tasks: Array.isArray(data.tasks) ? data.tasks.filter(isStoredTask) : [],
      activityDrafts: Array.isArray(data.activityDrafts) ? data.activityDrafts.filter(isActivityDraft) : [],
    };
  } catch {
    return empty;
  }
}
