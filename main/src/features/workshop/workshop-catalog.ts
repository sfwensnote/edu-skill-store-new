import type { TeachingAssistant } from '../../../shared/assistant';
import type { SkillEntry } from '../../../shared/marketplace';
import { teachingTagsOf, teachingCategoryOf, isPblTag } from '../../../shared/teaching-tags';
import { skillValidationLabel } from '../../../shared/skill-display';

export const workshopTabs = [
  ['skills', '全部'],
  ['created', '我创建的'],
  ['added', '从集市添加'],
  ['favorites', '我的收藏'],
] as const;
export type WorkshopTab = (typeof workshopTabs)[number][0];
type WorkInfo = {
  id: string;
  title: string;
  tags?: string[];
  summary: string;
  keywords: string;
  grade: string;
  subject: string;
  createdAt?: string;
  updatedAt?: string;
  status: string;
  detail: string;
};
export type WorkItem = WorkInfo &
  (
    | { kind: 'skill'; entry: SkillEntry }
    | { kind: 'method-draft'; assistant: TeachingAssistant }
  );
export type WorkshopFilters = { query: string; grade: string; subject: string; sort: string };
export const defaultWorkFilters: WorkshopFilters = {
  query: '',
  grade: '全部',
  subject: '全部',
  sort: 'updated',
};
type WorkshopSearchState = { query: string; panels: Partial<Record<WorkshopTab, WorkshopFilters>> };
export function restoreWorkshopSearch(raw: string | null): WorkshopSearchState {
  try {
    const stored = JSON.parse(raw || '{}');
    const panels: WorkshopSearchState['panels'] = {};
    for (const [tab] of workshopTabs) {
      const data = stored.panels?.[tab];
      if (!data) continue;
      const value = { ...defaultWorkFilters };
      for (const key of Object.keys(value) as (keyof WorkshopFilters)[])
        if (typeof data[key] === 'string') value[key] = data[key];
      if (!['updated', 'created', 'name'].includes(value.sort)) value.sort = 'updated';
      panels[tab] = value;
    }
    return { query: typeof stored.query === 'string' ? stored.query : '', panels };
  } catch {
    return { query: '', panels: {} };
  }
}
function skillWork(entry: SkillEntry, assistants: TeachingAssistant[]): WorkItem {
  const owner = assistants.find((a) => a.id === entry.assistantId);
  return {
    kind: 'skill',
    entry,
    id: entry.id,
    title: entry.skill.name,
    summary: entry.skill.summary,
    tags: teachingTagsOf(entry.skill, entry.scene, entry.area, entry.example),
    keywords: [
      ...(isPblTag(entry.scene) ? [] : [entry.scene]),
      entry.example,
      entry.skill.purpose,
      entry.skill.trigger,
      ...entry.skill.behaviorSteps,
      ...entry.skill.constraints,
      ...teachingTagsOf(entry.skill, entry.scene, entry.area, entry.example),
      teachingCategoryOf(entry.skill, entry.scene, entry.area),
    ].join(' '),
    grade: entry.grade,
    subject: entry.subject,
    createdAt: entry.addedFrom?.addedAt || owner?.createdAt,
    updatedAt: entry.addedFrom?.addedAt || owner?.updatedAt,
    status: skillValidationLabel(entry),
    detail: '',
  };
}
export function workshopCollections({
  skills,
  addedSkills,
  assistants,
  favorites = [],
  catalogSkills = [],
}: {
  skills: SkillEntry[];
  addedSkills: SkillEntry[];
  assistants: TeachingAssistant[];
  favorites?: string[];
  catalogSkills?: SkillEntry[];
}): Record<WorkshopTab, WorkItem[]> {
  const personal = skills.map((e) => skillWork(e, assistants));
  const added = addedSkills.map((e) => skillWork(e, assistants));
  const methodDrafts: WorkItem[] = assistants
    .filter((assistant) => assistant.status === 'DRAFT' && !assistant.skills.length && assistant.goal.trim())
    .map((assistant) => ({
      kind: 'method-draft',
      assistant,
      id: `method-draft:${assistant.id}`,
      title:
        assistant.activity && assistant.activity !== '错因诊断' && !isPblTag(assistant.activity)
          ? `${assistant.activity} · 方法草稿`
          : '教学方法草稿',
      summary: assistant.goal,
      keywords: isPblTag(assistant.activity) ? '' : assistant.activity,
      grade: assistant.grade,
      subject: assistant.subject,
      createdAt: assistant.createdAt,
      updatedAt: assistant.updatedAt,
      status: '尚未形成 SKILL',
      detail: '梳理中',
    }));
  return {
    skills: [...personal, ...methodDrafts, ...added],
    created: [...personal, ...methodDrafts],
    added,
    favorites: [...new Set(favorites)].flatMap((id) => {
      const entry = [...skills, ...addedSkills, ...catalogSkills].find((item) => item.id === id);
      return entry ? [skillWork(entry, assistants)] : [];
    }),
  };
}
export function matchesWork(item: WorkItem, query: string): boolean {
  const text =
    `${item.title} ${item.summary} ${item.keywords} ${item.grade} ${item.subject} ${item.detail} ${item.status}`.toLocaleLowerCase();
  return query
    .trim()
    .toLocaleLowerCase()
    .split(/\s+/)
    .every((word) => text.includes(word));
}
export function filterWork(items: WorkItem[], globalQuery: string, filters: WorkshopFilters): WorkItem[] {
  const selected = items.filter(
    (item) =>
      matchesWork(item, globalQuery) &&
      matchesWork(item, filters.query) &&
      (filters.grade === '全部' || filters.grade === item.grade) &&
      (filters.subject === '全部' || filters.subject === item.subject),
  );
  const date = (text?: string) => (text && Number.isFinite(Date.parse(text)) ? Date.parse(text) : 0);
  return [...selected].sort((a, b) =>
    filters.sort === 'name'
      ? a.title.localeCompare(b.title, 'zh-CN')
      : date(filters.sort === 'created' ? b.createdAt : b.updatedAt) -
        date(filters.sort === 'created' ? a.createdAt : a.updatedAt),
  );
}
