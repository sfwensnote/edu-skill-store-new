import { useEffect, useRef, useState } from 'react';
import type { AssistantStatus, DesignerMessage, TeachingAssistant } from '../../shared/assistant';
import { coreSkills, initialDesignerMessages, initialMine } from '@/data/platform';
import type { SkillEntry } from '../../shared/marketplace';
import type { EducationalSkill } from '../../shared/assistant';
import { isStoredAssistant } from '../../shared/workspace-storage';
import { reviseReviewedMethod } from '../../shared/method-review';
import type { TeachingMethod } from '../../shared/teaching-method';

const storageKey = 'teaching-assistant.frontend-demo.v2';
const excludedKey = 'teaching-assistant.excluded-skills.v1';
const messagesKey = 'teaching-assistant.designer-messages.v1';

function loadAssistants() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null') as TeachingAssistant[] | null;
    return Array.isArray(saved) ? saved.filter(isStoredAssistant) : initialMine;
  } catch {
    return initialMine;
  }
}

function loadMessages() {
  try {
    const saved = JSON.parse(localStorage.getItem(messagesKey) || '{}') as Record<string, DesignerMessage[]>;
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {};
  } catch {
    return {};
  }
}

function withoutKey<T>(record: Record<string, T>, key: string) {
  return Object.fromEntries(Object.entries(record).filter(([entryKey]) => entryKey !== key));
}

