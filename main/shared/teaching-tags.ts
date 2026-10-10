export const teachingCategories = ['课堂提问', '错因辅导', '智能练习', '知识讲解', '情境任务', '项目式学习'] as const;
export type TeachingCategory = (typeof teachingCategories)[number];
export type CatalogCategory = TeachingCategory | '未分类';
export const popularTags = ['错因辅导', '智能练习', '知识讲解', '情境任务指导', 'PBL 项目反思', '证据追问', '信息提取', '比较与论证'];
export const suggestedTags = [...popularTags, '课堂提问', '题目情境化', '任务链设计', 'PBL 项目'];
export const maxTeachingTags = 5;
export const maxTagLength = 20;

export function isTeachingCategory(value: unknown): value is TeachingCategory {
  return teachingCategories.includes(value as TeachingCategory);
}
export function normalizeTeachingTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter((tag) => tag && tag.length <= maxTagLength))].slice(0, maxTeachingTags);
}

type TaggedMethod = { category?: TeachingCategory | null; tags?: string[]; name: string; summary: string };
export function teachingCategoryOf(skill: TaggedMethod, scene: string, area = 'daily'): CatalogCategory {
  if (skill.category !== undefined) return isTeachingCategory(skill.category) ? skill.category : '未分类';
  // 仅兼容尚未保存分类的旧作品；教师明确选择或清空后不再推测。
  if (isTeachingCategory(scene)) return scene;
  if (area === 'inquiry') return /PBL|项目/.test(scene) ? '项目式学习' : '情境任务';
  if (/错题|错因|反思/.test(scene)) return '错因辅导';
  if (/练习|提示/.test(scene)) return '智能练习';
  if (/讲解|理解/.test(scene)) return '知识讲解';
  return '课堂提问';
}
export function teachingTagsOf(skill: TaggedMethod, scene: string, area = 'daily', example = ''): string[] {
  if (skill.tags !== undefined) return normalizeTeachingTags(skill.tags);
  const text = `${skill.name} ${skill.summary} ${example}`;
  return normalizeTeachingTags([
    teachingCategoryOf(skill, scene, area), scene,
    ...(/证据/.test(text) ? ['证据追问'] : []),
    ...(/提取/.test(text) ? ['信息提取'] : []),
    ...(/比较|论证/.test(text) ? ['比较与论证'] : []),
  ]).filter((tag) => tag !== '未分类');
}
