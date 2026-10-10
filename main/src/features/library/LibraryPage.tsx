import { Search, SlidersHorizontal, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import { filterAssistants, type TeachingAssistant } from '../../../shared/assistant';
import { AssistantList } from './AssistantList';

const groups = [
  { key: 'grade', label: '学段', values: ['全部', '小学', '初中', '高中'] },
  {
    key: 'subject',
    label: '学科',
    values: ['全部', '数学', '语文', '英语', '物理', '化学', '生物', '历史', '地理', '科学'],
  },
  {
    key: 'activity',
    label: '活动',
    values: [
      '全部',
      '课堂练习',
      '阅读',
      '写作',
      '实验探究',
      '作业讲评',
      '错因诊断',
      '思路引导',
      '分层练习',
      '学习检测',
    ],
  },
] as const;

export function LibraryPage({
  assistants,
  onOpen,
}: {
  assistants: TeachingAssistant[];
  onOpen: (assistantId: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState({ grade: '全部', subject: '全部', activity: '全部' });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const items = useMemo(
    () =>
      filterAssistants(
        assistants.map((assistant) => ({ ...assistant, skillCount: assistant.skills.length })),
        { query, ...filters },
      ),
    [assistants, query, filters],
  );
  const filtered = query || Object.values(filters).some((value) => value !== '全部');
  return (
    <main className="library-page page-frame">
      <aside className={`filter-rail ${filtersOpen ? 'open' : ''}`} aria-label="助手筛选">
        <div className="mobile-filter-head">
          <strong>筛选助手</strong>
          <button onClick={() => setFiltersOpen(false)} aria-label="关闭筛选">
            <X />
          </button>
        </div>
        {groups.map((group) => (
          <section className="filter-group" key={group.key}>
            <h2>{group.label}</h2>
            {group.values.map((value) => (
              <button
                key={value}
                className={filters[group.key] === value ? 'selected' : ''}
                aria-pressed={filters[group.key] === value}
                onClick={() => setFilters((current) => ({ ...current, [group.key]: value }))}
              >
                {value}
              </button>
            ))}
          </section>
        ))}
      </aside>
      {filtersOpen && (
        <button className="filter-scrim" aria-label="关闭筛选" onClick={() => setFiltersOpen(false)} />
      )}
      <section className="library-content">
        <div className="page-title-block">
          <h1>教学助手库</h1>
        </div>
        <label className="library-search">
          <Search aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索助手名称、学科或教学活动……"
            aria-label="搜索助手"
          />
        </label>
        <div className="list-heading">
          <strong role="status" aria-live="polite">
            {filtered ? `找到 ${items.length} 个助手` : `${items.length} 个助手`}
          </strong>
          <button className="mobile-filter-button" onClick={() => setFiltersOpen(true)}>
            <SlidersHorizontal />
            筛选
          </button>
        </div>
        {filtered && (
          <div className="library-filter-summary">
            <span>
              {[
                query.trim() && `搜索：${query.trim()}`,
                ...Object.values(filters).filter((value) => value !== '全部'),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <button
              onClick={() => {
                setQuery('');
                setFilters({ grade: '全部', subject: '全部', activity: '全部' });
              }}
            >
              清除筛选
            </button>
          </div>
        )}
        <AssistantList items={items} onOpen={onOpen} />
      </section>
    </main>
  );
}
