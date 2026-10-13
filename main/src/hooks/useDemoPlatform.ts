import { useRef, useState } from 'react';
import type { AssistantStatus, TeachingAssistant } from '../../shared/assistant';
import type { SkillEntry } from '../../shared/marketplace';
import type { EducationalSkill } from '../../shared/assistant';
import { isStoredAssistant } from '../../shared/workspace-storage';
import { reviseReviewedMethod } from '../../shared/method-review';
import type { TeachingMethod } from '../../shared/teaching-method';
import { workspaceKeys, type WorkspaceStorage } from '@/lib/account-workspace';
import { ownersStorageKey as storageKey, excludedSkillsKey as excludedKey } from '../../shared/workspace-keys';

function loadAssistants(storage: WorkspaceStorage) {
  try {
    const saved = JSON.parse(storage.getItem(storageKey) || 'null') as TeachingAssistant[] | null;
    return Array.isArray(saved) ? saved.filter(isStoredAssistant) : [];
  } catch {
    return [];
  }
}

function withoutKey<T>(record: Record<string, T>, key: string) {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key));
}

export function useDemoPlatform(storage: WorkspaceStorage, accountId: string) {
  function discardCache(key: string) {
    try { storage.removeItem(key); } catch { /* 缓存清理失败不撤销已保存的方法。 */ }
  }
  const [assistants, setAssistantState] = useState<TeachingAssistant[]>(() => loadAssistants(storage));
  const assistantsRef = useRef(assistants);
  // 本次会话中已确认删除的学伴，避免浏览器返回旧地址时被 ensureAssistant 复活为空草稿。
  const removedIds = useRef<Set<string>>(new Set());
  const [excludedByAssistant, setExcludedByAssistant] = useState<Record<string, string[]>>(() => {
    try {
      const saved = JSON.parse(storage.getItem(excludedKey) || '{}');
      if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
      return Object.fromEntries(
        Object.entries(saved)
          .filter(([, value]) => Array.isArray(value))
          .map(([id, value]) => [id, (value as unknown[]).filter((item) => typeof item === 'string')]),
      );
    } catch {
      return {};
    }
  });
  const [storageErrors, setStorageErrors] = useState<Record<string, string>>({});
  function persist(key: string, value: unknown) {
    try {
      if (key === storageKey) {
        const raw = storage.getItem(key);
        if (raw) {
          let damaged = false;
          try {
            const previous = JSON.parse(raw);
            damaged = !Array.isArray(previous) || !previous.every(isStoredAssistant);
          } catch { damaged = true; }
          if (damaged) storage.setItem(`${key}.recovery:${crypto.randomUUID()}`, raw);
        }
      }
      storage.setItem(key, JSON.stringify(value));
      setStorageErrors((errors) => withoutKey(errors, key));
      return true;
    } catch {
      setStorageErrors((errors) => ({
        ...errors,
        [key]: '教学方法保存失败，当前修改仍在页面中，请释放存储空间后重试。',
      }));
      return false;
    }
  }
  function setAssistants(updater: (items: TeachingAssistant[]) => TeachingAssistant[], mustSave = false) {
    const next = updater(assistantsRef.current);
    const saved = persist(storageKey, next);
    if (!saved && mustSave) return false;
    assistantsRef.current = next;
    setAssistantState(next);
    return saved;
  }

  function getAssistant(id: string) {
    return assistantsRef.current.find((assistant) => assistant.id === id);
  }

  function ensureAssistant(id: string) {
    if (removedIds.current.has(id)) return undefined;
    const found = getAssistant(id);
    if (found) return found;
    const created: TeachingAssistant = {
      id,
      userId: accountId,
      name: '',
      goal: '',
      grade: '初中',
      subject: '数学',
      activity: '错因诊断',
      status: 'DRAFT',
      isPublic: false,
      skills: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      area: 'daily',
      revision: 1,
    };
    setAssistants((items) => (items.some((assistant) => assistant.id === id) ? items : [created, ...items]));
    return created;
  }

  function updateAssistant(id: string, patch: Partial<TeachingAssistant>, mustSave = false) {
    const current = getAssistant(id);
    if (!current) return false;
    const saved = setAssistants(
      (items) =>
        items.map((assistant) => {
          if (assistant.id !== id) return assistant;
          const changed = (['skills', 'goal', 'grade', 'subject', 'activity', 'area'] as const).some(
            (key) => key in patch && JSON.stringify(patch[key]) !== JSON.stringify(assistant[key]),
          );
          return {
            ...assistant,
            ...patch,
            ...(changed
              ? {
                  status: 'DRAFT' as const,
                  isPublic: false,
                  revision:
                    patch.revision || (assistant.revision || 1) + (assistant.status === 'DRAFT' ? 0 : 1),
                }
              : {}),
            updatedAt: new Date().toISOString(),
          };
        }),
      mustSave,
    );
    if (
      saved &&
      (['skills', 'goal', 'grade', 'subject', 'activity', 'area'] as const).some(
        (key) => key in patch && JSON.stringify(patch[key]) !== JSON.stringify(current[key]),
      )
    )
      discardCache(`teaching-assistant.check-progress:${id}`);
    return saved;
  }

  function saveReviewedMethod(id: string, skillId: string, method: TeachingMethod) {
    const assistant = getAssistant(id);
    if (!assistant) return false;
    const next = reviseReviewedMethod(assistant, skillId, method);
    if (!setAssistants((items) => items.map((item) => item.id === id ? next : item), true)) return false;
    discardCache(`teaching-assistant.check-progress:${id}`);
    // 同步创建草稿，防止重新进入设计页时旧做法覆盖检测中的修改。
    const prefix = `teaching-assistant.method-draft.v1:${id}`;
    workspaceKeys(storage).filter((key) => key === prefix || key.startsWith(`${prefix}:`)).forEach((key) => {
      try {
        const draft = JSON.parse(storage.getItem(key) || 'null');
        if ((draft?.editingSkillId || assistant.skills[0]?.id) !== skillId) return;
        storage.setItem(key, JSON.stringify({ ...draft, sourceRevision: next.revision, method, teachingScene: method.category || '', stage: 'method',
          editingSkillId: skillId, manualEdits: ['name', 'description', 'category', 'tags', 'problem', 'expectedOutcome', 'trigger', 'principles',
            ...method.teachingSteps.flatMap((_, index) => [`step-${index}-condition`, `step-${index}-action`])],
        }));
      } catch {
        // 保留旧草稿；设计页按来源版本恢复，避免旧缓存覆盖已保存的修改。
      }
    });
    return true;
  }

  function setStatus(id: string, status: AssistantStatus) {
    const assistant = getAssistant(id);
    return updateAssistant(
      id,
      {
        status,
        ...(status === 'TESTED' && assistant?.id.startsWith('assistant-demo-') && !assistant.revision
          ? {
              revision: 1,
              skillSources: Object.fromEntries(
                assistant.skills.map((skill) => [
                  skill.id,
                  '教师核对的预置方法；真实执行表现与教学效果待验证。',
                ]),
              ),
            }
          : {}),
      },
      true,
    );
  }

  function isSkillIncluded(assistantId: string, skillId: string) {
    return !(excludedByAssistant[assistantId] || []).includes(skillId);
  }

  function toggleSkill(assistantId: string, skillId: string) {
    if (!getAssistant(assistantId)?.skills.some((skill) => skill.id === skillId)) return false;
    const excluded = excludedByAssistant[assistantId] || [];
    const next = {
      ...excludedByAssistant,
      [assistantId]: excluded.includes(skillId)
        ? excluded.filter((id) => id !== skillId)
        : [...excluded, skillId],
    };
    if (!persist(excludedKey, next)) return false;
    if (!updateAssistant(assistantId, { status: 'DRAFT', isPublic: false }, true)) {
      persist(excludedKey, excludedByAssistant);
      return false;
    }
    discardCache(`teaching-assistant.check-progress:${assistantId}`);
    setExcludedByAssistant(next);
    return true;
  }

  function removeAssistant(id: string) {
    if (!setAssistants((items) => items.filter((assistant) => assistant.id !== id), true)) return false;
    discardCache(`teaching-assistant.check-progress:${id}`);
    discardCache(`teaching-assistant.method-draft.v1:${id}`);
    workspaceKeys(storage)
      .filter((key) => key.startsWith(`teaching-assistant.method-draft.v1:${id}:`))
      .forEach((key) => discardCache(key));
    const nextExcluded = withoutKey(excludedByAssistant, id);
    if (persist(excludedKey, nextExcluded)) setExcludedByAssistant(nextExcluded);
    removedIds.current.add(id);
    return true;
  }

  function copySkill(entry: SkillEntry) {
    if (!entry.assistantId) return null;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const skill = { ...structuredClone(entry.skill), id: crypto.randomUUID() };
    const saved = setAssistants(
      (items) => [
        {
          id,
          userId: accountId,
          name: skill.name,
          goal: skill.purpose,
          grade: entry.grade,
          subject: entry.subject,
          activity: entry.scene,
          status: 'DRAFT',
          isPublic: false,
          skills: [skill],
          skillSources: { [skill.id]: `复制自“${entry.skill.name}”（${entry.creator}）。${entry.source}` },
          area: entry.area,
          revision: 1,
          createdAt: now,
          updatedAt: now,
        },
        ...items,
      ],
      true,
    );
    return saved ? { assistantId: id, skillId: skill.id } : null;
  }
  function removeSkill(assistantId: string, skillId: string) {
    const assistant = getAssistant(assistantId);
    if (!assistant) return false;
    const saved = updateAssistant(
      assistantId,
      {
        skills: assistant.skills.filter((s: EducationalSkill) => s.id !== skillId),
        status: 'DRAFT',
        isPublic: false,
        revision: (assistant.revision || 1) + 1,
        skillSources: withoutKey(assistant.skillSources || {}, skillId),
        skillAreas: withoutKey(assistant.skillAreas || {}, skillId),
      },
      true,
    );
    if (!saved) return false;
    discardCache(`teaching-assistant.method-draft.v1:${assistantId}:${skillId}`);
    discardCache(`teaching-assistant.method-draft.v1:${assistantId}`);
    return true;
  }

  return {
    assistants,
    storageError: Object.values(storageErrors)[0] || '',
    getAssistant,
    ensureAssistant,
    updateAssistant,
    saveReviewedMethod,
    setStatus,
    isSkillIncluded,
    toggleSkill,
    removeAssistant,
    copySkill,
    removeSkill,
  };
}
