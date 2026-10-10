import { z } from 'zod';
import { defaultCreationDraft, methodError, type TeachingMethod } from './teaching-method';
import { teachingCategories } from './teaching-tags';
import { detectionCaseSchema, detectionSchema } from './skill-detection';

export const skillWorkspaceKey = 'teaching-skill.workspace.v1';

const methodSchema = z.object({
  name: z.string().optional(), description: z.string().optional(),
  category: z.enum(teachingCategories).nullable().optional(), tags: z.array(z.string()).optional(),
  problem: z.string(), expectedOutcome: z.string(), trigger: z.string(),
  teachingSteps: z.array(z.object({ condition: z.string(), action: z.string() })),
  principles: z.array(z.string()),
});
const contextSchema = z.object({ inputs: z.string(), exclusions: z.string() });
const draftSchema = z.object({
  originalIdea: z.string(), exampleIdea: z.boolean().optional(), grade: z.string(), subject: z.string(),
  teachingScene: z.string(), stage: z.enum(['idea', 'method', 'preview']), method: methodSchema,
  conversation: z.array(z.object({ questionId: z.string(), question: z.string(), answer: z.string() })),
  questionIndex: z.number().int().min(0).max(6), manualEdits: z.array(z.string()),
  pendingAnswer: z.object({ questionId: z.string(), value: z.string() }).optional(),
  pendingSupplement: z.object({ condition: z.string(), action: z.string() }).optional(),
});
const contentSchema = z.object({
  method: methodSchema, context: contextSchema, grade: z.string(), subject: z.string(), experience: z.string(),
});
const recordSchema = z.object({
  id: z.string().min(1), draft: draftSchema, context: contextSchema,
  content: contentSchema.optional(), revision: z.number().int().min(0),
  source: z.object({ label: z.string(), skillId: z.string().optional(), revision: z.number().optional() }),
  checks: z.object({ revision: z.number(), items: z.array(z.string()) }).optional(),
  review: z.object({ revision: z.number(), checkedAt: z.string() }).optional(),
  detection: detectionSchema.optional(),
  detectionDraft: z.object({ revision: z.number().int().min(1),
    cases: z.array(detectionCaseSchema.extend({ input: z.string().max(2000) })) }).optional(),
  publication: z.object({ revision: z.number().int().min(1), publishedAt: z.string(), mode: z.literal('demo') }).optional(),
  createdAt: z.string(), updatedAt: z.string(),
});
const workspaceSchema = z.object({ version: z.literal(1), skills: z.array(recordSchema) });

export type SkillContext = z.infer<typeof contextSchema>;
export type SkillContent = { method: TeachingMethod; context: SkillContext; grade: string; subject: string; experience: string };
export type SkillRecord = z.infer<typeof recordSchema>;
export type SkillWorkspace = z.infer<typeof workspaceSchema>;

export function skillContentSignature(content: SkillContent): string {
  return JSON.stringify(contentSchema.parse(content));
}

export function readSkillWorkspace(raw: string | null): SkillWorkspace {
  if (raw === null) return { version: 1, skills: [] };
  const workspace = workspaceSchema.parse(JSON.parse(raw));
  if (new Set(workspace.skills.map((item) => item.id)).size !== workspace.skills.length)
    throw new Error('SKILL 标识重复');
  for (const record of workspace.skills) {
    if (!record.content) {
      if (record.revision !== 0 || record.review || record.checks || record.detection || record.detectionDraft || record.publication) throw new Error('草稿版本不一致');
      continue;
    }
    if (record.revision < 1 || methodError(record.content.method) || !record.content.method.category ||
      !record.content.method.name?.trim() || !record.content.method.principles.some((item) => item.trim()) ||
      !record.content.context.inputs.trim() || !record.content.context.exclusions.trim())
      throw new Error('SKILL 内容不完整');
    if ((record.review && record.review.revision !== record.revision) ||
      (record.checks && record.checks.revision !== record.revision)) throw new Error('核对版本不一致');
    if (record.review && !skillCheckItems(record).every((item) => record.checks?.items.includes(item.id)))
      throw new Error('核对记录不完整');
    if (record.detection && (record.detection.revision !== record.revision ||
      record.detection.contentSignature !== skillContentSignature(record.content))) throw new Error('检测版本不一致');
    if (record.detectionDraft && record.detectionDraft.revision !== record.revision) throw new Error('检测草稿版本不一致');
    if (record.publication && (record.publication.revision !== record.revision || !isSkillDetectionPassed(record)))
      throw new Error('发布版本不一致');
  }
  return workspace;
}

