import type { SkillEntry } from '../../../shared/marketplace';
import { teachingCategories, popularTags, teachingCategoryOf, teachingTagsOf, isPblTag, maxTagLength, type CatalogCategory } from '../../../shared/teaching-tags';
export { teachingCategories, popularTags };

export type CatalogFilters = {
  query: string;
  grade: string;
  subject: string;
  category: string;
  tag: string;
  sort: string;
};
export const defaultCatalogFilters: CatalogFilters = {
  query: '',
  grade: '全部',
  subject: '全部',
  category: '全部方法',
  tag: '',
  sort: 'default',
};

export function categoryOf(entry: SkillEntry): CatalogCategory {
  return teachingCategoryOf(entry.skill, entry.scene, entry.area);
}
export function tagsOf(entry: SkillEntry): string[] {
  const category = categoryOf(entry);
  return [...new Set([
    ...(category === '未分类' ? [] : [category]),
    ...teachingTagsOf(entry.skill, entry.scene, entry.area, entry.example),
  ])];
}
export function catalogBase(entries: SkillEntry[], filters: CatalogFilters): SkillEntry[] {
  const words = filters.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return entries.filter((entry) => {
    const text = [
      entry.skill.name,
      entry.skill.summary,
      entry.example,
      entry.creator,
      ...(isPblTag(entry.scene) ? [] : [entry.scene]),
      ...tagsOf(entry),
    ]
      .join(' ')
      .toLocaleLowerCase();
    return (
      (filters.grade === '全部' || entry.grade === filters.grade) &&
      (filters.subject === '全部' || entry.subject === filters.subject) &&
      (!filters.tag || tagsOf(entry).includes(filters.tag)) &&
      words.every((word) => text.includes(word))
    );
  });
}
export function catalogItems(base: SkillEntry[], filters: CatalogFilters, favorites: string[]): SkillEntry[] {
  const selected = base.filter(
    (entry) =>
      filters.category === '全部方法' ||
      (filters.category === '我收藏的'
        ? favorites.includes(entry.id)
        : categoryOf(entry) === filters.category),
  );
  return filters.sort === 'name'
    ? [...selected].sort((a, b) => a.skill.name.localeCompare(b.skill.name, 'zh-CN'))
    : selected;
}
export function restoreCatalogFilters(raw: string | null): CatalogFilters {
  try {
    const parsed = JSON.parse(raw || '{}');
    const next = { ...defaultCatalogFilters };
    for (const key of Object.keys(next) as (keyof CatalogFilters)[])
      if (typeof parsed?.[key] === 'string') next[key] = parsed[key];
    if (!['全部方法', '我收藏的', '未分类', ...teachingCategories].includes(next.category)) next.category = '全部方法';
    if (next.tag.length > maxTagLength || isPblTag(next.tag)) next.tag = '';
    if (!['default', 'name'].includes(next.sort)) next.sort = 'default';
    return next;
  } catch {
    return { ...defaultCatalogFilters };
  }
}
