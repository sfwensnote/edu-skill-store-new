import type { EducationalSkill } from '../../../shared/assistant';

export type DemoTestCase = {
  id: string;
  skillId: string;
  title: string;
  scenario: string;
  studentInput: string;
  assistantOutput: string;
  checks: string[];
  attention?: string;
  methodReview?: boolean;
};

export function createTestCases(skills: EducationalSkill[]): DemoTestCase[] {
  return skills.flatMap((skill) =>
    (skill.steps?.length
      ? skill.steps
      : skill.behaviorSteps.map((action, index) => ({
          condition: index === 0 ? skill.trigger : `在“${skill.trigger}”范围内，需要继续第 ${index + 1} 步时`,
          action,
        }))
    ).map((step, index) => ({
      id: `${skill.id}-${index}`,
      skillId: skill.id,
      title: `${skill.name} · 情况 ${index + 1}`,
      methodReview: true,
      scenario: `教学方法核对：${step.condition}`,
      studentInput: step.condition,
      assistantOutput: step.action,
      checks: skill.constraints,
    })),
  );
}
