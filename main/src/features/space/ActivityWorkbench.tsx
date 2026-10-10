import { useLayoutEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogHeader } from '@/components/ui/dialog';
import { DesignPreview } from '@/features/inquiry/DesignPreview';
import { ViewTabs } from '@/components/ViewTabs';
import type { LocalTeachingTask, SkillEntry } from '../../../shared/marketplace';
import {
  activityStepIssue,
  type LearningResource,
  type TeachingActivityDraft,
} from '../../../shared/teaching-activity';
import { ActivityPreview } from './ActivityPreview';
import { LearningActivityFields } from './LearningActivityFields';
import { SkillApplicationFields } from './SkillApplicationFields';

export function ActivityWorkbench({
  draft,
  dirty,
  saved,
  message,
  resources,
  entries,
  ownedIds,
  tasks,
  onChange,
  onSave,
  onClose,
  onSwitch,
  onStudentPreview,
  onWorkshop,
  onSkill,
  onAdjust,
}: {
  draft: TeachingActivityDraft;
  dirty: boolean;
  saved: boolean;
  message: string;
  resources: LearningResource[];
  entries: SkillEntry[];
  ownedIds: string[];
  tasks: LocalTeachingTask[];
  onChange: (draft: TeachingActivityDraft) => void;
  onSave: () => void;
  onClose: () => void;
  onSwitch: (path?: TeachingActivityDraft['path']) => void;
  onStudentPreview: () => void;
  onWorkshop: () => void;
  onSkill: (id: string) => void;
  onAdjust: (entry: SkillEntry) => void;
}) {
  const steps =
    draft.path === 'learning'
      ? ['选择作品', '任务要求', '教学支持', '预览保存']
      : ['选择 SKILL', '选择任务', '模拟检查', '保存配置'];
  const [mobileTab, setMobileTab] = useState<'configure' | 'preview'>('configure');
  const [error, setError] = useState('');
  const [detailOpen, setDetailOpen] = useState(false);
  const pageRef = useRef<HTMLElement>(null);
  const configureRef = useRef<HTMLElement>(null);
  const footerRef = useRef<HTMLElement>(null);
  const errorRef = useRef<HTMLParagraphElement>(null);
  const previousStep = useRef(`${draft.id}:${draft.step}`);
  useLayoutEffect(() => {
    const footer = footerRef.current;
    if (!footer) return;
    const measure = () =>
      pageRef.current?.style.setProperty(
        '--activity-bottom-height',
        `${footer.getBoundingClientRect().height}px`,
      );
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(footer);
    return () => observer.disconnect();
  }, [draft.step, message, dirty]);
  useLayoutEffect(() => {
    const key = `${draft.id}:${draft.step}`;
    if (previousStep.current === key) return;
    previousStep.current = key;
    configureRef.current?.focus({ preventScroll: true });
    configureRef.current?.scrollIntoView({ block: 'start' });
  }, [draft.id, draft.step]);
  useLayoutEffect(() => {
    if (error) {
      errorRef.current?.focus({ preventScroll: true });
      errorRef.current?.scrollIntoView({ block: 'center' });
    }
  }, [error]);
  const resource = draft.path === 'learning' ? resources.find((r) => r.key === draft.resourceKey) : undefined;
  const issue = activityStepIssue(draft, resources, entries, ownedIds, tasks);
  function update(next: TeachingActivityDraft) {
    setError('');
    onChange(next);
  }
  return (
    <main ref={pageRef} className="page-frame market-page activity-workbench">
      <header className="activity-workbench-heading">
        <div>
          <button className="back-link" onClick={onClose}>
            <ArrowLeft aria-hidden="true" />
            {draft.path === 'learning' ? '返回任务列表' : '返回我的作品'}
          </button>
          <h1>{draft.path === 'learning' ? '新建教学任务' : '应用教学 SKILL'}</h1>
        </div>
        <div className="activity-inline-actions">
          {draft.step < 4 && <Button variant="outline" onClick={onSave}>
            <Save data-icon="inline-start" aria-hidden="true" />
            保存草稿
          </Button>}
        </div>
      </header>
      <nav className="activity-stepper" aria-label={draft.path === 'learning' ? '创建任务进度' : '方法应用进度'}>
        <ol>
          {steps.map((title, index) => (
            <li
              key={title}
              aria-current={draft.step === index + 1 ? 'step' : undefined}
              data-complete={draft.step > index + 1}
            >
              <span>{index + 1}</span>
              <strong>{title}</strong>
            </li>
          ))}
        </ol>
      </nav>
      <ViewTabs
        className="activity-mobile-tabs"
        label="工作台视图"
        value={mobileTab}
        onChange={setMobileTab}
        items={[
          { value: 'configure', label: draft.path === 'learning' ? '配置任务' : '配置方法', panelId: 'activity-configure-panel' },
          { value: 'preview', label: '实时预览', panelId: 'activity-preview-panel' },
        ]}
      />
      <div className="activity-workbench-grid">
        <section
          ref={configureRef}
          className="activity-configure-panel"
          id="activity-configure-panel"
          role="tabpanel"
          aria-labelledby="activity-configure-panel-tab"
          data-mobile-active={mobileTab === 'configure'}
          aria-label="任务配置"
          tabIndex={-1}
        >
          {draft.path === 'learning' ? (
            <LearningActivityFields
              draft={draft}
              resources={resources}
              entries={entries}
              ownedIds={ownedIds}
              onChange={update}
              onWorkshop={onWorkshop}
              onResourcePreview={() => setDetailOpen(true)}
              onSkill={onSkill}
            />
          ) : (
            <SkillApplicationFields
              draft={draft}
              entries={entries}
              ownedIds={ownedIds}
              tasks={tasks}
              onChange={update}
              onSkill={onSkill}
              onAdjust={onAdjust}
              onLearning={() => onSwitch('learning')}
            />
          )}
          {error && (
            <p ref={errorRef} tabIndex={-1} className="activity-form-error" role="alert">
              {error}
            </p>
          )}
          {draft.step === 4 && issue && (
            <p className="activity-form-error" role="alert">
              {issue}
            </p>
          )}
        </section>
        <aside
          className="activity-preview-panel"
          id="activity-preview-panel"
          role="tabpanel"
          aria-labelledby="activity-preview-panel-tab"
          data-mobile-active={mobileTab === 'preview'}
          aria-label="任务实时预览"
        >
          <ActivityPreview
            draft={draft}
            resources={resources}
            entries={entries}
            tasks={tasks}
            onDetailedPreview={() => setDetailOpen(true)}
          />
        </aside>
      </div>
      <footer ref={footerRef} className="activity-bottom-bar">
        <div className="activity-bottom-inner">
          <div className="activity-bottom-status">
            <strong>
              {draft.step} / 4 · {steps[draft.step - 1]}
            </strong>
            <span role="status">{message || (dirty ? '有未保存修改' : saved ? '已保存到本机' : '尚未填写')}</span>
          </div>
          <div className="activity-bottom-actions">
            <Button
              variant="outline"
              onClick={() => (draft.step > 1 ? update({ ...draft, step: draft.step - 1 }) : onClose())}
            >
              <ArrowLeft aria-hidden="true" data-icon="inline-start" />
              {draft.step === 1 ? '返回' : '上一步'}
            </Button>
            {draft.step < 4 ? (
              <Button
                onClick={() => {
                  if (issue) {
                    setError(issue);
                    setMobileTab('configure');
                    return;
                  }
                  update({ ...draft, step: draft.step + 1 });
                  setMobileTab('configure');
                }}
              >
                下一步
                <ArrowRight aria-hidden="true" data-icon="inline-end" />
              </Button>
            ) : (
              <>
                {draft.path === 'learning' && (
                  <Button variant="outline" disabled={!!issue} onClick={onStudentPreview}>
                    打开学生预览
                  </Button>
                )}
                <Button onClick={onSave}>{draft.path === 'learning' ? '保存草稿' : '保存配置'}</Button>
              </>
            )}
          </div>
        </div>
        {draft.step === 4 && (
          <p id="activity-final-limitation" className="activity-final-limitation">
            {draft.path === 'learning'
              ? '尚未开放学生发布，可保存草稿和预览。'
              : '运行环境与执行验证尚未接入，仅可保存配置。'}
          </p>
        )}
      </footer>
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="activity-design-dialog">
          <DialogHeader>
            <DialogTitle>学习作品详细设计</DialogTitle>
            <DialogDescription className="sr-only">学习作品只读预览。</DialogDescription>
          </DialogHeader>
          {resource && <DesignPreview design={resource.design} level={resource.level} teacher={false} />}
        </DialogContent>
      </Dialog>
    </main>
  );
}
