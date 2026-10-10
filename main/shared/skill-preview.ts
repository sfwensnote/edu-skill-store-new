import { z } from 'zod';
import { skillSchema, type EducationalSkill } from './assistant';
import { methodPreviewCases } from './method-preview';

export const skillPreviewSchema = z.object({
  skill: skillSchema,
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().trim().min(1).max(2000),
  })).min(1).max(40),
  caseId: z.string().optional(),
}).refine((value) => value.messages.at(-1)?.role === 'user', '最后一条必须是学生输入')
  .refine((value) => !value.caseId || methodPreviewCases([value.skill]).some((item) => item.id === value.caseId),
    '试用情况不存在')
  .refine((value) => value.messages.reduce((size, item) => size + item.content.length, 0) <= 20000,
    '对话过长，请重新开始');
export type SkillPreviewRequest = z.infer<typeof skillPreviewSchema>;

export function compileSkillInstructions(skill: EducationalSkill): string {
  const steps = methodPreviewCases([skill]).map((step, index) =>
    `${index + 1}. 情况：${step.condition}\n做法：${step.action}`).join('\n');
  return `你是一名教学对话助手。将下面的教学 SKILL 用于与学生对话，直接回复学生，不复述方法说明。\n` +
    `SKILL：${skill.name}\n目标：${skill.purpose}\n适用情况：${skill.trigger}\n${steps}\n` +
    `约定：\n${skill.constraints.map((item) => `- ${item}`).join('\n')}\n` +
    '缺少题目或材料时先询问，不编造答案、资料或学生表现。';
}

// Demo 用有限的对话样例呈现挂载效果；不声称执行了真实模型或理解了任意方法。
export function demoSkillReply({ skill, messages, caseId }: SkillPreviewRequest): string {
  const cases = methodPreviewCases([skill]);
  const selected = caseId ? cases.find((item) => item.id === caseId) : cases[0];
  if (!selected) throw new Error('没有找到这项试用情况。');
  const turn = messages.filter((item) => item.role === 'assistant').length;
  const action = cases[Math.min(cases.indexOf(selected) + turn, cases.length - 1)]?.action || selected.action;
  const quoted = action.match(/(?:询问|追问|提问|问|回复|说)[：:，,\s]*[“「]([^”」]{2,500})[”」]/)?.[1];
  if (/不要|避免|不应|不能/.test(action))
    return '当前方法暂不支持这类对话，请查看方法说明或选择其他试用情况。';
  if (quoted) return quoted;
  if (/总结|概括|归纳/.test(action)) return '请用自己的话说说刚才解决问题的关键一步。';
  if (/证据|依据|论证/.test(action)) return '你的判断依据是什么？请指出支持这个判断的信息。';
  if (/信息|单价|固定费用|数据/.test(action)) return '题目给了哪些已知条件？请把它们写出来，并标明单位。';
  if (/朗读|语气|停顿|重音/.test(action)) return '请标出你停顿的位置。再读一遍，比较两种停顿下句子的意思。';
  if (/同类|练习|问题/.test(action) && /独立|检测|确认/.test(`${skill.name} ${action}`))
    return '请提供原题或刚才讨论的内容，我再给你一道同类题。';
  if (/检查|错误位置|纠错|标出.*不确定/.test(action)) return '先标出你不确定的一步，检查这一步是否符合题目条件。你发现了什么？';
  if (/提示|方向|下一步/.test(action)) return '你想达到什么结果？先说说下一步可以尝试什么，我再给你提示。';
  if (/思路|思考|解释|说出|回顾|询问|确认/.test(action))
    return '请把你目前的做法和理由写出来，标出你不确定的地方。';
  return '当前方法暂不支持这类对话，请查看方法说明或选择其他试用情况。';
}
