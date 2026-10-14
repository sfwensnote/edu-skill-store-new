import { z } from 'zod';
import { methodInputSchema, methodSteps } from './execution';
import type { EducationalSkill } from './assistant';

export function methodMarkdown(skill: EducationalSkill): string {
  return ['---', `name: ${JSON.stringify(skill.name)}`, `description: ${JSON.stringify(skill.description || skill.summary)}`, '---', '',
    `# ${skill.name}`, '', '## 教学目标', skill.purpose, '', '## 想解决的问题', skill.problem || skill.purpose,
    '', '## 开始条件', skill.trigger, '', '## 教学步骤',
    ...methodSteps(skill).flatMap((step, index) => [`### 步骤 ${index + 1}`, `适用条件：${step.condition}`, step.action, '']),
    '## 教学原则与结束条件', ...skill.constraints.map(item => `- ${item}`), '',
    '## 执行要求', '依据当前对话判断是否满足开始条件，按教师填写的步骤和原则回应；达到结束条件时收束或转交教师。不要把教学方法当作训练结果，不要编造学习效果。', ''].join('\n');
}

export const chatMessageSchema = z.object({ id: z.string(), role: z.enum(['user', 'assistant']), content: z.string().min(1).max(16000), at: z.string() });
export const methodChatRecordSchema = z.object({ id: z.string(), method: methodInputSchema, fingerprint: z.string(), model: z.string().min(1),
  messages: z.array(chatMessageSchema).min(2).max(40), createdAt: z.string(), updatedAt: z.string(), confirmedAt: z.string().optional() });
export type MethodChatMessage = z.infer<typeof chatMessageSchema>;
export type MethodChatRecord = z.infer<typeof methodChatRecordSchema>;

export function completeChat(messages: MethodChatMessage[]) {
  return messages.length >= 2 && messages.length % 2 === 0 && messages.every((message, index) => message.role === (index % 2 === 0 ? 'user' : 'assistant'));
}
