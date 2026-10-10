import { readSession, writeSession } from '@/lib/session-storage';
import { useEffect, useRef, useState } from 'react';
import { Filter, Search, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Workbench';
import { WorkshopNavigation, WorkshopOverview } from './WorkshopNavigation';
import { WorkshopResourceCard, type WorkActions } from './WorkshopResourceCard';
import { WorkshopDialogs, type PendingRemoval } from './WorkshopDialogs';
import {
  defaultWorkFilters,
  filterWork,
  matchesWork,
  restoreWorkshopSearch,
  workshopCollections,
  workshopTabs,
  type WorkshopFilters,
  type WorkshopTab,
} from './workshop-catalog';
import type { WorkshopProps } from './workshop-types';
import './workshop.css';

const searchKey = 'teaching-method.workshop-filters.v1';
const emptyCopy = {
  skills: ['还没有创建教学 SKILL', '', '创建教学 SKILL'],
  created: ['还没有创建教学 SKILL', '', '创建教学 SKILL'],
  added: ['还没有从集市添加 SKILL', '', '前往教学 SKILL 集市'],
} as const;

export function WorkshopPage(props: WorkshopProps) {
  const tab: WorkshopTab = workshopTabs.some(([key]) => key === props.tab)
    ? (props.tab as WorkshopTab)
    : 'skills';
  const label = workshopTabs.find(([key]) => key === tab)![1];
  const [search, setSearch] = useState(() => restoreWorkshopSearch(readSession(searchKey)));
  const filters = search.panels[tab] || { ...defaultWorkFilters };
  const collections = workshopCollections(props);
  const counts = Object.fromEntries(
    workshopTabs.map(([key]) => [
      key,
      collections[key].filter((item) => matchesWork(item, search.query)).length,
    ]),
  ) as Record<WorkshopTab, number>;
  const items = filterWork(collections[tab], search.query, {
    ...filters,
    query: '',
  });
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const [message, setMessage] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dialogOrigin = useRef<HTMLButtonElement | null>(null);
  const activeFilterCount = (['grade', 'subject', 'sort'] as const).filter(
    (key) => filters[key] !== defaultWorkFilters[key],
  ).length;
  const hasFilters =
    Boolean(search.query) ||
    (['grade', 'subject', 'sort'] as const).some(
      (key) => filters[key as keyof WorkshopFilters] !== defaultWorkFilters[key as keyof WorkshopFilters],
    );
  function update(patch: Partial<WorkshopFilters>) {
    setSearch((current) => ({ ...current, panels: { ...current.panels, [tab]: { ...filters, ...patch } } }));
  }
  function clear() {
    setSearch((current) => ({ query: '', panels: { ...current.panels, [tab]: { ...defaultWorkFilters } } }));
  }
  function switchTab(next: WorkshopTab) {
    setMessage('');
    props.onTab(next);
  }
  useEffect(() => {
    writeSession(searchKey, JSON.stringify(search));
  }, [search]);
  useEffect(() => {
    const key = `teaching-method.workshop-scroll.v1:${tab}`;
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top: Math.max(0, Number(readSession(key)) || 0), behavior: 'instant' }),
    );
    function save() {
      const [path, query] = window.location.hash.split('?');
      const requested = new URLSearchParams(query).get('tab');
      const current = workshopTabs.some(([key]) => key === requested) ? requested : 'skills';
      if ((path === '#/workshop' || path === '#/mine') && current === tab)
        writeSession(key, String(window.scrollY));
    }
    window.addEventListener('scroll', save, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('scroll', save);
    };
  }, [tab]);
  const actions: WorkActions = {
    view: (item) => {
      if (item.kind === 'skill') props.onOpenSkill(item.entry.id);
      else props.onOpenAssistant(item.assistant.id);
    },
    edit: (item) => {
      if (item.kind === 'skill') props.onEditSkill(item.entry);
    },
    trial: (item) => {
      if (item.kind === 'skill') props.onTrialSkill(item.entry);
    },
    copy: (item) => {
      if (item.kind === 'skill' && item.entry.assistantId) props.onCopySkill(item.entry);
    },
    favorite: props.onFavorite,
    share: (item) => { if (item.kind === 'skill') props.onShare(item.entry); },
    mount: (item) => { if (item.kind === 'skill') props.onMount(item.entry); },
    remove: (item, trigger) => {
      dialogOrigin.current = trigger;
      setPending({
        name: item.title,
        removalOnly: item.kind === 'skill' && Boolean(item.entry.addedFrom),
        description: item.kind === 'skill' && item.entry.addedFrom
          ? '只从我的 SKILL 中移除，集市原版保持不变。'
          : item.kind === 'method-draft'
          ? '这份未完成的教学方法草稿也会移除。'
          : '仅移除这一项方法，保留其他 SKILL。',
        action: () => {
          if (item.kind === 'skill') return props.onDeleteSkill(item.entry);
          return props.onDeleteAssistant(item.assistant.id);
        },
      });
    },
  };
  function emptyAction() {
    if (tab === 'added') props.onMarket();
    else props.onCreate();
  }
  const select = (key: 'grade' | 'subject' | 'sort', name: string, options: [string, string][]) => (
    <label className="workshop-filter-field">
      <span>{name}</span>
      <select
        aria-label={`作品${name}`}
        value={filters[key]}
        onChange={(e) => update({ [key]: e.target.value })}
      >
        {options.map(([value, text]) => (
          <option key={value} value={value}>
            {text}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <main className="page-frame market-page workshop-page">
      <header className="workshop-heading">
        <div>
          <h1>我的 SKILL</h1>
        </div>
        <img src={`${import.meta.env.BASE_URL}workshop-folders.svg`} alt="" aria-hidden="true" />
        <div className="workshop-create-actions">
          <Button onClick={props.onCreate}>创建教学 SKILL</Button>
        </div>
      </header>
      <WorkshopOverview collections={collections} tab={tab} onTab={switchTab} />
      <div className="workshop-layout">
        <WorkshopNavigation
          tab={tab}
          counts={counts}
          onTab={switchTab}
        />
        <section className="workshop-content" aria-label="SKILL 管理">
          <div className="workshop-tools">
            <h2>{label}</h2>
            <label className="workshop-search">
              <Search aria-hidden="true" />
              <input
                aria-label="搜索我的 SKILL"
                placeholder="搜索 SKILL 名称、内容或标签……"
                value={search.query}
                onChange={(e) => setSearch((current) => ({ ...current, query: e.target.value }))}
              />
            </label>
            <Button
              className="workshop-mobile-filters"
              variant="outline"
              aria-expanded={filtersOpen}
              aria-controls="workshop-filters"
              onClick={() => setFiltersOpen(!filtersOpen)}
            >
              <Filter aria-hidden="true" />
              筛选{activeFilterCount ? ` · ${activeFilterCount}` : ''}
            </Button>
            <div id="workshop-filters" className="workshop-filter-controls" data-expanded={filtersOpen}>
              {select(
                'grade',
                '学段',
                ['全部', ...new Set(collections[tab].map((item) => item.grade).filter(Boolean))].map((v) => [
                  v,
                  v,
                ]),
              )}
              {select(
                'subject',
                '学科',
                ['全部', ...new Set(collections[tab].map((item) => item.subject).filter(Boolean))].map(
                  (v) => [v, v],
                ),
              )}
              {select('sort', '排序', [
                ['updated', '最近更新'],
                ['created', '最近创建'],
                ['name', '名称'],
              ])}
            </div>
          </div>
          <div className="workshop-list-info">
            <span aria-live="polite">
              {items.length} 项 SKILL
            </span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clear}>
                <X data-icon="inline-start" />
                清除筛选
              </Button>
            )}
          </div>
          {message && (
            <p role="status" className="status-message">
              {message}
            </p>
          )}
          <div className="workshop-resource-list">
            {items.map((item) => (
              <WorkshopResourceCard
                key={item.id}
                item={item}
                tab={tab}
                favorite={props.favorites.includes(item.id)}
                shared={props.shared.includes(item.id)}
                actions={actions}
              />
            ))}
          </div>
          {!items.length && (
            <EmptyState
              title={collections[tab].length ? '没有找到符合条件的 SKILL' : emptyCopy[tab][0]}
              action={
                <Button onClick={collections[tab].length ? clear : emptyAction}>
                  {collections[tab].length ? '清除筛选' : emptyCopy[tab][2]}
                </Button>
              }
            >
              {collections[tab].length ? '尝试调整关键词或筛选条件。' : emptyCopy[tab][1]}
            </EmptyState>
          )}
        </section>
      </div>
      <WorkshopDialogs
        onRestoreFocus={() => {
          if (dialogOrigin.current?.isConnected) dialogOrigin.current.focus();
          else document.getElementById('main-content')?.focus({ preventScroll: true });
        }}
        pending={pending}
        onPending={setPending}
        onMessage={setMessage}
      />
    </main>
  );
}
