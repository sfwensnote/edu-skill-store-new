import type { EducationalSkill } from '../../shared/assistant';
import { compileSkillInstructions, demoSkillReply } from '../../shared/skill-preview';
import { methodPreviewCases } from '../../shared/method-preview';
import { skillTrialBindings } from './skill-trial-bindings';

export type SkillTrialTurn = {
  student: string;
  reply: string;
  choices?: SkillTrialTurn[];
};

export type SkillTrialCase = {
  id: string;
  title: string;
  material: string;
  start: SkillTrialTurn;
};

export type SkillTrialBinding = { skill: EducationalSkill; cases: SkillTrialCase[] };

export function skillTrialCases(skill: EducationalSkill, bindings = skillTrialBindings): SkillTrialCase[] {
  const binding = bindings.find((item) => item.skill.id === skill.id);
  const source = binding?.skill;
  if (source && compileSkillInstructions(source) === compileSkillInstructions(skill)) return binding.cases;
  return methodPreviewCases([skill]).map((item, index, steps) => {
    const student = item.studentInput;
    const reply = demoSkillReply({ skill, caseId: item.id, messages: [{ role: 'user', content: student }] });
    const next = steps[index + 1];
    return {
      id: `generated:${item.id}`, title: `情况 ${index + 1}：${item.condition}`,
      material: item.condition,
      start: { student, reply, ...(next ? { choices: [{ student: next.studentInput,
        reply: demoSkillReply({ skill, caseId: next.id, messages: [{ role: 'user', content: next.studentInput }] }),
      }] } : {}) },
    };
  });
}
