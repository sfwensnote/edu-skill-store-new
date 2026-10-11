import type { EducationalSkill } from '../../../shared/assistant';
import { demoSkillReply } from '../../../shared/skill-preview';
import { methodPreviewCases } from '../../../shared/method-preview';

export type MethodCheckCase = {
  id: string;
  skillId: string;
  title: string;
  scenario: string;
  studentInput: string;
  assistantOutput: string;
  checks: string[];
  expectedAction: string;
};

export function createTestCases(skills: EducationalSkill[]): MethodCheckCase[] {
  return skills.flatMap((skill) =>
    methodPreviewCases([skill]).map((step, index) => ({
      id: `${skill.id}-${index}`,
      skillId: skill.id,
      title: `${skill.name} · 情况 ${index + 1}`,
      scenario: `教学方法核对：${step.condition}`,
      studentInput: step.studentInput,
      assistantOutput: demoSkillReply({ skill, caseId: step.id,
        messages: [{ role: 'user', content: step.studentInput }] }),
      expectedAction: step.action,
      checks: skill.constraints,
    })),
  );
}
