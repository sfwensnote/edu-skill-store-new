import type { EducationalSkill } from './assistant';

export type MethodPreviewCase = { id: string; skillId: string; title: string; condition: string; action: string };
export function methodPreviewCases(skills: EducationalSkill[]): MethodPreviewCase[] {
  return skills.flatMap((skill) => (
    skill.steps?.length ? skill.steps : skill.behaviorSteps.map((action, index) => ({
      condition: index === 0 ? skill.trigger : `在原触发范围内，需要继续第 ${index + 1} 步时`,
      action,
    }))
  ).map((step, index) => ({
    ...step, id: `${skill.id}:${index}`, skillId: skill.id, title: `${skill.name} · 步骤 ${index + 1}`,
  })));
}
