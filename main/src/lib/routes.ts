import type { DesignLevel } from '../../shared/contextual-design';
type RoutePage =
  | { page: 'home' | 'daily' | 'inquiry' | 'market' }
  | { page: 'space'; selection?: string; draftId?: string }
  | { page: 'workshop'; tab?: string }
  | {
      page: 'inquiry-editor';
      designId: string;
      level: DesignLevel;
      view?: 'preview';
    }
  | { page: 'skill-detail'; skillId: string }
  | { page: 'task-preview'; taskId: string }
  | { page: 'library' }
  | { page: 'library-detail'; assistantId: string }
  | { page: 'mine' }
  | { page: 'create'; assistantId: string; skillId?: string }
  | { page: 'test' | 'use' | 'logs' | 'report'; assistantId: string }
  | { page: 'trial-preview'; assistantId: string; from: 'logs' | 'report' | 'test' | 'method'; caseId?: string }
  | { page: 'log-detail'; assistantId: string; sessionId: string };
export type AppRoute = RoutePage & { returnTo?: string };
const safeReturn = (hash: string | null | undefined) =>
  hash?.startsWith('#/') && hash.length < 4000 ? hash : undefined;
export function readRoute(hash = window.location.hash): AppRoute {
  const route = parseRoute(hash);
  const query = hash.indexOf('?');
  const returnTo = safeReturn(new URLSearchParams(query < 0 ? '' : hash.slice(query + 1)).get('return'));
  return returnTo ? { ...route, returnTo } : route;
}
function parseRoute(hash: string): RoutePage {
  const [path, query] = hash.replace(/^#\/?/, '').split('?');
  const params = new URLSearchParams(query);
  let parts: string[];
  try {
    parts = path.split('/').filter(Boolean).map(decodeURIComponent);
  } catch {
    return { page: 'home' };
  }
  if (!parts.length || parts[0] === 'home') return { page: 'home' };
  if (parts[0] === 'legacy-market') return { page: 'market' };
  if (parts[0] === 'space')
    return {
      page: 'space',
      selection: params.get('selection') || undefined,
      ...(params.get('draft') ? { draftId: params.get('draft')! } : {}),
    };
  if (['daily', 'market'].includes(parts[0])) return { page: parts[0] as 'daily' | 'market' };
  if (parts[0] === 'workshop') return { page: 'workshop', tab: params.get('tab') || undefined };
  if (parts[0] === 'inquiry')
    return parts[1]
      ? {
          page: 'inquiry-editor',
          designId: parts[1],
          level: parts[2] === '3' ? 3 : parts[2] === '2' ? 2 : 1,
          view: params.get('view') === 'preview' ? 'preview' : undefined,
        }
      : { page: 'inquiry' };
  if (parts[0] === 'skill' && parts[1]) return { page: 'skill-detail', skillId: parts[1] };
  if (parts[0] === 'task' && parts[1]) return { page: 'task-preview', taskId: parts[1] };
  if (parts[0] === 'community' || parts[0] === 'library')
    return parts[1] ? { page: 'library-detail', assistantId: parts[1] } : { page: 'library' };
  if (parts[0] === 'mine') return { page: 'mine' };
  if (parts[0] === 'create')
    return {
      page: 'create',
      assistantId: parts[1] || 'new',
      skillId: params.get('skill') || undefined,
    };
  if (parts[0] === 'assistant' && parts[1]) {
    if (['test', 'use', 'logs', 'report'].includes(parts[2])) {
      if (parts[2] === 'logs' && parts[3])
        return {
          page: 'log-detail',
          assistantId: parts[1],
          sessionId: parts[3],
        };
      return {
        page: parts[2] as 'test' | 'use' | 'logs' | 'report',
        assistantId: parts[1],
      };
    }
    if (parts[2] === 'student-preview')
      return {
        page: 'trial-preview',
        assistantId: parts[1],
        from: ['report', 'test', 'method'].includes(params.get('from') || '')
          ? params.get('from') as 'report' | 'test' | 'method' : 'logs',
        ...(params.get('case') ? { caseId: params.get('case')! } : {}),
      };
  }
  return { page: 'home' };
}
export function routeHash(route: AppRoute): string {
  const hash = pageHash(route);
  const params = new URLSearchParams(hash.split('?')[1]);
  if (route.page === 'space' && route.selection) params.set('selection', route.selection);
  if (route.page === 'trial-preview' && route.caseId) params.set('case', route.caseId);
  if (route.page === 'space' && route.draftId) params.set('draft', route.draftId);
  if (route.page === 'inquiry-editor' && route.view) params.set('view', route.view);
  if (safeReturn(route.returnTo)) params.set('return', route.returnTo!);
  const query = params.toString();
  return hash.split('?')[0] + (query ? `?${query}` : '');
}
export function returnRoute(route: AppRoute, fallback: AppRoute): AppRoute {
  return safeReturn(route.returnTo) ? readRoute(route.returnTo) : fallback;
}
export function activeNavigationPage(
  route: AppRoute,
  applicationDraftIds: readonly string[] = [],
): 'home' | 'market' | 'workshop' | 'space' {
  let context = route;
  // 方法详情在不同工作空间中复用，导航高亮应跟随来源，而不是一律指向集市。
  for (let depth = 0; depth < 16 && context.page === 'skill-detail' && context.returnTo; depth++)
    context = readRoute(context.returnTo);
  if (context.page === 'space' && (
    context.selection?.startsWith('skill:') ||
    (context.draftId && applicationDraftIds.includes(context.draftId))
  )) return 'workshop';
  if (['market', 'skill-detail', 'library', 'library-detail'].includes(context.page)) return 'market';
  if (['space', 'task-preview', 'use'].includes(context.page)) return 'space';
  if (
    ['workshop', 'mine', 'create', 'test', 'logs', 'report', 'log-detail', 'trial-preview', 'inquiry-editor'].includes(
      context.page,
    )
  )
    return 'workshop';
  return 'home';
}
export function navigationRoute(current: AppRoute, next: AppRoute): AppRoute {
  const parent = current.returnTo ? readRoute(current.returnTo) : undefined;
  const identity = (route: AppRoute) =>
    [
      route.page,
      'assistantId' in route ? route.assistantId : '',
      'skillId' in route ? route.skillId : '',
      'designId' in route ? route.designId : '',
      'level' in route ? route.level : '',
      'taskId' in route ? route.taskId : '',
      route.page === 'space' ? route.draftId || route.selection || '' : '',
    ].join(':');
  // 从详情再次进入来源页面时，复用原返回关系，避免任务页与详情页互相返回。
  if (next.page === 'space' && parent && identity(parent) === identity(next))
    return { ...parent, ...next, returnTo: parent.returnTo };
  const sameDesign =
    current.page === 'inquiry-editor' && next.page === 'inquiry-editor' && current.designId === next.designId;
  const drilldown = [
    'skill-detail',
    'inquiry-editor',
    'task-preview',
    'create',
    'test',
    'logs',
    'report',
    'log-detail',
    'trial-preview',
    'use',
    'library-detail',
  ].includes(next.page);
  return {
    ...next,
    returnTo: next.returnTo || (sameDesign ? current.returnTo : drilldown ? routeHash(current) : undefined),
  };
}
export function returnLabel(route: AppRoute, fallback: AppRoute): string {
  const parent = returnRoute(route, fallback);
  return `返回${({ home: '首页', daily: '日常教学', inquiry: '情境探究', workshop: '我的作品', mine: '我的作品', market: '集市', space: '教学任务', create: '方法编辑', test: '方法核对', logs: '教学预览', report: '核对摘要', 'log-detail': '方法步骤', 'skill-detail': '方法详情', 'inquiry-editor': '探究设计', library: '集市', 'library-detail': '助手详情' } as Record<string, string>)[parent.page] || '上一页'}`;
}
function pageHash(route: AppRoute): string {
  switch (route.page) {
    case 'home':
    case 'daily':
    case 'inquiry':
    case 'market':
    case 'space':
    case 'library':
      return `#/${route.page}`;
    case 'workshop':
      return `#/workshop${route.tab ? `?tab=${route.tab}` : ''}`;
    case 'inquiry-editor':
      return `#/inquiry/${encodeURIComponent(route.designId)}/${route.level}`;
    case 'skill-detail':
      return `#/skill/${encodeURIComponent(route.skillId)}`;
    case 'task-preview':
      return `#/task/${encodeURIComponent(route.taskId)}`;
    case 'library-detail':
      return `#/library/${route.assistantId}`;
    case 'mine':
      return '#/mine';
    case 'create':
      return `#/create/${route.assistantId}${route.skillId ? `?skill=${encodeURIComponent(route.skillId)}` : ''}`;
    case 'trial-preview':
      return `#/assistant/${route.assistantId}/student-preview?from=${route.from}`;
    case 'log-detail':
      return `#/assistant/${route.assistantId}/logs/${route.sessionId}`;
    default:
      return `#/assistant/${route.assistantId}/${route.page}`;
  }
}
export function goTo(route: AppRoute, replace = false) {
  const hash = routeHash(route);
  if (replace) window.history.replaceState(null, '', hash);
  else window.location.hash = hash.slice(1);
  window.dispatchEvent(new HashChangeEvent('hashchange'));
  window.scrollTo({ top: 0, behavior: 'instant' });
}
