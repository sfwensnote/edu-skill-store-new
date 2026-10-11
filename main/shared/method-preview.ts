import type { EducationalSkill } from './assistant';

export type MethodPreviewCase = { id: string; skillId: string; title: string; condition: string; action: string; studentInput: string };

function studentInput(condition: string, index: number): string {
  const quoted = condition.match(/[“「]([^”」]{2,500})[”」]/)?.[1];
  if (quoted) return quoted;
  if (/回顾/.test(condition) && /还是|仍|没有|未|困难/.test(condition))
    return '我已经回顾了自己的思路，但还是没有找到哪里出了问题。';
  if (/提示|帮助|尝试/.test(condition) && /还是|仍|没有|未|困难/.test(condition))
    return '我按刚才的提示试过了，但还是不知道下一步怎么做。';
  if (/证据|依据|原文/.test(condition))
    return /找到|有了|已/.test(condition) && !/没有|未/.test(condition)
      ? '我已经找到了依据，但还说不清它怎样支持我的看法。' : '我有自己的看法，但还没有找到支持它的依据。';
  if (/朗读|停顿|语气/.test(condition)) return '这句话我读得不太顺，不知道应该在哪里停顿。';
  if (/改对|改正|完成纠错|已经理解|已理解/.test(condition)) return '我已经改正了，想再试一次，看看自己是否理解了。';
  if (/还是|仍|再次|第二次/.test(condition)) return '我已经试过一次了，但还是有困难，需要继续帮助。';
  if (/答错|错误|出错/.test(condition)) return '我的答案不对，但我还不知道问题出在哪里。';
  if (/已知|信息|数据|条件/.test(condition)) return '题目中哪些信息需要用到？我还没有理清。';
  return index ? '我试过前面的做法了，但还有不确定的地方。' : '我不确定自己的做法是否正确，可以帮我看看吗？';
}
export function methodPreviewCases(skills: EducationalSkill[]): MethodPreviewCase[] {
  return skills.flatMap((skill) => (
    skill.steps?.length ? skill.steps : skill.behaviorSteps.map((action, index) => ({
      condition: index === 0 ? skill.trigger : `在原触发范围内，需要继续第 ${index + 1} 步时`,
      action,
    }))
  ).map((step, index) => ({
    ...step, id: `${skill.id}:${index}`, skillId: skill.id, title: `${skill.name} · 步骤 ${index + 1}`,
    studentInput: studentInput(step.condition, index),
  })));
}
