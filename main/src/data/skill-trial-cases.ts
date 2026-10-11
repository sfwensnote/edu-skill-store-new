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
    const student = /答错|错误|出错/.test(item.condition) ? '我做完了，但不知道哪里出错了。' :
      /朗读|停顿|语气/.test(item.condition) ? '这句话我读得不太顺，应该怎么调整？' : '我不确定自己的做法，可以帮我看看吗？';
    const reply = demoSkillReply({ skill, caseId: item.id, messages: [{ role: 'user', content: student }] });
    const followUp = '我试过了，但还有一步不确定。';
    return {
      id: `generated:${item.id}`, title: `情况 ${index + 1}：${item.condition}`,
      material: item.condition,
      start: { student, reply, ...(index < steps.length - 1 ? { choices: [{ student: followUp,
        reply: demoSkillReply({ skill, caseId: item.id, messages: [{ role: 'user', content: student }, { role: 'assistant', content: reply }, { role: 'user', content: followUp }] }),
      }] } : {}) },
    };
  });
}
