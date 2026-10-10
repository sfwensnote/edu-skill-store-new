import { useRef, useState } from 'react';
import {
  copyContextualDesign,
  type ContextualDesign,
  type DesignLevel,
} from '../../shared/contextual-design';
import {
  parseMarketWorkspace,
  addMarketSkill,
  type SkillEntry,
  type LocalTeachingTask,
  type TaskSubmission,
  type MarketWorkspace,
} from '../../shared/marketplace';
import { outcomeIssue } from '../../shared/inquiry-workflow';
import type { TeachingActivityDraft } from '../../shared/teaching-activity';

export const marketStorageKey = 'teaching-method.market-workspace.v1';
export function useMarketWorkspace() {
  const [state, setState] = useState(() => {
    try {
      return parseMarketWorkspace(localStorage.getItem(marketStorageKey));
    } catch {
      return parseMarketWorkspace(null);
    }
  });
  const stateRef = useRef(state);
  const [storageError, setStorageError] = useState('');
  const [unsavedDesignIds, setUnsavedDesignIds] = useState<string[]>([]);
  const lastSaved = useRef(true);
  function commit(next: MarketWorkspace, mustSave = false, message?: string) {
    try {
      localStorage.setItem(marketStorageKey, JSON.stringify(next));
      lastSaved.current = true;
      setUnsavedDesignIds([]);
      setStorageError('');
    } catch {
      lastSaved.current = false;
      setStorageError(message || '存储空间不足，最近修改尚未保存。请保持页面打开，并导出作品。');
      if (mustSave) return false;
    }
    stateRef.current = next;
    setState(next);
    return true;
  }
  function update(updater: (current: MarketWorkspace) => MarketWorkspace, mustSave = false) {
    return commit(updater(stateRef.current), mustSave);
  }
  function addDesign(design: ContextualDesign) {
    const current = stateRef.current;
    return commit(
      {
        ...current,
        designs: [design, ...current.designs],
      },
      true,
      '作品创建失败，教学背景仍在页面中，请释放存储空间后重试。',
    );
  }
  function updateDesign(id: string, patch: Partial<ContextualDesign>) {
    update((current) => ({
      ...current,
      designs: current.designs.map((d) =>
        d.id === id ? { ...d, ...patch, updatedAt: new Date().toISOString() } : d,
      ),
    }));
    if (!lastSaved.current) setUnsavedDesignIds((ids) => [...new Set([...ids, id])]);
  }
  function retryDesignSave() {
    return commit(stateRef.current, true, '作品草稿仍未保存，请释放存储空间后重试。');
  }
  function saveDesign(id: string, level: DesignLevel) {
    const current = stateRef.current;
    const design = current.designs.find((d) => d.id === id);
    const issue = design ? outcomeIssue(design, level) : '没有找到这份作品，请返回我的 SKILL 检查。';
    if (issue) {
      setStorageError(issue);
      return false;
    }
    return commit(
      {
        ...current,
        designs: current.designs.map((d) =>
          d.id === id
            ? {
                ...d,
                status: 'SAVED',
                currentLevel: level,
                savedLevels: [...new Set([...d.savedLevels, level])],
                updatedAt: new Date().toISOString(),
              }
            : d,
        ),
      },
      true,
      '作品保存失败，修改仍在当前页面，请释放存储空间后重试。',
    );
  }
  function copyDesign(id: string) {
    const source = stateRef.current.designs.find((d) => d.id === id);
    if (!source) return '';
    const copied = copyContextualDesign(source, crypto.randomUUID());
    const saved = update(
      (current) => ({
        ...current,
        designs: [copied, ...current.designs],
      }),
      true,
    );
    return saved ? copied.id : '';
  }
  function removeDesign(id: string) {
    return update(
      (current) => ({
        ...current,
        designs: current.designs.filter((d) => d.id !== id),
      }),
      true,
    );
  }
  function toggleFavorite(id: string) {
    return update(
      (current) => ({
        ...current,
        favorites: current.favorites.includes(id)
          ? current.favorites.filter((x) => x !== id)
          : [...current.favorites, id],
      }),
      true,
    );
  }
  function addSkill(entry: SkillEntry) {
    const current = stateRef.current;
    const addedSkills = addMarketSkill(current.addedSkills, entry, new Date().toISOString());
    if (addedSkills === current.addedSkills) return true;
    return commit({ ...current, addedSkills }, true, '添加未保存，请释放存储空间后重试。');
  }
  function removeAddedSkill(id: string) {
    return update((current) => ({
      ...current,
      addedSkills: current.addedSkills.filter((entry) => entry.id !== id),
    }), true);
  }
  function toggleShare(id: string) {
    return update(
      (current) => ({
        ...current,
        sharedSkillIds: current.sharedSkillIds.includes(id)
          ? current.sharedSkillIds.filter((x) => x !== id)
          : [...current.sharedSkillIds, id],
      }),
      true,
    );
  }
  function shareMany(ids: string[]) {
    return update(
      (current) => ({
        ...current,
        sharedSkillIds: [...new Set([...current.sharedSkillIds, ...ids])],
      }),
      true,
    );
  }
  function removeShares(ids: string[]) {
    return update((current) => ({ ...current, sharedSkillIds: current.sharedSkillIds.filter((id) => !ids.includes(id)) }), true);
  }
  function saveActivityDraft(draft: TeachingActivityDraft, task?: LocalTeachingTask) {
    const current = stateRef.current;
    const next = {
      ...current,
      activityDrafts: [structuredClone(draft), ...current.activityDrafts.filter((d) => d.id !== draft.id)],
      tasks: task
        ? [structuredClone(task), ...current.tasks.filter((t) => t.id !== task.id)]
        : draft.path === 'learning'
          ? current.tasks.filter((t) => t.id !== draft.id || t.submissions.length > 0)
          : current.tasks,
    };
    return commit(next, true, '草稿保存失败，请释放存储空间后重试。当前修改仍保留在页面中。');
  }
  function submitTask(id: string, submission: TaskSubmission) {
    const current = stateRef.current;
    const task = current.tasks.find((t) => t.id === id);
    if (!task || (task.activitySettings?.allowRetry === false && task.submissions.length)) return false;
    return commit(
      {
        ...current,
        tasks: current.tasks.map((task) =>
          task.id === id ? { ...task, submissions: [...task.submissions, submission] } : task,
        ),
      },
      true,
      '学习记录保存失败，请释放存储空间后重试。回答仍保留在页面中。',
    );
  }
  return {
    ...state,
    storageError,
    unsavedDesignIds,
    addDesign,
    updateDesign,
    retryDesignSave,
    saveDesign,
    copyDesign,
    removeDesign,
    toggleFavorite,
    addSkill,
    removeAddedSkill,
    toggleShare,
    shareMany,
    removeShares,
    saveActivityDraft,
    submitTask,
  };
}
