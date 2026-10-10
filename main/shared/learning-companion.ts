import { z } from 'zod';
import type { SkillEntry } from './marketplace';

export const companionsKey = 'teaching-method.companions.v1';
const materialSchema = z.object({ id: z.string(), name: z.string(), type: z.string(), size: z.number(), data: z.string(), text: z.string() });
export type CompanionMaterial = z.infer<typeof materialSchema>;
export const taskFields = [
  ['title', '教学任务名称'], ['audience', '学习对象'], ['subject', '学科'], ['duration', '课时安排'],
  ['goals', '学习目标'], ['priorKnowledge', '学情与已有基础'], ['instructions', '学习任务'],
  ['deliverable', '学习成果'], ['assessment', '评价要求'],
] as const;
const taskSchema = z.object({ title: z.string(), audience: z.string(), subject: z.string(), duration: z.string(),
  goals: z.string(), priorKnowledge: z.string(), instructions: z.string(), deliverable: z.string(), assessment: z.string() });
export type CompanionTask = z.infer<typeof taskSchema>;
const designSchema = z.object({ contextual: z.boolean(), context: z.string(), question: z.string(),
  pbl: z.boolean(), drivingQuestion: z.string(), product: z.string(), stages: z.string() });
export type CompanionDesign = z.infer<typeof designSchema>;
const companionSchema = z.object({
  id: z.string(), name: z.string(), skillIds: z.array(z.string()), step: z.union([z.literal(1), z.literal(2)]),
  status: z.enum(['draft', 'ready']), task: taskSchema, design: designSchema,
  materials: z.array(materialSchema), updatedAt: z.string(),
});
export type LearningCompanion = z.infer<typeof companionSchema>;
export function newCompanion(id: string, skillId?: string): LearningCompanion {
  return { id, name: '', skillIds: skillId ? [skillId] : [], step: 1, status: 'draft',
    task: { title: '', audience: '', subject: '', duration: '', goals: '', priorKnowledge: '', instructions: '', deliverable: '', assessment: '' },
    design: { contextual: false, context: '', question: '', pbl: false, drivingQuestion: '', product: '', stages: '' },
    materials: [], updatedAt: new Date().toISOString() };
}
export function readCompanions(raw: string | null): LearningCompanion[] {
  return raw === null ? [] : z.array(companionSchema).parse(JSON.parse(raw));
}
export function companionIssue(value: LearningCompanion, skills: SkillEntry[], complete = false) {
  if (!value.name.trim()) return '请填写学伴名称。';
  if (!value.skillIds.length) return '请从我的 SKILL 中选择至少一项方法。';
  if (value.skillIds.some(id => !skills.some(entry => entry.id === id))) return '所选 SKILL 已移除，请重新选择。';
  if (!complete) return '';
  for (const [key, label] of taskFields) if (!value.task[key].trim()) return `请填写${label}。`;
  if (value.design.contextual && (!value.design.context.trim() || !value.design.question.trim())) return '请填写教学情景和情景题目。';
  if (value.design.pbl && (!value.design.drivingQuestion.trim() || !value.design.product.trim() || !value.design.stages.trim())) return '请填写 PBL 的驱动问题、项目成果和活动阶段。';
  return '';
}
// 只整理教师提供的任务与材料，留作模型接入上下文，不伪造理解或生成结果。
export function companionContext(value: LearningCompanion, skills: SkillEntry[]) {
  const selected = value.skillIds.map(id => skills.find(entry => entry.id === id)).filter((entry): entry is SkillEntry => !!entry);
  return [
    `学伴：${value.name}`,
    ...taskFields.map(([key, label]) => `${label}：${value.task[key]}`),
    ...selected.map(entry => [`教学方法：${entry.skill.name}`, `开始条件：${entry.skill.trigger}`,
      ...(entry.skill.steps || []).map(step => `${step.condition}：${step.action}`),
      ...entry.skill.constraints].join('\n')),
    ...(value.design.contextual ? [`教学情景：${value.design.context}`, `情景题目：${value.design.question}`] : []),
    ...(value.design.pbl ? [`驱动问题：${value.design.drivingQuestion}`, `项目成果：${value.design.product}`, `活动阶段：${value.design.stages}`] : []),
    ...value.materials.map(item => `教学材料：${item.name}${item.text ? `\n${item.text}` : '（附件）'}`),
  ].join('\n\n');
}
