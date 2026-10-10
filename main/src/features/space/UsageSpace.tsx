import { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { goTo, readRoute, routeHash } from '@/lib/routes';
import type { ContextualDesign, DesignLevel } from '../../../shared/contextual-design';
import type { LocalTeachingTask, SkillEntry } from '../../../shared/marketplace';
import {
  activityStepIssue,
  learningResources,
  learningTaskSnapshot,
  newActivityDraft,
  type TeachingActivityDraft,
} from '../../../shared/teaching-activity';
import { ActivityWorkbench } from './ActivityWorkbench';
import { ActivityList } from './ActivityList';
import './activity.css';
import './activity-details.css';
import './activity-responsive.css';

export function UsageSpace({
  skills,
  ownedSkillIds,
  designs,
  tasks,
  drafts,
  onSaveDraft,
  onPreview,
  onSkill,
  initialSelection,
  initialDraftId,
  backLabel,
  onBack,
  onWorkshop,
  onAdjust,
}: {
  skills: SkillEntry[];
  ownedSkillIds: string[];
  designs: ContextualDesign[];
  tasks: LocalTeachingTask[];
  drafts: TeachingActivityDraft[];
  onSaveDraft: (draft: TeachingActivityDraft, task?: LocalTeachingTask) => boolean;
  onPreview: (id: string, draftId?: string) => void;
  onSkill: (id: string, draftId?: string) => void;
  initialSelection?: string;
  initialDraftId?: string;
  backLabel: string;
  onBack: () => void;
  onWorkshop: () => void;
  onAdjust: (entry: SkillEntry, draftId?: string) => void;
  onDesign?: (id: string, level: DesignLevel) => void;
}) {
  const resources = learningResources(designs);
  const [draft, setDraft] = useState<TeachingActivityDraft | null>(() => {
    const saved = drafts.find((d) => d.id === initialDraftId);
    if (saved) return structuredClone(saved);
    if (!initialSelection) return null;
    const next = newActivityDraft(
      initialSelection.startsWith('skill:') ? 'skill' : 'learning',
      crypto.randomUUID(),
    );
    if (next.path === 'skill') {
      next.skillId = initialSelection.slice(6);
      next.skillVersion = skills.find((e) => e.id === next.skillId)?.version;
    } else {
      const resource = resources.find((r) => r.key === initialSelection);
      next.resourceKey = initialSelection;
      if (resource)
        next.settings = {
          ...next.settings,
          title: resource.title,
          instructions: '请独立尝试，写清思考过程，并说明你的依据与遇到的困难。',
          submission: resource.level === 1 ? 'text' : 'stages',
        };
    }
    return next;
  });
  const [dirty, setDirty] = useState(!!initialSelection && !initialDraftId);
  const dirtyRef = useRef(dirty);
  const [message, setMessage] = useState(
    initialDraftId && !drafts.some((d) => d.id === initialDraftId)
      ? '没有找到这份草稿，请从我的任务或我的作品中继续。'
      : '',
  );
  const [pending, setPending] = useState<(() => void) | null>(null);
  const saveRef = useRef<() => boolean>(() => false);
  const currentHash = useRef(window.location.hash);
  function change(next: TeachingActivityDraft) {
    if (tasks.find((task) => task.id === next.id)?.submissions.length) {
      next = { ...next, id: crypto.randomUUID() };
      if (next.path === 'learning')
        next = { ...next, settings: { ...next.settings, title: `${next.settings.title}（副本）` } };
    }
    setDraft({ ...next, updatedAt: new Date().toISOString() });
    setDirty(true);
    dirtyRef.current = true;
    setMessage('');
  }
  function save() {
    if (!draft) return false;
    const saved = { ...draft, updatedAt: new Date().toISOString() };
    let task: LocalTeachingTask | undefined;
    if (
      saved.path === 'learning' &&
      saved.step === 4 &&
      !activityStepIssue(saved, resources, skills, ownedSkillIds, tasks)
    ) {
      const resource = resources.find((r) => r.key === saved.resourceKey)!;
      task = learningTaskSnapshot(
        saved,
        resource,
        skills.find((e) => e.id === saved.supportSkillId),
        tasks.find((t) => t.id === saved.id),
      );
    }
    if (!onSaveDraft(saved, task)) {
      setMessage('草稿保存失败，修改仍在当前页面，请释放存储空间后重试。');
      return false;
    }
    workingRoute(saved.id);
    setDraft(saved);
    setDirty(false);
    dirtyRef.current = false;
    setMessage(saved.path === 'learning' ? '任务草稿已保存到本机' : 'SKILL 应用配置已保存，尚未启用');
    return true;
  }
  saveRef.current = save;
  function leave(action: () => void) {
    if (dirtyRef.current) setPending(() => action);
    else action();
  }
  function workingRoute(draftId?: string) {
    const route = readRoute();
    if (route.page !== 'space') return;
    currentHash.current = routeHash({ page: 'space', draftId, returnTo: route.returnTo });
    window.history.replaceState(null, '', currentHash.current);
  }
  function start(path: TeachingActivityDraft['path']) {
    workingRoute();
    setDraft(newActivityDraft(path, crypto.randomUUID()));
    setDirty(false);
    dirtyRef.current = false;
    setMessage('');
  }
  function close() {
    workingRoute();
    setDraft(null);
    setDirty(false);
    dirtyRef.current = false;
    setMessage('');
  }
  function switchPath(path?: TeachingActivityDraft['path']) {
    leave(() => {
      setDraft(null);
      setDirty(false);
      dirtyRef.current = false;
      setMessage('');
      workingRoute();
      if (path) start(path);
    });
  }
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (dirtyRef.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    }
    // 捕获哈希切换，先处理未保存内容，再允许公共导航或浏览器返回离开。
    function guardNavigation(event: HashChangeEvent) {
      const destination = window.location.hash;
      if (destination === currentHash.current) {
        if (dirtyRef.current) event.stopImmediatePropagation();
        return;
      }
      if (!dirtyRef.current) {
        currentHash.current = destination;
        return;
      }
      window.history.replaceState(null, '', currentHash.current);
      event.stopImmediatePropagation();
      setPending(() => () => {
        currentHash.current = destination;
        goTo(readRoute(destination));
      });
    }
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('hashchange', guardNavigation, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('hashchange', guardNavigation, true);
    };
  }, []);
  function studentPreview() {
    if (
      !draft ||
      draft.path !== 'learning' ||
      activityStepIssue(draft, resources, skills, ownedSkillIds, tasks)
    )
      return;
    if (save()) onPreview(draft.id, draft.id);
  }
  const guardDialog = (
    <Dialog open={!!pending} onOpenChange={(open) => !open && setPending(null)}>
      <DialogContent className="activity-leave-dialog">
        <DialogHeader>
          <DialogTitle>保存当前修改？</DialogTitle>
          <DialogDescription>保存草稿，或放弃未保存的修改。</DialogDescription>
        </DialogHeader>
        {message.includes('保存失败') && (
          <p className="activity-form-error" role="alert">
            {message}
          </p>
        )}
        <div className="activity-dialog-actions">
          <Button variant="outline" onClick={() => setPending(null)}>
            继续编辑
          </Button>
          <Button
            variant="ghost"
            onClick={() => {
              const action = pending;
              setPending(null);
              setDirty(false);
              dirtyRef.current = false;
              action?.();
            }}
          >
            放弃修改
          </Button>
          <Button
            onClick={() => {
              if (!saveRef.current()) return;
              const action = pending;
              setPending(null);
              action?.();
            }}
          >
            保存并继续
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
  if (draft)
    return (
      <>
        <ActivityWorkbench
          draft={draft}
          dirty={dirty}
          saved={drafts.some((item) => item.id === draft.id)}
          message={message}
          resources={resources}
          entries={skills}
          ownedIds={ownedSkillIds}
          tasks={tasks.filter((item) => item.kind === 'design')}
          onChange={change}
          onSave={save}
          onClose={() => leave(draft.path === 'skill' ? onBack : close)}
          onSwitch={switchPath}
          onStudentPreview={studentPreview}
          onWorkshop={() => leave(onWorkshop)}
          onSkill={(id) =>
            leave(() => {
              const source = readRoute();
              onSkill(id, source.page === 'space' ? source.draftId : undefined);
            })
          }
          onAdjust={(entry) =>
            leave(() => {
              const source = readRoute();
              onAdjust(entry, source.page === 'space' ? source.draftId : undefined);
            })
          }
        />
        {guardDialog}
      </>
    );
  return (
    <main className="page-frame market-page teaching-activities-page">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft aria-hidden="true" />
        {backLabel}
      </button>
      <header className="activity-page-heading">
        <div>
          <h1>教学任务</h1>
        </div>
        <img src="/workshop-folders.svg" alt="" aria-hidden="true" />
      </header>
      {message && <p role="status" className="activity-notice">{message}</p>}
        <ActivityList
          drafts={drafts.filter((item) => item.path === 'learning')}
          tasks={tasks.filter((item) => item.kind === 'design')}
          entries={skills}
          onResume={(saved) => {
            const next = structuredClone(saved);
            if (tasks.find((t) => t.id === next.id)?.submissions.length) {
              next.id = crypto.randomUUID();
              workingRoute();
              if (next.path === 'learning') next.settings.title += '（副本）';
              change(next);
              setMessage('已有学习记录，已创建独立配置副本，原活动记录保留。');
            } else {
              workingRoute(next.id);
              setDraft(next);
              setDirty(false);
              dirtyRef.current = false;
              setMessage('');
            }
          }}
          onPreview={(id) => onPreview(id, drafts.some((d) => d.id === id) ? id : undefined)}
          onNew={() => start('learning')}
        />
      {guardDialog}
    </main>
  );
}
