export const skillResetKey = 'teaching-method.skill-reset.2026-10-10.v1';
const ownersKey = 'teaching-assistant.frontend-demo.v2';
const workspaceKey = 'teaching-method.market-workspace.v1';
type SkillStorage = Pick<Storage, 'length' | 'key' | 'getItem' | 'setItem' | 'removeItem'>;
type Change = { key: string; before: string | null; after: string | null };

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clearedWorkspace(raw: string): string {
  try {
    const value = JSON.parse(raw);
    if (!isRecord(value)) return raw;
    return JSON.stringify({
      ...value,
      addedSkills: [], sharedSkillIds: [], favorites: [],
      tasks: Array.isArray(value.tasks) ? value.tasks.filter((task: unknown) => !isRecord(task) || task.kind !== 'skill')
        .map((task: unknown) => {
          if (!isRecord(task)) return task;
          const { supportSkill: _removed, ...retained } = task;
          return retained;
        }) : value.tasks,
      activityDrafts: Array.isArray(value.activityDrafts) ? value.activityDrafts.filter((draft: unknown) => !isRecord(draft) || draft.path !== 'skill')
        .map((draft: unknown) => isRecord(draft) && draft.path === 'learning' ? { ...draft, supportSkillId: '', supportVersion: undefined } : draft)
        : value.activityDrafts,
    });
  } catch {
    // 无法识别的旧工作区不展示内容，保留原文中的非 SKILL 资料。
    return raw;
  }
}

// 用户已授权本批清空现有 SKILL；完成标记防止后续新建内容在刷新时再次被清除。
export function resetExistingSkills(storage: SkillStorage): boolean {
  if (storage.getItem(skillResetKey) === 'done') return false;
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index)).filter((key): key is string => key !== null);
  const changes: Change[] = [];
  for (const key of keys) {
    const before = storage.getItem(key);
    if (key === ownersKey || key === 'teaching-assistant.excluded-skills.v1' ||
      key.startsWith(`${ownersKey}.recovery:`) || key.startsWith('teaching-assistant.method-draft.v1:') ||
      key.startsWith('teaching-assistant.check-progress:')) changes.push({ key, before, after: null });
    else if (key === workspaceKey && before !== null) changes.push({ key, before, after: clearedWorkspace(before) });
  }
  const applied: Change[] = [];
  try {
    for (const change of changes) {
      if (change.after === change.before) continue;
      if (change.after === null) storage.removeItem(change.key);
      else storage.setItem(change.key, change.after);
      applied.push(change);
    }
    storage.setItem(skillResetKey, 'done');
    return true;
  } catch (error) {
    for (const change of applied.reverse()) {
      try {
        if (change.before === null) storage.removeItem(change.key);
        else storage.setItem(change.key, change.before);
      } catch { /* 清理失败时不启动应用，恢复权限后仍可重试。 */ }
    }
    throw error;
  }
}
