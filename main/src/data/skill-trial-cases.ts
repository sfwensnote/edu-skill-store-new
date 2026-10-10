import type { EducationalSkill } from '../../shared/assistant';
import { compileSkillInstructions } from '../../shared/skill-preview';
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
  if (!source || compileSkillInstructions(source) !== compileSkillInstructions(skill)) return [];
  return binding?.cases || [];
}
