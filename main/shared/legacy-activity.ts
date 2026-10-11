// 仅用于读取旧教学活动资料；当前学伴流程不使用此模型。
type DraftBase = { id: string; step: number; updatedAt: string };
export type LearningSettings = {
  title: string;
  instructions: string;
  audience: 'controlled' | 'class' | 'students';
  audienceLabel: string;
  startsAt: string;
  endsAt: string;
  allowRetry: boolean;
  submission: 'text' | 'stages';
  feedbackTiming: 'after-submit' | 'teacher';
  feedback: string;
};
type LearningActivityDraft = DraftBase & {
  path: 'learning';
  resourceKey: string;
  settings: LearningSettings;
  supportSkillId: string;
  supportVersion?: string;
};
type PlanSimulation = {
  createdAt: string;
  fingerprint: string;
  assessment: 'trigger' | 'no-trigger' | 'unknown';
  scenario: string;
  plannedSteps: string[];
};
type SkillApplicationDraft = DraftBase & {
  path: 'skill';
  skillId: string;
  skillVersion?: string;
  targetKind: 'activity' | 'assistant';
  targetTaskId: string;
  scope: string;
  scenario: string;
  assessment: PlanSimulation['assessment'];
  simulation?: PlanSimulation;
  teacherReviewed: boolean;
};
export type TeachingActivityDraft = LearningActivityDraft | SkillApplicationDraft;

export function isActivityDraft(value: unknown): value is TeachingActivityDraft {
  if (!value || typeof value !== 'object') return false;
  const d = value as TeachingActivityDraft;
  if (
    typeof d.id !== 'string' ||
    typeof d.updatedAt !== 'string' ||
    !Number.isInteger(d.step) ||
    d.step < 1 ||
    d.step > 4
  )
    return false;
  if (d.path === 'learning') {
    const s = d.settings;
    return (
      typeof d.resourceKey === 'string' &&
      typeof d.supportSkillId === 'string' &&
      (d.supportVersion === undefined || typeof d.supportVersion === 'string') &&
      !!s &&
      ['title', 'instructions', 'audienceLabel', 'startsAt', 'endsAt', 'feedback'].every(
        (key) => typeof s[key as keyof LearningSettings] === 'string',
      ) &&
      ['controlled', 'class', 'students'].includes(s.audience) &&
      typeof s.allowRetry === 'boolean' &&
      ['text', 'stages'].includes(s.submission) &&
      ['after-submit', 'teacher'].includes(s.feedbackTiming)
    );
  }
  return (
    d.path === 'skill' &&
    (d.skillVersion === undefined || typeof d.skillVersion === 'string') &&
    ['skillId', 'targetTaskId', 'scope', 'scenario'].every(
      (key) => typeof d[key as keyof SkillApplicationDraft] === 'string',
    ) &&
    ['activity', 'assistant'].includes(d.targetKind) &&
    ['trigger', 'no-trigger', 'unknown'].includes(d.assessment) &&
    typeof d.teacherReviewed === 'boolean' &&
    (!d.simulation ||
      (Array.isArray(d.simulation.plannedSteps) &&
        d.simulation.plannedSteps.every((s) => typeof s === 'string') &&
        typeof d.simulation.fingerprint === 'string' &&
        typeof d.simulation.createdAt === 'string' &&
        typeof d.simulation.scenario === 'string' &&
        ['trigger', 'no-trigger', 'unknown'].includes(d.simulation.assessment)))
  );
}
