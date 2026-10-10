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
  type WorkItem,
  type WorkshopFilters,
  type WorkshopTab,
} from './workshop-catalog';
import type { WorkshopProps } from './workshop-types';
import type { SkillEntry } from '../../../shared/marketplace';
import './workshop.css';
import { draftTitle } from '../../../shared/teaching-activity';

const searchKey = 'teaching-method.workshop-filters.v1';
const emptyCopy = {
  skills: ['还没有创建教学 SKILL', '', '创建教学 SKILL'],
  problems: ['还没有情境题目', '', '设计情境题目'],
  chains: ['还没有任务链', '', '设计情境作品'],
  pbl: ['还没有 PBL 项目', '', '设计情境作品'],
  favorites: ['还没有收藏任何作品', '', '前往教学 SKILL 集市'],
  showcase: ['还没有展示的作品', '在作品的更多菜单中选择“分享展示”。', '查看我的 SKILL'],
  assistants: ['还没有教学助手', '', '创建教学 SKILL'],
} as const;

export function WorkshopPage(props: WorkshopProps) {
  const tab: WorkshopTab = workshopTabs.some(([key]) => key === props.tab)
    ? (props.tab as WorkshopTab)
    : 'skills';
  const label = workshopTabs.find(([key]) => key === tab)![1];
  const [search, setSearch] = useState(() => restoreWorkshopSearch(sessionStorage.getItem(searchKey)));
  const filters = search.panels[tab] || { ...defaultWorkFilters };
  const collections = workshopCollections(props);
  const counts = Object.fromEntries(
    workshopTabs.map(([key]) => [
      key,
      collections[key].filter((item) => matchesWork(item, search.query)).length,
    ]),
  ) as Record<WorkshopTab, number>;
  const areaEnabled = collections[tab].some((item) => item.kind === 'skill' || item.kind === 'method-draft');
  const items = filterWork(collections[tab], search.query, {
    ...filters,
    query: '',
    area: areaEnabled ? filters.area : '全部',
  });
  const [pending, setPending] = useState<PendingRemoval | null>(null);
  const [mount, setMount] = useState<SkillEntry | null>(null);
  const [target, setTarget] = useState('');
  const [message, setMessage] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const dialogOrigin = useRef<HTMLButtonElement | null>(null);
  const activeFilterCount = (['area', 'grade', 'subject', 'sort'] as const).filter(
    (key) => filters[key] !== defaultWorkFilters[key],
  ).length;
  const hasFilters =
    Boolean(search.query) ||
    (['area', 'grade', 'subject', 'sort'] as const).some(
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
    sessionStorage.setItem(searchKey, JSON.stringify(search));
  }, [search]);
  useEffect(() => {
    const key = `teaching-method.workshop-scroll.v1:${tab}`;
    const frame = requestAnimationFrame(() =>
      window.scrollTo({ top: Math.max(0, Number(sessionStorage.getItem(key)) || 0), behavior: 'instant' }),
    );
    function save() {
      const [path, query] = window.location.hash.split('?');
      const current = path === '#/mine' ? 'assistants' : new URLSearchParams(query).get('tab') || 'skills';
      if ((path === '#/workshop' || path === '#/mine') && current === tab)
        sessionStorage.setItem(key, String(window.scrollY));
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
      else if (item.kind === 'design') props.onPreviewDesign(item.design.id, item.level);
      else props.onOpenAssistant(item.assistant.id);
    },
    edit: (item) => {
      if (item.kind === 'skill') props.onEditSkill(item.entry);
      else if (item.kind === 'design') props.onOpenDesign(item.design.id, item.level);
    },
    use: (item) => {
      if (item.kind === 'skill') props.onUseSkill(item.entry);
      else if (item.kind === 'design') props.onUseDesign(item.design, item.level);
    },
    copy: (item) => {
      if (item.kind === 'skill') props.onCopySkill(item.entry);
      else if (item.kind === 'design') props.onCopyDesign(item.design.id, item.level);
    },
    favorite: props.onFavorite,
    share: (item) => {
      if (item.kind === 'skill' && !props.shared.includes(item.id) && item.entry.validation !== '教师已核对' && item.entry.assistantId) {
        props.onOpenAssistant(item.entry.assistantId);
        return;
      }
      if (props.onShare(item.id))
        setMessage(props.shared.includes(item.id) ? '已取消作品展示。' : '已加入当前工作区的作品展示。');
      else setMessage('展示设置保存失败，请释放本机存储空间后重试。');
    },
    mount: (item, trigger) => {
      if (item.kind !== 'skill') return;
      dialogOrigin.current = trigger;
      setMount(item.entry);
      setTarget(
        props.assistants.find((a) => a.id !== item.entry.assistantId && a.skills.length < 8)?.id || '',
      );
    },
    remove: (item, trigger) => {
      dialogOrigin.current = trigger;
      setPending({
        name: item.title,
        description:
          item.kind === 'design'
            ? '这份设计关联的情境题目、任务链和项目也会删除。'
            : item.kind === 'assistant'
              ? '助手及其挂载的 SKILL 会一起移除。'
              : item.kind === 'method-draft'
                ? '这份未完成的教学方法草稿也会移除。'
                : '仅移除这一项方法，保留助手中的其他 SKILL。',
        action: () => {
          if (item.kind === 'skill') return props.onDeleteSkill(item.entry);
          if (item.kind === 'design') return props.onDeleteDesign(item.design.id);
          return props.onDeleteAssistant(item.assistant.id);
        },
      });
    },
  };
  function emptyAction() {
    if (tab === 'favorites') props.onMarket();
    else if (tab === 'showcase') switchTab('skills');
    else if (tab === 'skills' || tab === 'assistants') props.onCreate();
    else props.onInquiry();
  }
  const select = (key: 'area' | 'grade' | 'subject' | 'sort', name: string, options: [string, string][]) => (
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
          <h1>我的作品</h1>
        </div>
        <img src={`${import.meta.env.BASE_URL}workshop-folders.svg`} alt="" aria-hidden="true" />
        <div className="workshop-create-actions">
          <Button variant="outline" onClick={props.onInquiry}>
            设计情境作品
          </Button>
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
        <section className="workshop-content" aria-label="作品管理">
          <div className="workshop-tools">
            <h2>{label}</h2>
            <label className="workshop-search">
              <Search aria-hidden="true" />
              <input
                aria-label="搜索我的作品"
                placeholder="搜索作品名称、内容或标签……"
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
              {areaEnabled &&
                select('area', '板块', [
                  ['全部', '全部'],
                  ...[...new Set(collections[tab].map((item) => item.area).filter(Boolean))].map(
                    (area): [string, string] => [area!, area === 'daily' ? '日常教学' : '情境探究'],
                  ),
                ])}
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
              {items.length} {tab === 'assistants' ? '个助手' : '项作品'}
            </span>
            {hasFilters && (
              <Button variant="ghost" size="sm" onClick={clear}>
                <X data-icon="inline-start" />
                清除筛选
              </Button>
            )}
            {tab === 'showcase' && <span>展示仅在当前工作区可见</span>}
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
              title={collections[tab].length ? '没有找到符合条件的作品' : emptyCopy[tab][0]}
              action={
                <Button onClick={collections[tab].length ? clear : emptyAction}>
                  {collections[tab].length ? '清除筛选' : emptyCopy[tab][2]}
                </Button>
              }
            >
              {collections[tab].length ? '尝试调整关键词或筛选条件。' : emptyCopy[tab][1]}
            </EmptyState>
          )}
          {tab === 'skills' && !!props.skillApplications?.length && <details className="workshop-method-archive">
            <summary>SKILL 应用配置</summary>
            {props.skillApplications.map((draft) => <div key={draft.id}>
              <span>{draftTitle(draft, props.allEntries)}</span>
              <Button variant="outline" size="sm" onClick={() => props.onResumeApplication?.(draft.id)}>继续配置</Button>
            </div>)}
          </details>}
          {tab === 'skills' && !!props.methodTrials?.length && <details className="workshop-method-archive">
            <summary>历史方法试用</summary>
            {props.methodTrials.map((trial) => <div key={trial.id}>
              <span>{trial.skill?.skill.name || trial.title}</span>
              <Button variant="outline" size="sm" onClick={() => props.onOpenMethodTrial?.(trial.id)}>查看试用记录</Button>
            </div>)}
          </details>}
        </section>
      </div>
      <WorkshopDialogs
        onRestoreFocus={() => {
          if (dialogOrigin.current?.isConnected) dialogOrigin.current.focus();
          else document.getElementById('main-content')?.focus({ preventScroll: true });
        }}
        pending={pending}
        onPending={setPending}
        mount={mount}
        onMountEntry={setMount}
        assistants={props.assistants}
        target={target}
        onTarget={setTarget}
        onMount={props.onMount}
        onMessage={setMessage}
      />
    </main>
  );
}
