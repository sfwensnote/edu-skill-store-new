import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, LoaderCircle } from 'lucide-react';
import type { TeachingAssistant } from '../../../shared/assistant';
import {
  defaultCreationDraft,
  emptyMethod,
  mockQuestions,
  methodFromSkill,
  packageTeachingMethod,
  prepareMethod,
  upsertMethodSkill,
  type CreationDraft,
  type TeachingMethod,
} from '../../../shared/teaching-method';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { SaveFailureExitGuard } from '@/components/SaveFailureExitGuard';
import { IdeaForm } from './IdeaForm';
import { GuidedMethodPage } from './GuidedMethodPage';
import { visibleTeachingTags, isTeachingCategory, teachingCategoryOf, teachingTagsOf, type TeachingCategory } from '../../../shared/teaching-tags';
import './creation-flow.css';
import type { WorkspaceStorage } from '@/lib/account-workspace';

const draftKey = (id: string, skillId?: string) =>
  `teaching-assistant.method-draft.v1:${id}${skillId ? `:${skillId}` : ''}`;
function restore(storage: WorkspaceStorage, assistant: TeachingAssistant, skillId?: string, sourceTags?: string[], sourceCategory?: TeachingCategory | null): CreationDraft {
  try {
    const saved = JSON.parse(
      storage.getItem(draftKey(assistant.id, skillId)) || 'null',
    ) as CreationDraft | null;
    if (
      saved &&
      (assistant.status === 'DRAFT' || saved.sourceRevision === assistant.revision) &&
      typeof saved.originalIdea === 'string' &&
      saved.method &&
      ['problem', 'expectedOutcome'].every(
        (key) => typeof saved.method[key as keyof TeachingMethod] === 'string',
      ) &&
      (saved.method.trigger === undefined || typeof saved.method.trigger === 'string') &&
      ['name', 'description'].every((key) => saved.method[key as keyof TeachingMethod] === undefined ||
        typeof saved.method[key as keyof TeachingMethod] === 'string') &&
      (saved.method.tags === undefined || (Array.isArray(saved.method.tags) && saved.method.tags.every((tag) => typeof tag === 'string'))) &&
      ['grade', 'subject', 'teachingScene'].every(
        (key) => typeof saved[key as keyof CreationDraft] === 'string',
      ) &&
      Array.isArray(saved.method.teachingSteps) &&
      saved.method.teachingSteps.every(
        (step) => step && typeof step.condition === 'string' && typeof step.action === 'string',
      ) &&
      Array.isArray(saved.method.principles) &&
      saved.method.principles.every((principle) => typeof principle === 'string') &&
      ['idea', 'method', 'preview'].includes(saved.stage)
    ) {
      const method: TeachingMethod = {
        ...saved.method,
        trigger: saved.method.trigger || saved.method.teachingSteps[0]?.condition || '',
      };
      const descriptor = { ...method, name: method.name || '', summary: method.description || '' };
      const category = teachingCategoryOf(descriptor, saved.teachingScene, assistant.area);
      method.category = category === '未分类' ? null : category;
      method.tags = visibleTeachingTags(method.tags ?? sourceTags ?? teachingTagsOf(descriptor, saved.teachingScene, assistant.area));
      return {
        ...saved,
        method,
        teachingScene: method.category || '',
        exampleIdea: saved.exampleIdea === true,
        stage: saved.stage === 'preview' ? 'method' : saved.stage,
        conversation: Array.isArray(saved.conversation)
          ? saved.conversation.filter(
              (item) =>
                item &&
                [item.questionId, item.question, item.answer].every((value) => typeof value === 'string'),
            )
          : [],
        questionIndex: Number.isInteger(saved.questionIndex)
          ? Math.min(mockQuestions.length, Math.max(0, saved.questionIndex))
          : 0,
        manualEdits: Array.isArray(saved.manualEdits)
          ? saved.manualEdits.filter((field) => typeof field === 'string')
          : [],
        pendingAnswer:
          saved.pendingAnswer &&
          typeof saved.pendingAnswer.questionId === 'string' &&
          typeof saved.pendingAnswer.value === 'string'
            ? saved.pendingAnswer
            : undefined,
        pendingSupplement:
          saved.pendingSupplement &&
          typeof saved.pendingSupplement.condition === 'string' &&
          typeof saved.pendingSupplement.action === 'string'
            ? saved.pendingSupplement
            : undefined,
      };
    }
  } catch {
    /* 本地草稿损坏时仍可重新填写。 */
  }
  if (!assistant.goal && !assistant.skills.length) return defaultCreationDraft();
  const selected = assistant.skills.find((s) => s.id === skillId) || assistant.skills[0];
  const category = selected ? teachingCategoryOf(selected, assistant.activity, assistant.area) : isTeachingCategory(sourceCategory) ? sourceCategory : '未分类';
  const method = selected ? methodFromSkill(selected) : emptyMethod();
  method.category = category === '未分类' ? null : category;
  method.tags = selected ? teachingTagsOf(selected, assistant.activity, assistant.area) : visibleTeachingTags(sourceTags);
  return {
    ...defaultCreationDraft(),
    originalIdea: assistant.goal,
    exampleIdea: false,
    grade: assistant.grade,
    subject: assistant.subject,
    teachingScene: method.category || '',
    stage: selected ? 'method' : 'idea',
    method,
    questionIndex: selected ? 6 : 0,
    editingSkillId: selected?.id,
  };
}

