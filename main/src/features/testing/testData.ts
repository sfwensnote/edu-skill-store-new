import type { EducationalSkill } from '../../../shared/assistant';
import { demoSkillReply } from '../../../shared/skill-preview';

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
  expectedAction?: string;
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
      studentInput: '我不确定自己的做法是否正确，可以帮我看看吗？',
      assistantOutput: demoSkillReply({ skill, caseId: `${skill.id}:${index}`,
        messages: [{ role: 'user', content: '我不确定自己的做法是否正确，可以帮我看看吗？' }] }),
      expectedAction: step.action,
      checks: skill.constraints,
    })),
  );
}
