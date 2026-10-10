export const teachingCategories = ['课堂提问', '错因辅导', '智能练习', '知识讲解'] as const;
// 旧资料仍可解析，界面不再提供已移除的分类。
export const storedTeachingCategories = [...teachingCategories, '情境任务', '项目式学习'] as const;
export type TeachingCategory = (typeof storedTeachingCategories)[number];
export type CatalogCategory = (typeof teachingCategories)[number] | '未分类';
export const popularTags = ['错因辅导', '智能练习', '知识讲解', '证据追问', '信息提取', '比较与论证'];
export const suggestedTags = [...popularTags, '课堂提问'];
export const maxTeachingTags = 5;
export const maxTagLength = 20;

export function isTeachingCategory(value: unknown): value is (typeof teachingCategories)[number] {
  return teachingCategories.some((category) => category === value);
}
export function isStoredTeachingCategory(value: unknown): value is TeachingCategory {
  return storedTeachingCategories.some((category) => category === value);
}
export function isPblTag(tag: string): boolean {
  return /pbl|项目式(?:学习|教学)|项目(?:学习|反思|指导|设计)|情境(?:任务|探究)|题目情境化|任务链|教学活动/i.test(tag);
}
export function normalizeTeachingTags(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.filter((tag): tag is string => typeof tag === 'string').map((tag) => tag.trim()).filter((tag) => tag && tag.length <= maxTagLength))].slice(0, maxTeachingTags);
}
export function visibleTeachingTags(value: unknown): string[] {
  return normalizeTeachingTags(Array.isArray(value) ? value.filter((tag) => typeof tag === 'string' && !isPblTag(tag)) : value);
}

type TaggedMethod = { category?: TeachingCategory | null; tags?: string[]; name: string; summary: string };
export function teachingCategoryOf(skill: TaggedMethod, scene: string, area = 'daily'): CatalogCategory {
  if (skill.category !== undefined) return isTeachingCategory(skill.category) ? skill.category : '未分类';
  // 仅兼容尚未保存分类的旧作品；教师明确选择或清空后不再推测。
  if (isTeachingCategory(scene)) return scene;
  if (area === 'inquiry' || isPblTag(scene)) return '未分类';
  if (/错题|错因|反思/.test(scene)) return '错因辅导';
  if (/练习|提示/.test(scene)) return '智能练习';
  if (/讲解|理解/.test(scene)) return '知识讲解';
  return '课堂提问';
}
export function teachingTagsOf(skill: TaggedMethod, scene: string, area = 'daily', example = ''): string[] {
  if (skill.tags !== undefined) return visibleTeachingTags(skill.tags);
  const text = `${skill.name} ${skill.summary} ${example}`;
  return visibleTeachingTags([
    teachingCategoryOf(skill, scene, area), scene,
    ...(/证据/.test(text) ? ['证据追问'] : []),
    ...(/提取/.test(text) ? ['信息提取'] : []),
    ...(/比较|论证/.test(text) ? ['比较与论证'] : []),
  ]).filter((tag) => tag !== '未分类');
}
