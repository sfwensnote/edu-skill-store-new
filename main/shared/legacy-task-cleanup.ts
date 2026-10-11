import { companionsKey, readCompanions } from './learning-companion';

type TaskStorage = Pick<Storage, 'getItem' | 'setItem'>;
type Change = { key: string; before: string; after: string };
const workspaceKey = 'teaching-method.market-workspace.v1';
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);

// 用户授权清除旧任务；只处理已知旧结构，新的三项教学场景与 SKILL 不清理。
export function clearLegacyTaskContent(storage: TaskStorage) {
  const changes: Change[] = [];
  const workspaceRaw = storage.getItem(workspaceKey);
  if (workspaceRaw) {
    try {
      const value = JSON.parse(workspaceRaw);
      if (record(value) && value.version === 1 &&
        [value.tasks, value.activityDrafts].some(items => Array.isArray(items) && items.length))
        changes.push({ key: workspaceKey, before: workspaceRaw, after: JSON.stringify({ ...value, tasks: [], activityDrafts: [] }) });
    } catch { /* 不覆盖无法识别的原资料。 */ }
  }
  const companionRaw = storage.getItem(companionsKey);
  if (companionRaw) {
    try {
      const values = JSON.parse(companionRaw);
      if (Array.isArray(values) && values.some(value => record(value) && (value.version === undefined || 'legacyTask' in value)))
        changes.push({ key: companionsKey, before: companionRaw, after: JSON.stringify(readCompanions(companionRaw)) });
    } catch { /* 损坏或未知版本继续由学伴读取错误提示处理。 */ }
  }
  const applied: Change[] = [];
  try {
    for (const change of changes) { storage.setItem(change.key, change.after); applied.push(change); }
  } catch (error) {
    for (const change of applied.reverse()) {
      try { storage.setItem(change.key, change.before); } catch { /* 不显示清理成功，恢复存储权限后重试。 */ }
    }
    throw error;
  }
  return changes.length;
}
