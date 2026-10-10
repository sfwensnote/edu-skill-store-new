import type { TeachingAssistant } from '../../../shared/assistant';
import { levelNames, type ContextualDesign, type DesignLevel } from '../../../shared/contextual-design';
import { isOutcomeReady } from '../../../shared/inquiry-workflow';
import type { SkillEntry } from '../../../shared/marketplace';
import { normalizeTeachingTags, teachingTagsOf } from '../../../shared/teaching-tags';

export const workshopTabs = [
  ['skills', '我的 SKILL'],
  ['problems', '我的情境题目'],
  ['chains', '我的任务链'],
  ['pbl', '我的 PBL 项目'],
  ['favorites', '我的收藏'],
  ['showcase', '作品展示'],
  ['assistants', '我的助手'],
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
  area?: 'daily' | 'inquiry';
  createdAt?: string;
  updatedAt?: string;
  status: string;
  detail: string;
  canUse: boolean;
};
export type WorkItem = WorkInfo &
  (
    | { kind: 'skill'; entry: SkillEntry }
    | { kind: 'design'; design: ContextualDesign; level: DesignLevel }
    | { kind: 'assistant'; assistant: TeachingAssistant }
    | { kind: 'method-draft'; assistant: TeachingAssistant }
  );
export type WorkshopFilters = { query: string; area: string; grade: string; subject: string; sort: string };
export const defaultWorkFilters: WorkshopFilters = {
  query: '',
  area: '全部',
  grade: '全部',
  subject: '全部',
  sort: 'updated',
};
export type WorkshopSearchState = { query: string; panels: Partial<Record<WorkshopTab, WorkshopFilters>> };
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
      if (!['全部', 'daily', 'inquiry'].includes(value.area)) value.area = '全部';
      if (!['updated', 'created', 'name'].includes(value.sort)) value.sort = 'updated';
      panels[tab] = value;
    }
    return { query: typeof stored.query === 'string' ? stored.query : '', panels };
  } catch {
    return { query: '', panels: {} };
  }
}
export function skillWork(entry: SkillEntry, assistants: TeachingAssistant[]): WorkItem {
  const owner = assistants.find((a) => a.id === entry.assistantId);
  return {
    kind: 'skill',
    entry,
    id: entry.id,
    title: entry.skill.name,
    summary: entry.skill.summary,
    tags: teachingTagsOf(entry.skill, entry.scene, entry.area, entry.example),
    keywords: [
      entry.scene,
      entry.example,
      entry.skill.purpose,
      entry.skill.trigger,
      ...entry.skill.behaviorSteps,
      ...entry.skill.constraints,
      ...teachingTagsOf(entry.skill, entry.scene, entry.area, entry.example),
      entry.skill.category || '',
    ].join(' '),
    grade: entry.grade,
    subject: entry.subject,
    area: entry.area,
    createdAt: owner?.createdAt,
    updatedAt: owner?.updatedAt,
    status: entry.validation,
    detail: entry.version,
    canUse: Boolean(
      entry.skill.name.trim() &&
      entry.skill.purpose.trim() &&
      entry.skill.trigger.trim() &&
      entry.skill.behaviorSteps.some((s) => s.trim()),
    ),
  };
}
export function designWork(design: ContextualDesign, level: DesignLevel): WorkItem {
  const p = design.pblProject;
  const ready = isOutcomeReady(design, level);
  const summary =
    level === 3
      ? p?.drivingQuestion || design.learningGoal
      : level === 2
        ? design.learningGoal || design.taskChain?.tasks.map((t) => t.title).join('；') || ''
        : design.contextualProblem?.question || design.originalProblem;
  return {
    kind: 'design',
    design,
    level,
    id: `design:${design.id}:${level}`,
    title: level === 3 ? p?.name || design.title : design.title,
    summary,
    tags: normalizeTeachingTags(design.tags),
    keywords: [
      design.knowledgePoint,
      design.contextType,
      design.learningGoal,
      design.originalProblem,
      ...normalizeTeachingTags(design.tags),
      ...(level === 1
        ? Object.values(design.contextualProblem || {}).filter((value) => typeof value === 'string')
        : level === 2
          ? design.taskChain?.tasks.flatMap(({ id: _id, ...task }) => Object.values(task)) || []
          : Object.values(p || {}).filter((value) => typeof value === 'string')),
    ].join(' '),
    grade: design.grade,
    subject: design.subject,
    area: 'inquiry',
    createdAt: design.createdAt,
    updatedAt: design.updatedAt,
    status: ready ? '教师已核对' : design.savedLevels.includes(level) ? '修改待核对' : '草稿',
    detail:
      level === 1
        ? design.contextType
        : level === 2
          ? `${design.taskChain?.tasks.length || 0} 个任务`
          : `${p?.stages.split(/\r?\n/).filter((s) => s.trim()).length || 0} 个阶段`,
    canUse: ready,
  };
}
const assistantStatuses = {
  DRAFT: '草稿',
  GENERATED: '待核对',
  TESTED: '已核对',
  TRIAL: '试用中',
  ACTIVE: '已启用',
};
export function workshopCollections({
  skills,
  allEntries,
  designs,
  assistants,
  favorites,
  shared,
}: {
  skills: SkillEntry[];
  allEntries: SkillEntry[];
  designs: ContextualDesign[];
  assistants: TeachingAssistant[];
  favorites: string[];
  shared: string[];
}): Record<WorkshopTab, WorkItem[]> {
  const personal = skills.map((e) => skillWork(e, assistants));
  const methodDrafts: WorkItem[] = assistants
    .filter((assistant) => assistant.status === 'DRAFT' && !assistant.skills.length && assistant.goal.trim())
    .map((assistant) => ({
      kind: 'method-draft',
      assistant,
      id: `method-draft:${assistant.id}`,
      title:
        assistant.activity && assistant.activity !== '错因诊断'
          ? `${assistant.activity} · 方法草稿`
          : '教学方法草稿',
      summary: assistant.goal,
      keywords: assistant.activity,
      grade: assistant.grade,
      subject: assistant.subject,
      area: assistant.area || 'daily',
      createdAt: assistant.createdAt,
      updatedAt: assistant.updatedAt,
      status: '尚未形成 SKILL',
      detail: '梳理中',
      canUse: false,
    }));
  const outcomes = designs.flatMap((d) =>
    ([1, 2, 3] as DesignLevel[])
      .filter((level) => d.savedLevels.includes(level) || d.currentLevel === level)
      .map((level) => designWork(d, level)),
  );
  return {
    skills: [...personal, ...methodDrafts],
    problems: outcomes.filter((item) => item.kind === 'design' && item.level === 1),
    chains: outcomes.filter((item) => item.kind === 'design' && item.level === 2),
    pbl: outcomes.filter((item) => item.kind === 'design' && item.level === 3),
    favorites: [
      ...allEntries.filter((e) => favorites.includes(e.id)).map((e) => skillWork(e, assistants)),
      ...outcomes.filter((item) => favorites.includes(item.id)),
    ],
    showcase: [...personal, ...outcomes].filter((item) => shared.includes(item.id)),
    assistants: assistants.map((a) => ({
      kind: 'assistant',
      assistant: a,
      id: a.id,
      title: a.name,
      summary: a.goal,
      keywords: `${a.activity} ${a.skills.map((s) => s.name).join(' ')}`,
      grade: a.grade,
      subject: a.subject,
      area: a.area,
      status: assistantStatuses[a.status],
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
      detail: `${a.skills.length} 项 SKILL`,
      canUse: false,
    })),
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
      (filters.area === '全部' || filters.area === item.area) &&
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
export function workType(item: WorkItem) {
  return item.kind === 'method-draft'
    ? '教学方法草稿'
    : item.kind === 'skill'
      ? '教学 SKILL'
      : item.kind === 'assistant'
        ? '教学助手'
        : levelNames[item.level];
}