export function useDemoPlatform() {
  const [assistants, setAssistantState] = useState<TeachingAssistant[]>(loadAssistants);
  const assistantsRef = useRef(assistants);
  const [messagesByAssistant, setMessagesByAssistant] =
    useState<Record<string, DesignerMessage[]>>(loadMessages);
  const [excludedByAssistant, setExcludedByAssistant] = useState<Record<string, string[]>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(excludedKey) || '{}');
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
      localStorage.setItem(key, JSON.stringify(value));
      setStorageErrors((errors) => withoutKey(errors, key));
      return true;
    } catch {
      setStorageErrors((errors) => ({
        ...errors,
        [key]: '教学方法保存失败，当前修改仍在页面中，请释放本机存储空间后重试。',
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

  useEffect(() => {
    persist(storageKey, assistants);
  }, []);
  useEffect(() => {
    persist(excludedKey, excludedByAssistant);
  }, [excludedByAssistant]);
  useEffect(() => {
    persist(messagesKey, messagesByAssistant);
  }, [messagesByAssistant]);

  function getAssistant(id: string) {
    return assistantsRef.current.find((assistant) => assistant.id === id);
  }

  function ensureAssistant(id: string) {
    const found = getAssistant(id);
    if (found) return found;
    const created: TeachingAssistant = {
      id,
      userId: 'demo-teacher',
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
      localStorage.removeItem(`teaching-assistant.check-progress:${id}`);
    return saved;
  }

  function messagesFor(id: string) {
    const saved = messagesByAssistant[id];
    if (saved) return saved;
    const initial = initialDesignerMessages.map((message) => ({ ...message, assistantId: id }));
    const assistant = getAssistant(id);
    if (!assistant?.skills.length) return initial;
    return [
      ...initial,
      {
        id: `recovered-${id}`,
        assistantId: id,
        role: 'assistant' as const,
        content: `已恢复这个助手的设计稿，右侧共有 ${assistant.skills.length} 项教学技能。之前的对话没有保存在当前设备，你可以从这里继续调整。`,
        createdAt: new Date().toISOString(),
      },
    ];
  }

  function saveReviewedMethod(id: string, skillId: string, method: TeachingMethod) {
    const assistant = getAssistant(id);
    if (!assistant) return false;
    const next = reviseReviewedMethod(assistant, skillId, method);
    if (!setAssistants((items) => items.map((item) => item.id === id ? next : item), true)) return false;
    localStorage.removeItem(`teaching-assistant.check-progress:${id}`);
    // 同步创建草稿，防止重新进入设计页时旧做法覆盖检测中的修改。
    const prefix = `teaching-assistant.method-draft.v1:${id}`;
    Object.keys(localStorage).filter((key) => key === prefix || key.startsWith(`${prefix}:`)).forEach((key) => {
      try {
        const draft = JSON.parse(localStorage.getItem(key) || 'null');
        if ((draft?.editingSkillId || assistant.skills[0]?.id) !== skillId) return;
        localStorage.setItem(key, JSON.stringify({ ...draft, method, teachingScene: method.category || '', stage: 'method',
          editingSkillId: skillId, manualEdits: ['name', 'description', 'category', 'tags', 'problem', 'expectedOutcome', 'trigger', 'principles',
            ...method.teachingSteps.flatMap((_, index) => [`step-${index}-condition`, `step-${index}-action`])],
        }));
      } catch {
        localStorage.removeItem(key);
      }
    });
    return true;
  }

  function design(id: string, content: string, adjustingSkill?: string) {
    const now = new Date().toISOString();
    const userMessage: DesignerMessage = {
      id: crypto.randomUUID(),
      assistantId: id,
      role: 'user',
      content,
      createdAt: now,
    };
    const current = getAssistant(id);
    const hasProgressive = current?.skills.some((skill) => skill.id === 'progressive-hint');
    const hasCheck = current?.skills.some((skill) => skill.id === 'understanding-check');
    const shouldAddProgressive = !adjustingSkill && /逐步|提示|不会|卡住/.test(content) && !hasProgressive;
    const shouldAddCheck = !adjustingSkill && /理解|检查|检测|学会/.test(content) && !hasCheck;
    const assistantMessage: DesignerMessage = {
      id: crypto.randomUUID(),
      assistantId: id,
      role: 'assistant',
      content: adjustingSkill
        ? `已经按你的想法调整了「${adjustingSkill}」。你可以在右侧展开查看。`
        : current?.skills.length
          ? shouldAddProgressive || shouldAddCheck
            ? '我根据这次补充新增了一项教学技能。是否加入助手，由你在右侧决定。'
            : '我已经把这次补充整理进当前设计。你可以继续描述另一个需要助手处理的教学情境。'
          : '我先整理出最核心的一项教学技能。你可以查看并决定是否加入助手，再继续补充其他教学情境。',
      createdAt: now,
    };
    setMessagesByAssistant((all) => ({ ...all, [id]: [...messagesFor(id), userMessage, assistantMessage] }));
    let skills = current?.skills.length
      ? current.skills.map((skill) =>
          adjustingSkill === skill.name && /第二次|具体/.test(content)
            ? {
                ...skill,
                behaviorSteps: [
                  ...skill.behaviorSteps,
                  '如果学生第二次仍无法继续，给出更具体但不包含最终答案的提示',
                ],
              }
            : skill,
        )
      : [coreSkills[0]];
    if (shouldAddProgressive) skills = [...skills, coreSkills[1]];
    if (shouldAddCheck) skills = [...skills, coreSkills[2]];
    updateAssistant(id, {
      name: current?.name || '七年级数学教学助手',
      goal:
        current?.goal ||
        '帮助七年级学生理解一元一次方程，在出现错误时先引导学生解释思路，再根据需要逐步提供帮助。',
      grade: '初中',
      subject: '数学',
      activity: '错因诊断',
      skills,
    });
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
    if (!updateAssistant(assistantId, { status: 'DRAFT', isPublic: false }, true)) return false;
    const excluded = excludedByAssistant[assistantId] || [];
    const next = {
      ...excludedByAssistant,
      [assistantId]: excluded.includes(skillId)
        ? excluded.filter((id) => id !== skillId)
        : [...excluded, skillId],
    };
    if (!persist(excludedKey, next)) return false;
    localStorage.removeItem(`teaching-assistant.check-progress:${assistantId}`);
    setExcludedByAssistant(next);
    return true;
  }

  function removeAssistant(id: string) {
    if (!setAssistants((items) => items.filter((assistant) => assistant.id !== id), true)) return false;
    localStorage.removeItem(`teaching-assistant.check-progress:${id}`);
    localStorage.removeItem(`teaching-assistant.method-draft.v1:${id}`);
    Object.keys(localStorage)
      .filter((key) => key.startsWith(`teaching-assistant.method-draft.v1:${id}:`))
      .forEach((key) => localStorage.removeItem(key));
    setMessagesByAssistant((current) => withoutKey(current, id));
    setExcludedByAssistant((current) => withoutKey(current, id));
    return true;
  }

  function publishAssistant(id: string) {
    return updateAssistant(id, { isPublic: true }, true);
  }

  function reuseSkill(entry: SkillEntry) {
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    const skill = { ...structuredClone(entry.skill), id: crypto.randomUUID() };
    const saved = setAssistants(
      (items) => [
        {
          id,
          userId: 'demo-teacher',
          name: `${skill.name}助手`,
          goal: skill.purpose,
          grade: entry.grade,
          subject: entry.subject,
          activity: entry.scene,
          status: 'DRAFT',
          isPublic: false,
          skills: [skill],
          skillSources: { [skill.id]: `复用自“${entry.skill.name}”（${entry.creator}）。${entry.source}` },
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
  function mountSkill(assistantId: string, entry: SkillEntry) {
    const assistant = getAssistant(assistantId);
    if (!assistant || assistant.skills.length >= 8) return false;
    const skillId = crypto.randomUUID();
    return updateAssistant(
      assistantId,
      {
        skills: [...assistant.skills, { ...structuredClone(entry.skill), id: skillId }],
        skillAreas: { ...assistant.skillAreas, [skillId]: entry.area },
        skillSources: {
          ...assistant.skillSources,
          [skillId]: `挂载自“${entry.skill.name}”（${entry.creator}）。${entry.source}`,
        },
        status: 'DRAFT',
        isPublic: false,
        revision: (assistant.revision || 1) + 1,
      },
      true,
    );
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
    localStorage.removeItem(`teaching-assistant.method-draft.v1:${assistantId}:${skillId}`);
    localStorage.removeItem(`teaching-assistant.method-draft.v1:${assistantId}`);
    return true;
  }

  return {
    assistants,
    storageError: Object.values(storageErrors)[0] || '',
    getAssistant,
    ensureAssistant,
    updateAssistant,
    saveReviewedMethod,
    messagesFor,
    design,
    setStatus,
    isSkillIncluded,
    toggleSkill,
    removeAssistant,
    publishAssistant,
    reuseSkill,
    mountSkill,
    removeSkill,
  };
}