export function newSkillRecord(id: string, now: string): SkillRecord {
  const draft = defaultCreationDraft();
  return {
    id, draft: { ...draft, originalIdea: '', exampleIdea: false, method: { ...draft.method, category: null } },
    context: { inputs: '', exclusions: '' }, revision: 0, source: { label: '教师录入的经验' },
    createdAt: now, updatedAt: now,
  };
}

export function contentFromDraft(record: SkillRecord): SkillContent {
  return structuredClone({
    method: record.draft.method, context: record.context,
    grade: record.draft.grade, subject: record.draft.subject, experience: record.draft.originalIdea,
  });
}

export function hasSkillChanges(record: SkillRecord): boolean {
  return Boolean(record.content && JSON.stringify(contentFromDraft(record)) !== JSON.stringify(record.content));
}

export function skillContentError(record: SkillRecord): string {
  if (!record.draft.method.name?.trim()) return '请为 SKILL 填写名称。';
  if (!record.draft.method.category) return '请选择教学分类。';
  const error = methodError(record.draft.method);
  if (error) return error;
  if (!record.draft.method.principles.some((item) => item.trim())) return '请至少写明一条教学原则。';
  if (!record.context.inputs.trim() || !record.context.exclusions.trim())
    return '请补充使用前需要的信息，以及不适用或需要教师介入的情况。';
  if (record.draft.pendingAnswer?.value.trim()) return '请先提交当前回答，或清空未提交的回答。';
  if (record.draft.pendingSupplement &&
      (record.draft.pendingSupplement.condition.trim() || record.draft.pendingSupplement.action.trim()))
    return '请先保存或取消补充的情况。';
  return '';
}

// 编辑草稿与形成版本分开；只有内容变化才升级版本并使旧核对失效。
export function formSkill(record: SkillRecord, now: string): SkillRecord {
  const error = skillContentError(record);
  if (error) throw new Error(error);
  const content = contentFromDraft(record);
  if (record.content && !hasSkillChanges(record)) return { ...record, updatedAt: now };
  return { ...record, content, revision: record.revision + 1, checks: undefined, review: undefined,
    detection: undefined, detectionDraft: undefined, publication: undefined, updatedAt: now };
}

export function skillCheckItems(record: SkillRecord) {
  if (!record.content) return [];
  return [
    { id: 'scope', label: '目标、所需信息和不适用情况已经写清楚' },
    ...record.content.method.teachingSteps.map((_, index) => ({
      id: `step-${index}`, label: `情况 ${index + 1} 的判断与做法符合我的教学意图`,
    })),
    { id: 'principles', label: '教学原则及结束、转交的边界符合我的要求' },
  ];
}

export function isSkillReviewed(record: SkillRecord): boolean {
  return Boolean(record.content && record.review?.revision === record.revision);
}

export function confirmSkillReview(record: SkillRecord, now: string): SkillRecord {
  if (!record.content || hasSkillChanges(record)) throw new Error('请先形成当前修改后的 SKILL，再核对。');
  const checked = record.checks?.revision === record.revision ? record.checks.items : [];
  if (!skillCheckItems(record).every((item) => checked.includes(item.id)))
    throw new Error('请逐项阅读并核对当前版本。');
  return { ...record, review: { revision: record.revision, checkedAt: now }, updatedAt: now };
}

export function isSkillDetectionPassed(record: SkillRecord): boolean {
  const detection = record.detection;
  const expectedIds = [...(record.content?.method.teachingSteps.map((_, index) => `step-${index}`) || []), 'missing-input'];
  return Boolean(record.content && isSkillReviewed(record) && detection &&
    detection.revision === record.revision && detection.contentSignature === skillContentSignature(record.content) &&
    detection.cases.length === expectedIds.length && new Set(detection.cases.map((item) => item.id)).size === expectedIds.length &&
    expectedIds.every((id) => detection.cases.some((item) => item.id === id)) && detection.cases.every((item) => item.status === 'pass'));
}