export function DesignerPage({
  assistant,
  storage,
  selectedSkillId,
  sourceTags,
  sourceCategory,
  onBack,
  onSaveExit,
  onUpdate,
  onStartTest,
}: {
  selectedSkillId?: string;
  sourceTags?: string[];
  sourceCategory?: TeachingCategory | null;
  assistant: TeachingAssistant;
  storage: WorkspaceStorage;
  onBack: () => void;
  onSaveExit: () => void;
  onUpdate: (patch: Partial<TeachingAssistant>) => boolean;
  onStartTest: () => boolean;
  isSkillIncluded: (id: string) => boolean;
  onToggleSkill: (id: string) => void;
}) {
  const [draft, setDraft] = useState(() => restore(storage, assistant, selectedSkillId, sourceTags, sourceCategory));
  const [storageError, setStorageError] = useState('');
  const [savedAt, setSavedAt] = useState('');
  const [forming, setForming] = useState(false);
  const previousStage = useRef(draft.stage);
  const headingRef = useRef<HTMLHeadingElement>(null);
  useLayoutEffect(() => {
    if (previousStage.current === draft.stage) return;
    previousStage.current = draft.stage;
    window.scrollTo(0, 0);
    headingRef.current?.focus({ preventScroll: true });
  }, [draft.stage]);
  useEffect(() => {
    if (!forming) return;
    const timer = window.setTimeout(() => {
      if (!onStartTest()) {
        setForming(false);
        setStorageError('方法已整理，核对流程未能保存，请释放存储空间后重试。');
      }
    }, 600);
    return () => window.clearTimeout(timer);
  }, [forming, onStartTest]);
  function save(next: CreationDraft) {
    setDraft(next);
    try {
      storage.setItem(draftKey(assistant.id, selectedSkillId), JSON.stringify({ ...next, sourceRevision: assistant.revision }));
      setStorageError('');
      setSavedAt(new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }));
      return true;
    } catch {
      setStorageError('存储空间不足，请保持此页面打开，避免丢失草稿。');
      return false;
    }
  }
  function edit(next: CreationDraft) {
    save(next);
    const saved = onUpdate({
      status: 'DRAFT',
      isPublic: false,
      name: assistant.name || `${next.grade}${next.subject}教学方法`,
      goal: next.stage === 'idea' ? next.originalIdea : next.method.expectedOutcome || next.originalIdea,
      grade: next.grade,
      subject: next.subject,
      activity: next.teachingScene || '教学实践',
    });
    if (!saved) setStorageError('教学方法保存失败，当前修改仍在页面中，请释放存储空间后重试。');
  }
  function retrySave() {
    if (!save(draft)) return false;
    const saved = onUpdate({
      goal: draft.stage === 'idea' ? draft.originalIdea : draft.method.expectedOutcome || draft.originalIdea,
      grade: draft.grade,
      subject: draft.subject,
      activity: draft.teachingScene || '教学实践',
      name: assistant.name || `${draft.grade}${draft.subject}教学方法`,
    });
    if (!saved) setStorageError('教学方法保存失败，当前修改仍在页面中，请释放存储空间后重试。');
    return saved;
  }
  function confirmMethod() {
    if (forming) return;
    const skill = packageTeachingMethod(
      draft.method,
      draft.editingSkillId || `method-${assistant.id}`,
    );
    if (!save({ ...draft, stage: 'method', editingSkillId: skill.id })) return;
    const saved = onUpdate({
      skills: upsertMethodSkill(assistant.skills, skill),
      revision: (assistant.revision || 1) + 1,
      name: (assistant.skills.length <= 1 ? draft.method.name : '') || assistant.name || `${draft.grade}${draft.subject}教学方法`,
      goal: draft.method.expectedOutcome,
      grade: draft.grade,
      subject: draft.subject,
      activity: draft.teachingScene || '教学实践',
      status: 'DRAFT',
      isPublic: false,
    });
    if (!saved) {
      setStorageError('教学方法保存失败，当前内容仍在页面中，请释放存储空间后重试。');
      return;
    }
    setForming(true);
  }
  return (
    <main className="creation-flow page-frame">
      <header className="creation-heading">
        <button
          className="back-link"
          aria-label="返回"
          onClick={
            draft.stage === 'idea'
              ? onBack
              : () =>
                  save({ ...draft, stage: 'idea' })
          }
        >
          <ArrowLeft />
        </button>
        <h1 ref={headingRef} tabIndex={-1}>
          {selectedSkillId ? '编辑教学方法' : '创建教学方法'}
        </h1>
        <span className="creation-position">
          {draft.stage === 'idea' ? '1 · 教学想法' : '2 · 梳理方法'}
        </span>
        <Button
          variant="ghost"
          onClick={() => {
            if (retrySave()) onSaveExit();
          }}
        >
          保存并退出
        </Button>
      </header>
      {storageError && <p role="alert">{storageError}</p>}
      <SaveFailureExitGuard failed={Boolean(storageError)} onRetry={retrySave} />
      {draft.stage === 'idea' && (
        <IdeaForm
          draft={draft}
          onChange={edit}
          onContinue={() =>
            edit({
              ...draft,
              method: prepareMethod(draft.originalIdea, draft.method),
              stage: 'method',
            })
          }
        />
      )}
      {draft.stage === 'method' && (
        <GuidedMethodPage
          draft={draft}
          onChange={edit}
          onEditIdea={() => save({ ...draft, stage: 'idea' })}
          onConfirm={confirmMethod}
          savedAt={savedAt}
          saveFailed={Boolean(storageError)}
        />
      )}
      <Dialog open={forming}>
        <DialogContent className="skill-creation-transition" showCloseButton={false} onEscapeKeyDown={(event) => event.preventDefault()}
          onInteractOutside={(event) => event.preventDefault()}>
          <LoaderCircle className="spin" aria-hidden="true" />
          <DialogHeader>
            <DialogTitle>SKILL 已创建</DialogTitle>
            <DialogDescription role="status">正在打开方法检验…</DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </main>
  );
}
