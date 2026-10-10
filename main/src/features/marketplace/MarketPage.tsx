import { readSession, writeSession } from '@/lib/session-storage';
import { useEffect, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CircleCheck,
  Filter,
  GraduationCap,
  Heart,
  Search,
  Tag,
  UserRound,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { EmptyState } from '@/components/Workbench';
import type { SkillEntry } from '../../../shared/marketplace';
import { TeachingTagList } from '@/components/TeachingTagsField';
import { teachingTagsOf } from '../../../shared/teaching-tags';
import { skillCreatorLabel, skillValidationLabel } from '../../../shared/skill-display';
import { MarketCategories, categoryIcons } from './MarketCategories';
import {
  catalogBase,
  catalogItems,
  categoryOf,
  defaultCatalogFilters,
  restoreCatalogFilters,
  tagsOf,
  popularTags,
  type CatalogFilters,
} from './market-catalog';
import './market-catalog.css';

const filterKey = 'teaching-method.market-filters';
const scrollKey = 'teaching-method.market-scroll.v1';
export function MarketPage({
  entries,
  favorites,
  addedIds,
  onOpen,
  onAdd,
  onFavorite,
}: {
  entries: SkillEntry[];
  favorites: string[];
  addedIds: string[];
  onOpen: (id: string) => void;
  onAdd: (entry: SkillEntry) => boolean;
  onFavorite: (id: string) => void;
}) {
  const [filters, setFilters] = useState(() => restoreCatalogFilters(readSession(filterKey)));
  const [categoryPanel, setCategoryPanel] = useState(false);
  const base = catalogBase(entries, filters);
  const items = catalogItems(base, filters, favorites);
  const favoriteEmpty =
    filters.category === '我收藏的' && !entries.some((entry) => favorites.includes(entry.id));
  const hasFilters = Object.keys(filters).some(
    (key) => filters[key as keyof CatalogFilters] !== defaultCatalogFilters[key as keyof CatalogFilters],
  );
  function update(patch: Partial<CatalogFilters>) {
    setFilters((current) => ({ ...current, ...patch }));
  }
  useEffect(() => {
    writeSession(filterKey, JSON.stringify(filters));
  }, [filters]);
  useEffect(() => {
    const y = Number(readSession(scrollKey)) || 0;
    const frame = requestAnimationFrame(() => window.scrollTo({ top: Math.max(0, y), behavior: 'instant' }));
    function saveScroll() {
      if (window.location.hash.split('?')[0] === '#/market')
        writeSession(scrollKey, String(window.scrollY));
    }
    window.addEventListener('scroll', saveScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', saveScroll);
    };
  }, []);
  const categories = (mobile = false) => (
    <MarketCategories
      base={base}
      favorites={favorites}
      filters={filters}
      tags={[...new Set([...popularTags, ...entries.flatMap(tagsOf)])]}
      onCategory={(category) => {
        update({ category });
        if (mobile) setCategoryPanel(false);
      }}
      onTag={(tag) => {
        update({ tag });
        if (mobile) setCategoryPanel(false);
      }}
    />
  );
  return (
    <main className="page-frame market-catalog market-page">
      <header className="catalog-heading">
        <div>
          <h1>教学 SKILL 集市</h1>
        </div>
        <img src={`${import.meta.env.BASE_URL}market-learning.svg`} alt="" aria-hidden="true" />
      </header>
      <div className="catalog-filters">
        <label className="catalog-search">
          <Search aria-hidden="true" />
          <input
            aria-label="搜索 SKILL"
            placeholder="搜索方法、标签或作者"
            value={filters.query}
            onChange={(event) => update({ query: event.target.value })}
          />
        </label>
        <div className="catalog-selects">
          <label>
            学段
            <select
              aria-label="学段筛选"
              value={filters.grade}
              onChange={(event) => update({ grade: event.target.value })}
            >
              {['全部', ...new Set(entries.map((entry) => entry.grade))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
          <label>
            学科
            <select
              aria-label="学科筛选"
              value={filters.subject}
              onChange={(event) => update({ subject: event.target.value })}
            >
              {['全部', ...new Set(entries.map((entry) => entry.subject))].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      </div>
      <div className="catalog-layout">
        <aside className="catalog-sidebar">{categories()}</aside>
        <section className="catalog-results" aria-label="教学方法列表">
          <div className="catalog-list-toolbar">
            <Button
              className="catalog-mobile-filter"
              variant="outline"
              onClick={() => setCategoryPanel(true)}
            >
              <Filter data-icon="inline-start" />
              筛选分类
            </Button>
            <span role="status" className="catalog-result-count">
              {items.length} 项方法
            </span>
            <label className="catalog-sort">
              排序
              <select
                aria-label="排序方式"
                value={filters.sort}
                onChange={(event) => update({ sort: event.target.value })}
              >
                <option value="default">默认排序</option>
                <option value="name">名称排序</option>
              </select>
            </label>
          </div>
          {hasFilters && items.length > 0 && (
            <div className="catalog-active-filters">
              {filters.category !== '全部方法' && <span>{filters.category}</span>}
              {filters.tag && <span>{filters.tag}</span>}
              <Button size="sm" variant="ghost" onClick={() => setFilters({ ...defaultCatalogFilters })}>
                <X data-icon="inline-start" />
                清除筛选
              </Button>
            </div>
          )}
          <div className="market-resource-list">
            {items.map((entry) => {
              const category = categoryOf(entry),
                Icon = categoryIcons[category];
              const favorite = favorites.includes(entry.id);
              return (
                <article className="skill-card market-resource-card" key={entry.id}>
                  <div className="catalog-resource-icon" data-category={category}>
                    <Icon aria-hidden="true" />
                  </div>
                  <div className="catalog-resource-body">
                    <div className="catalog-resource-title">
                      <h2>
                        <button onClick={() => onOpen(entry.id)}>{entry.skill.name}</button>
                      </h2>
                    </div>
                    <p className="skill-practice">{entry.example}</p>
                    <TeachingTagList tags={teachingTagsOf(entry.skill, entry.scene, entry.area, entry.example).filter((tag) => tag !== category)} />
                    <div className="card-meta">
                      <span>
                        <UserRound />
                        {skillCreatorLabel(entry)}
                      </span>
                      <span>
                        <GraduationCap />
                        {entry.grade}
                      </span>
                      <span>
                        <BookOpen />
                        {entry.subject}
                      </span>
                      <span>
                        <Tag />
                        {category}
                      </span>
                      <span>
                        <CircleCheck />
                        {skillValidationLabel(entry)}
                      </span>
                    </div>
                  </div>
                  <div className="catalog-resource-actions">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`${favorite ? '取消收藏' : '收藏'}${entry.skill.name}`}
                      aria-pressed={favorite}
                      onClick={() => onFavorite(entry.id)}
                    >
                      <Heart fill={favorite ? 'currentColor' : 'none'} />
                    </Button>
                    <Button variant="outline" onClick={() => onOpen(entry.id)}>
                      查看与试用
                      <ArrowRight data-icon="inline-end" />
                    </Button>
                    <Button disabled={addedIds.includes(entry.id)} onClick={() => onAdd(entry)}>
                      {addedIds.includes(entry.id) ? '已添加' : '添加到我的 SKILL'}
                    </Button>
                  </div>
                </article>
              );
            })}
          </div>
          {!items.length && (
            <EmptyState
              title={!entries.length ? '集市暂无 SKILL' : favoriteEmpty ? '还没有收藏的教学方法' : '没有找到符合条件的教学方法'}
              action={entries.length > 0 &&
                <Button variant="outline" onClick={() => setFilters({ ...defaultCatalogFilters })}>
                  {favoriteEmpty ? '浏览全部方法' : '清除筛选'}
                </Button>
              }
            >
              {entries.length > 0 && !favoriteEmpty && '尝试调整关键词或筛选条件。'}
            </EmptyState>
          )}
        </section>
      </div>
      <Dialog open={categoryPanel} onOpenChange={setCategoryPanel}>
        <DialogContent className="market-filter-dialog">
          <DialogHeader>
            <DialogTitle>筛选分类</DialogTitle>
            <DialogDescription className="sr-only">按分类、收藏或标签筛选。</DialogDescription>
          </DialogHeader>
          {categories(true)}
        </DialogContent>
      </Dialog>
    </main>
  );
}
