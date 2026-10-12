import { z } from 'zod';
import type { SkillEntry } from './marketplace';

export { companionsKey } from './workspace-keys';
const materialSchema = z.object({ id: z.string(), name: z.string(), type: z.string(), size: z.number(), data: z.string(), text: z.string() });
export type CompanionMaterial = z.infer<typeof materialSchema>;
const legacyTaskSchema = z.object({ title: z.string(), audience: z.string(), subject: z.string(), duration: z.string(),
  goals: z.string(), priorKnowledge: z.string(), instructions: z.string(), deliverable: z.string(), assessment: z.string() });
export const taskFields = [['audience', '学习对象'], ['scenario', '学习情境'], ['taskAndGoals', '学习任务与目标']] as const;
const taskSchema = z.object({ audience: z.string(), scenario: z.string(), taskAndGoals: z.string() });
export type CompanionTask = z.infer<typeof taskSchema>;
export const learningAudiences = ['全班学生', '学习小组', '个别学生'] as const;
export const learningScenarios = ['课堂学习', '课后练习', '自主学习', '复习巩固'] as const;
export const companionSteps = [
  { step: 1, label: '基本信息', caption: '学伴的身份与定位' },
  { step: 2, label: '选择 SKILL', caption: '挂载教学方法' },
  { step: 3, label: '教学场景', caption: '设置学习对象与任务' },
  { step: 4, label: '预览与保存', caption: '确认并完成创建' },
] as const;
const stepSchema = z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]);
export type CompanionStep = z.infer<typeof stepSchema>;
const designSchema = z.object({ contextual: z.boolean(), context: z.string(), question: z.string(),
  pbl: z.boolean(), drivingQuestion: z.string(), product: z.string(), stages: z.string() });
export type CompanionDesign = z.infer<typeof designSchema>;
export const companionSchema = z.object({
  version: z.literal(2), id: z.string(), name: z.string(), introduction: z.string(), grade: z.string(), subject: z.string(), year: z.string(),
  avatar: z.enum(['default', 'lively', 'simple', 'custom']), avatarImage: z.string(),
  skillIds: z.array(z.string()), caseId: z.string().optional(), step: stepSchema,
  status: z.enum(['draft', 'ready']), task: taskSchema, design: designSchema,
  materials: z.array(materialSchema), updatedAt: z.string(),
});
export type LearningCompanion = z.infer<typeof companionSchema>;
export function newCompanion(id: string, skillId?: string): LearningCompanion {
  return { version: 2, id, name: '', introduction: '', grade: '初中', subject: '任意学科', year: '', avatar: 'default', avatarImage: '',
    skillIds: skillId ? [skillId] : [], step: 1, status: 'draft',
    task: { audience: '', scenario: '', taskAndGoals: '' },
    design: { contextual: false, context: '', question: '', pbl: false, drivingQuestion: '', product: '', stages: '' },
    materials: [], updatedAt: new Date().toISOString() };
}
export function readCompanions(raw: string | null): LearningCompanion[] {
  if (raw === null) return [];
  const legacySchema = z.object({
    version: z.undefined().optional(), id: z.string(), name: z.string(), skillIds: z.array(z.string()), step: z.union([z.literal(1), z.literal(2)]),
    status: z.enum(['draft', 'ready']), task: legacyTaskSchema, design: designSchema,
    materials: z.array(materialSchema), updatedAt: z.string(),
  }).transform((old): LearningCompanion => ({
    ...newCompanion(old.id), id: old.id, name: old.name, skillIds: old.skillIds, grade: '',
    materials: old.materials, updatedAt: old.updatedAt,
  }));
  return z.array(z.union([companionSchema, legacySchema])).parse(JSON.parse(raw));
}
export function companionIssue(value: LearningCompanion, skills: Pick<SkillEntry, 'id'>[], throughStep: CompanionStep = 4) {
  if (!value.name.trim()) return '请填写学伴名称。';
  if (!value.introduction.trim()) return '请填写学伴简介。';
  if (!value.grade.trim() || !value.subject.trim()) return '请选择学段和学科。';
  if (throughStep === 1) return '';
  if (!value.skillIds.length) return '请从我的 SKILL 中选择至少一项方法。';
  if (value.skillIds.some(id => !skills.some(entry => entry.id === id))) return '所选 SKILL 已移除，请重新选择。';
  if (throughStep === 2) return '';
  for (const [key, label] of taskFields) if (!value.task[key].trim()) return key === 'taskAndGoals' ? `请填写${label}。` : `请选择${label}。`;
  if (value.design.contextual && (!value.design.context.trim() || !value.design.question.trim())) return '请填写教学情景和情景题目。';
  if (value.design.pbl && (!value.design.drivingQuestion.trim() || !value.design.product.trim() || !value.design.stages.trim())) return '请填写 PBL 的驱动问题、项目成果和活动阶段。';
  return '';
}
// 只整理教师提供的任务与材料，留作模型接入上下文，不伪造理解或生成结果。
export function companionContext(value: LearningCompanion, skills: SkillEntry[]) {
  const selected = value.skillIds.map(id => skills.find(entry => entry.id === id)).filter((entry): entry is SkillEntry => !!entry);
  return [
    `学伴：${value.name}`,
    `学伴简介：${value.introduction}`,
    `适用范围：${[value.grade, value.subject, value.year].filter(Boolean).join(' · ')}`,
    ...taskFields.map(([key, label]) => `${label}：${value.task[key]}`),
    ...selected.map(entry => [`教学方法：${entry.skill.name}`, `开始条件：${entry.skill.trigger}`,
      ...(entry.skill.steps || []).map(step => `情况：${step.condition}\n教师做法：${step.action}`),
      ...entry.skill.constraints].join('\n')),
    ...(value.design.contextual ? [`教学情景：${value.design.context}`, `情景题目：${value.design.question}`] : []),
    ...(value.design.pbl ? [`驱动问题：${value.design.drivingQuestion}`, `项目成果：${value.design.product}`, `活动阶段：${value.design.stages}`] : []),
    ...value.materials.map(item => `教学材料：${item.name}${item.text ? `\n${item.text}` : '（附件）'}`),
  ].join('\n\n');
}