export function isSkillPublished(record: SkillRecord): boolean {
  return Boolean(record.publication?.revision === record.revision && isSkillDetectionPassed(record));
}

export function publishSkill(record: SkillRecord, now: string): SkillRecord {
  if (hasSkillChanges(record)) throw new Error('请先形成修改后的版本，重新核对与检测。');
  if (!isSkillReviewed(record)) throw new Error('请先完成教师核对。');
  if (!isSkillDetectionPassed(record)) throw new Error('请先完成当前版本的 LLM 检测，并处理未通过的情境。');
  return { ...record, publication: { revision: record.revision, publishedAt: now, mode: 'demo' }, updatedAt: now };
}

export function copySkill(source: SkillRecord, id: string, now: string): SkillRecord {
  if (!source.content) throw new Error('请先形成 SKILL，再复用。');
  const content = structuredClone(source.content);
  return {
    ...newSkillRecord(id, now),
    draft: { ...defaultCreationDraft(), originalIdea: content.experience, exampleIdea: false,
      grade: content.grade, subject: content.subject, teachingScene: content.method.category || '',
      stage: 'method', method: content.method, questionIndex: 6 },
    context: content.context,
    source: { label: source.content.method.name || '已有 SKILL', skillId: source.id, revision: source.revision },
  };
}

export function skillMethodMarkdown(record: SkillRecord): string {
  if (!record.content) throw new Error('请先形成 SKILL。');
  const { method, context, grade, subject, experience } = record.content;
  return [
    `# ${method.name}`, '', '教学方法说明（Demo）', '',
    `SKILL 标识：${record.id}`, `版本：v${record.revision}`,
    `适用教学范围：${grade} / ${subject}`, `来源：${record.source.label}`,
    ...(record.source.skillId ? [`来源标识：${record.source.skillId} / v${record.source.revision}`] : []),
    `教师核对：${isSkillReviewed(record) ? `已核对 v${record.revision}` : '待核对'}`,
    `LLM 检测：${record.detection ? (isSkillDetectionPassed(record) ? '演示检测通过' : '演示检测需调整') : '尚未检测'}`,
    '检测返回为 Demo 演示数据，不代表真实模型执行或教学效果验证。', '',
    '## 经验来源', experience, '', '## 教学问题', method.problem, '',
    '## 学习目标', method.expectedOutcome, '', '## 使用前需要', context.inputs, '',
    '## 开始条件', method.trigger, '', '## 条件与做法',
    ...method.teachingSteps.flatMap((step, index) => [
      '', `### 情况 ${index + 1}`, `判断条件：${step.condition}`, `采取行动：${step.action}`,
    ]), '', '## 教学原则', ...method.principles.filter((item) => item.trim()).map((item) => `- ${item}`), '',
    '## 不适用与教师介入', context.exclusions, '',
    '## AI 使用说明',
    '先获取所需信息，再检查开始条件与对应分支；信息不足时先澄清，不自行假定学生状态。',
    '遵守上述教学原则；需要现场观察或人工判断的部分由教师处理。',
    '## 自行挂载',
    '下载本说明后，按目标平台支持的方式添加到提示词、知识文件或技能配置中。',
    '补充所需教学材料及上下文，并在目标模型上自行验证触发条件、具体做法和教学边界。',
    '不同平台支持的文件格式与能力不同；本说明不代表已自动完成挂载。', '',
  ].join('\n');
}

export function skillMountMarkdown(record: SkillRecord): string {
  if (!record.content) throw new Error('请先形成 SKILL。');
  const name = `teaching-${record.id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '') || 'method'}`.slice(0, 64).replace(/-+$/, '');
  const description = record.content.method.description || record.content.method.name || '教学方法';
  return `---\nname: ${name}\ndescription: ${JSON.stringify(description)}\n---\n\n${skillMethodMarkdown(record)}`;
}
