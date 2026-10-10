import { skillSchema, type TeachingAssistant } from './assistant';
import { methodError, packageTeachingMethod, upsertMethodSkill, type TeachingMethod } from './teaching-method';

export function reviseReviewedMethod(
  assistant: TeachingAssistant,
  skillId: string,
  method: TeachingMethod,
  updatedAt = new Date().toISOString(),
): TeachingAssistant {
  if (!assistant.skills.some((skill) => skill.id === skillId)) throw new Error('这项方法已移除，请返回我的作品。');
  const issue = methodError(method);
  if (issue) throw new Error(issue);
  const skill = packageTeachingMethod(method, skillId);
  return {
    ...assistant,
    skills: upsertMethodSkill(assistant.skills, skill),
    revision: (assistant.revision || 1) + 1,
    status: 'GENERATED',
    isPublic: false,
    updatedAt,
  };
}

export function isMethodReviewed(assistant: TeachingAssistant) {
  return assistant.skills.length > 0 && assistant.skills.every((skill) => skillSchema.safeParse(skill).success) &&
    ['TESTED', 'TRIAL', 'ACTIVE'].includes(assistant.status) &&
    !(assistant.id.startsWith('assistant-demo-') && !assistant.revision);
}
