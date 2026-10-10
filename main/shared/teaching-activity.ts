import { levelNames, type ContextualDesign, type DesignLevel } from './contextual-design';
import { isOutcomeReady } from './inquiry-workflow';
import type { LocalTeachingTask, SkillEntry } from './marketplace';

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
export type LearningActivityDraft = DraftBase & {
  path: 'learning';
  resourceKey: string;
  settings: LearningSettings;
  supportSkillId: string;
  supportVersion?: string;
};
export type PlanSimulation = {
  createdAt: string;
  fingerprint: string;
  assessment: 'trigger' | 'no-trigger' | 'unknown';
  scenario: string;
  plannedSteps: string[];
};
export type SkillApplicationDraft = DraftBase & {
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
export type LearningResource = { key: string; title: string; design: ContextualDesign; level: DesignLevel };

export function learningResources(designs: ContextualDesign[]): LearningResource[] {
  return designs.flatMap((design) =>
    design.savedLevels
      .filter((level) => isOutcomeReady(design, level))
      .map((level) => ({
        key: `design:${design.id}:${level}`,
        title: level === 3 ? design.pblProject!.name : design.contextualProblem?.title || design.title,
        design,
        level,
      })),
  );
}

export function newActivityDraft(path: TeachingActivityDraft['path'], id: string): TeachingActivityDraft {
  const base = { id, step: 1, updatedAt: new Date().toISOString() };
  return path === 'learning'
    ? {
        ...base,
        path,
        resourceKey: '',
        supportSkillId: '',
        settings: {
          title: '',
          instructions: '',
          audience: 'controlled',
          audienceLabel: '',
          startsAt: '',
          endsAt: '',
          allowRetry: true,
          submission: 'text',
          feedbackTiming: 'after-submit',
          feedback: '学习记录已保存，请对照任务要求检查你的过程与依据。',
        },
      }
    : {
        ...base,
        path,
        skillId: '',
        targetKind: 'activity',
        targetTaskId: '',
        scope: '',
        scenario: '',
        assessment: 'unknown',
        teacherReviewed: false,
      };
}

export function skillPermissionIssue(entry: SkillEntry, ownedIds: string[]): string {
  if (!ownedIds.includes(entry.id)) return '请先将集市方法复用到我的作品，再配置应用。';
  if (entry.demo || entry.validation !== '教师已核对') return '方法尚未完成教师核对，可查看和保存配置草稿。';
  if (!entry.skill.constraints.length) return '方法尚未填写教学原则，请先返回方法流程补充。';
  return '';
}

export function compatibilityIssue(entry: SkillEntry, design: ContextualDesign): string {
  if (!entry.grade.trim() || !entry.subject.trim() || !design.grade.trim() || !design.subject.trim())
    return '适用范围信息不完整，请先补全作品和方法的学段、学科。';
  if (entry.grade !== design.grade || entry.subject !== design.subject)
    return `方法适用于${entry.grade}${entry.subject}，当前活动为${design.grade}${design.subject}，请更换方法。`;
  return '';
}

export function settingsIssue(settings: LearningSettings): string {
  if (!settings.title.trim()) return '请填写活动名称。';
  if (!settings.instructions.trim()) return '请填写给学生的学习说明。';
  if (settings.audience !== 'controlled' && !settings.audienceLabel.trim()) return '请填写本次学习对象。';
  if (settings.startsAt && !Number.isFinite(Date.parse(settings.startsAt))) return '请填写有效的开始时间。';
  if (settings.endsAt && !Number.isFinite(Date.parse(settings.endsAt))) return '请填写有效的截止时间。';
  if (settings.startsAt && settings.endsAt && Date.parse(settings.endsAt) <= Date.parse(settings.startsAt))
    return '截止时间应晚于开始时间。';
  if (settings.feedbackTiming === 'after-submit' && !settings.feedback.trim())
    return '请填写提交后显示的提示。';
  return '';
}

export function simulationFingerprint(
  draft: SkillApplicationDraft,
  entry: SkillEntry | undefined,
  target?: LocalTeachingTask,
) {
  return JSON.stringify([
    entry?.id,
    entry?.version,
    entry?.skill,
    entry?.grade,
    entry?.subject,
    draft.targetKind,
    draft.targetTaskId,
    draft.scope,
    draft.scenario,
    draft.assessment,
    target && [
      target.kind,
      target.level,
      target.title,
      target.design,
      target.instructions,
      target.activitySettings,
      target.supportSkill,
    ],
  ]);
}

export function simulateMethodPlan(
  draft: SkillApplicationDraft,
  entry: SkillEntry,
  target?: LocalTeachingTask,
): PlanSimulation {
  return {
    createdAt: new Date().toISOString(),
    fingerprint: simulationFingerprint(draft, entry, target),
    assessment: draft.assessment,
    scenario: draft.scenario,
    plannedSteps:
      draft.assessment === 'trigger'
        ? entry.skill.steps?.length
          ? entry.skill.steps.map((s) => `当${s.condition}，${s.action}`)
          : [...entry.skill.behaviorSteps]
        : [],
  };
}

export function activityStepIssue(
  draft: TeachingActivityDraft,
  resources: LearningResource[],
  entries: SkillEntry[],
  ownedIds: string[],
  tasks: LocalTeachingTask[],
): string {
  if (draft.path === 'learning') {
    const resource = resources.find((r) => r.key === draft.resourceKey);
    if (!resource) return '请选择一份已保存且已确认的学习作品。';
    if (draft.step >= 2 && settingsIssue(draft.settings)) return settingsIssue(draft.settings);
    if (draft.step >= 3 && draft.supportSkillId) {
      const entry = entries.find((e) => e.id === draft.supportSkillId);
      if (!entry) return '绑定的方法已移除，请重新选择或取消智能支持。';
      if (draft.supportVersion !== entry.version) return '绑定方法的版本已变化，请重新选择并检查适用范围。';
      return skillPermissionIssue(entry, ownedIds) || compatibilityIssue(entry, resource.design);
    }
    return '';
  }
  const entry = entries.find((e) => e.id === draft.skillId);
  if (!entry) return '请选择一项教学 SKILL。';
  if (draft.skillVersion !== entry.version) return '方法版本已变化，请回到第一步重新选择。';
  // 未核对方法允许走完草稿与模拟检查，但正式启用始终受运行能力与验证条件限制。
  if (draft.step >= 2) {
    if (draft.targetKind === 'assistant') return '教学助手运行环境规划中，请选择已有教学任务。';
    const target = tasks.find((task) => task.id === draft.targetTaskId && task.kind === 'design');
    if (!target?.design) return '请选择一个已保存的教学任务。';
    if (compatibilityIssue(entry, target.design)) return compatibilityIssue(entry, target.design);
    if (!draft.scope.trim()) return '请说明方法在什么情况下可以介入。';
  }
  const target = tasks.find((task) => task.id === draft.targetTaskId);
  if (
    draft.step >= 3 &&
    (!draft.simulation || draft.simulation.fingerprint !== simulationFingerprint(draft, entry, target))
  )
    return '请先生成当前配置的规则模拟，再检查方法与教学原则。';
  return '';
}

export function learningTaskSnapshot(
  draft: LearningActivityDraft,
  resource: LearningResource,
  support: SkillEntry | undefined,
  existing?: LocalTeachingTask,
): LocalTeachingTask {
  if (existing?.submissions.length) return structuredClone(existing);
  return {
    id: draft.id,
    title: draft.settings.title,
    kind: 'design',
    level: resource.level,
    design: structuredClone(resource.design),
    instructions: draft.settings.instructions,
    feedback:
      draft.settings.feedbackTiming === 'after-submit'
        ? draft.settings.feedback
        : '学习记录已保存，等待教师反馈。',
    submissions: existing?.submissions || [],
    createdAt: existing?.createdAt || new Date().toISOString(),
    activitySettings: { ...draft.settings },
    supportSkill: support ? structuredClone(support) : undefined,
    status: 'draft',
  };
}

export function draftTitle(draft: TeachingActivityDraft, entries: SkillEntry[]) {
  return draft.path === 'learning'
    ? draft.settings.title || '未命名教学任务'
    : `${entries.find((e) => e.id === draft.skillId)?.skill.name || '未选择方法'} · 应用配置`;
}

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

export { levelNames };
