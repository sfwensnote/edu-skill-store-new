import { assistantStatusSchema, type TeachingAssistant } from './assistant';
import type { ContextualDesign } from './contextual-design';
import type { LocalTeachingTask, SkillEntry } from './marketplace';

const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const strings = (value: unknown, keys: string[]) =>
  object(value) && keys.every((key) => typeof value[key] === 'string');
const level = (value: unknown) => value === 1 || value === 2 || value === 3;
function isStoredSkill(skill: unknown) {
  return (
    strings(skill, ['id', 'name', 'summary', 'purpose', 'trigger']) &&
    object(skill) &&
    Array.isArray(skill.behaviorSteps) &&
    skill.behaviorSteps.every((item) => typeof item === 'string') &&
    Array.isArray(skill.constraints) &&
    skill.constraints.every((item) => typeof item === 'string') &&
    (skill.steps === undefined ||
      (Array.isArray(skill.steps) && skill.steps.every((step) => strings(step, ['condition', 'action']))))
  );
}

export function isStoredAssistant(value: unknown): value is TeachingAssistant {
  return (
    object(value) &&
    strings(value, [
      'id',
      'userId',
      'name',
      'goal',
      'grade',
      'subject',
      'activity',
      'createdAt',
      'updatedAt',
    ]) &&
    assistantStatusSchema.safeParse(value.status).success &&
    typeof value.isPublic === 'boolean' &&
    Array.isArray(value.skills) &&
    value.skills.every(isStoredSkill)
  );
}

export function isStoredDesign(value: unknown): value is ContextualDesign {
  if (
    !object(value) ||
    !strings(value, [
      'id',
      'ownerId',
      'title',
      'grade',
      'year',
      'subject',
      'knowledgePoint',
      'originalProblem',
      'learningGoal',
      'contextType',
      'customContext',
      'createdAt',
      'updatedAt',
    ])
  )
    return false;
  if (
    !level(value.currentLevel) ||
    !['DRAFT', 'SAVED'].includes(value.status as string) ||
    !Array.isArray(value.savedLevels) ||
    !value.savedLevels.every(level) ||
    !Array.isArray(value.readiness) ||
    !value.readiness.every((item) => typeof item === 'boolean')
  )
    return false;
  const problem = value.contextualProblem;
  if (
    problem !== null &&
    (!strings(problem, [
      'title',
      'context',
      'question',
      'knowledgeGoal',
      'retainedRelations',
      'answerKey',
      'teacherChecks',
    ]) ||
      !object(problem) ||
      typeof problem.confirmed !== 'boolean' ||
      !['sample', 'template'].includes(problem.mode as string))
  )
    return false;
  const chain = value.taskChain;
  if (
    chain !== null &&
    (!object(chain) ||
      typeof chain.needsReview !== 'boolean' ||
      !Array.isArray(chain.tasks) ||
      !chain.tasks.every((item) =>
        strings(item, ['id', 'title', 'requirement', 'competency', 'output', 'support']),
      ))
  )
    return false;
  const project = value.pblProject;
  return (
    project === null ||
    (strings(project, [
      'name',
      'drivingQuestion',
      'goals',
      'activities',
      'stages',
      'resources',
      'outcome',
      'presentation',
      'evaluation',
      'conditions',
    ]) &&
      object(project) &&
      typeof project.needsReview === 'boolean')
  );
}

export function isStoredSkillEntry(value: unknown): value is SkillEntry {
  return (
    object(value) &&
    strings(value, [
      'id',
      'creator',
      'grade',
      'subject',
      'scene',
      'version',
      'validation',
      'example',
      'source',
    ]) &&
    ['daily', 'inquiry'].includes(value.area as string) &&
    typeof value.demo === 'boolean' &&
    isStoredSkill(value.skill)
  );
}

export function isStoredTask(value: unknown): value is LocalTeachingTask {
  if (
    !object(value) ||
    !strings(value, ['id', 'title', 'instructions', 'feedback', 'createdAt']) ||
    !level(value.level) ||
    !Array.isArray(value.submissions)
  )
    return false;
  if (
    !value.submissions.every(
      (item) =>
        strings(item, ['submittedAt', 'feedback']) &&
        object(item) &&
        object(item.answers) &&
        Object.values(item.answers).every((answer) => typeof answer === 'string'),
    )
  )
    return false;
  if (
    value.kind === 'design'
      ? !isStoredDesign(value.design)
      : value.kind !== 'skill' || !isStoredSkillEntry(value.skill)
  )
    return false;
  if (value.supportSkill !== undefined && !isStoredSkillEntry(value.supportSkill)) return false;
  if (value.activitySettings !== undefined) {
    const s = value.activitySettings;
    if (
      !strings(s, ['title', 'instructions', 'audienceLabel', 'startsAt', 'endsAt', 'feedback']) ||
      !object(s) ||
      !['controlled', 'class', 'students'].includes(s.audience as string) ||
      typeof s.allowRetry !== 'boolean' ||
      !['text', 'stages'].includes(s.submission as string) ||
      !['after-submit', 'teacher'].includes(s.feedbackTiming as string)
    )
      return false;
  }
  return true;
}
