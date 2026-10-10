import {
  BookOpen,
  ChartNoAxesColumnIncreasing,
  CircleHelp,
  Compass,
  MessageCircle,
  Star,
} from 'lucide-react';
import type { SkillEntry } from '../../../shared/marketplace';
import { categoryOf, popularTags, teachingCategories, type CatalogFilters } from './market-catalog';

export const categoryIcons = {
  课堂提问: CircleHelp,
  错因辅导: MessageCircle,
  智能练习: ChartNoAxesColumnIncreasing,
  知识讲解: BookOpen,
  未分类: Compass,
};

export function MarketCategories({
  base,
  favorites,
  filters,
  onCategory,
  onTag,
  tags = popularTags,
}: {
  base: SkillEntry[];
  favorites: string[];
  filters: CatalogFilters;
  onCategory: (category: string) => void;
  onTag: (tag: string) => void;
  tags?: string[];
}) {
  const rows = [
    { label: '全部方法', icon: Compass, count: base.length },
    { label: '我收藏的', icon: Star, count: base.filter((entry) => favorites.includes(entry.id)).length },
    ...teachingCategories.map((label) => ({
      label,
      icon: categoryIcons[label],
      count: base.filter((entry) => categoryOf(entry) === label).length,
    })),
    ...(base.some((entry) => categoryOf(entry) === '未分类') ? [{ label: '未分类', icon: Compass, count: base.filter((entry) => categoryOf(entry) === '未分类').length }] : []),
  ];
  const item = ({ label, icon: Icon, count }: (typeof rows)[number]) => (
    <button
      key={label}
      type="button"
      className={filters.category === label ? 'active' : ''}
      aria-pressed={filters.category === label}
      onClick={() => onCategory(label)}
    >
      <Icon aria-hidden="true" />
      <span>{label}</span>
      <small aria-label={`${count} 项方法`}>{count}</small>
    </button>
  );
  return (
    <div className="market-categories">
      <nav aria-label="集市个人导航">{rows.slice(0, 2).map(item)}</nav>
      <nav aria-label="教学分类">
        <h2>教学分类</h2>
        {rows.slice(2).map(item)}
      </nav>
      <section className="catalog-tags" aria-label="热门标签">
        <h2>热门标签</h2>
        <div>
          {tags.map((tag) => (
            <button
              key={tag}
              type="button"
              aria-pressed={filters.tag === tag}
              className={filters.tag === tag ? 'active' : ''}
              onClick={() => onTag(filters.tag === tag ? '' : tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
