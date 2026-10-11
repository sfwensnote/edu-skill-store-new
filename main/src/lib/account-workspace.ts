import { primaryTeacherId, readAccounts, type AccountStorage } from '../../shared/local-accounts';
import { assistantSkillEntries, parseMarketWorkspace, type SkillEntry } from '../../shared/marketplace';
import { isStoredAssistant } from '../../shared/workspace-storage';
import { isMethodReviewed } from '../../shared/method-review';

import { ownersStorageKey, marketWorkspaceKey, excludedSkillsKey, companionsKey, type WorkspaceStorage } from '../../shared/workspace-keys';
export { ownersStorageKey, marketWorkspaceKey, type WorkspaceStorage } from '../../shared/workspace-keys';
export function accountWorkspaceKey(accountId: string, key: string) {
  // 首个教师账号沿用原存储，保留清空后已新建的内容。
  return accountId === primaryTeacherId ? key : `teaching-method.account:${accountId}:${key}`;
}
function isWorkspaceKey(key: string) {
  return key === companionsKey || key === ownersStorageKey || key === marketWorkspaceKey || key === excludedSkillsKey ||
    key.startsWith(`${ownersStorageKey}.recovery:`) || key.startsWith('teaching-assistant.method-draft.v1:') ||
    key.startsWith('teaching-assistant.check-progress:');
}
export function accountWorkspace(storage: WorkspaceStorage, accountId: string): WorkspaceStorage {
  const prefix = accountId === primaryTeacherId ? '' : `teaching-method.account:${accountId}:`;
  function keys() {
    return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((key): key is string =>
      key !== null && key.startsWith(prefix) && isWorkspaceKey(key.slice(prefix.length))).map(key => key.slice(prefix.length));
  }
  function mapped(key: string) {
    if (!isWorkspaceKey(key)) throw new Error('无法读取此工作区资料。');
    return accountWorkspaceKey(accountId, key);
  }
  return {
    get length() { return keys().length; }, key: (index) => keys()[index] ?? null,
    getItem: (key) => storage.getItem(mapped(key)), setItem: (key, value) => storage.setItem(mapped(key), value),
    removeItem: (key) => storage.removeItem(mapped(key)),
  };
}
export function workspaceKeys(storage: WorkspaceStorage) {
  return Array.from({ length: storage.length }, (_, i) => storage.key(i)).filter((key): key is string => key !== null);
}
export function readPublishedSkills(storage: WorkspaceStorage & AccountStorage, viewerId: string): SkillEntry[] {
  return readAccounts(storage).flatMap(account => {
    const personal = accountWorkspace(storage, account.id);
    let owners: unknown;
    try { owners = JSON.parse(personal.getItem(ownersStorageKey) || '[]'); } catch { return []; }
    if (!Array.isArray(owners)) return [];
    const reviewed = owners.filter(isStoredAssistant).filter(isMethodReviewed);
    const market = parseMarketWorkspace(personal.getItem(marketWorkspaceKey));
    let excluded: Record<string, unknown> = {};
    try { excluded = JSON.parse(personal.getItem(excludedSkillsKey) || '{}') || {}; } catch { /* 使用已保存的核对状态。 */ }
    return assistantSkillEntries(reviewed).filter(entry => market.sharedSkillIds.includes(entry.id) &&
      !(Array.isArray(excluded[entry.assistantId!]) && (excluded[entry.assistantId!] as unknown[]).includes(entry.skill.id)))
      .map(entry => account.id === viewerId ? { ...entry, creator: account.name }
        : (({ assistantId: _owner, ...readonlyEntry }) => ({ ...readonlyEntry, creator: account.name }))(entry));
  });
}
