import { ClipboardList } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/Workbench';
import type { LocalTeachingTask, SkillEntry } from '../../../shared/marketplace';
import { draftTitle, levelNames, type TeachingActivityDraft } from '../../../shared/teaching-activity';

export function ActivityList({
  drafts,
  tasks,
  entries,
  onResume,
  onPreview,
  onNew,
}: {
  drafts: TeachingActivityDraft[];
  tasks: LocalTeachingTask[];
  entries: SkillEntry[];
  onResume: (draft: TeachingActivityDraft) => void;
  onPreview: (id: string) => void;
  onNew: () => void;
}) {
  const learningDrafts = drafts.filter((draft) => draft.path === 'learning');
  const learningTasks = tasks.filter((task) => task.kind === 'design');
  const oldTasks = learningTasks.filter((task) => !learningDrafts.some((draft) => draft.id === task.id));
  function records(task?: LocalTeachingTask) {
    return (
      task && (
        <>
          <small>本机预览记录 · {task.submissions.length} 次提交</small>
          {!!task.submissions.length && (
            <details className="activity-submissions">
              <summary>查看学习记录</summary>
              {task.submissions.map((submission, index) => (
                <section key={index}>
                  <strong>
                    提交 {index + 1} · {new Date(submission.submittedAt).toLocaleString('zh-CN')}
                  </strong>
                  {Object.entries(submission.answers).map(([key, value]) => (
                    <p key={key}>
                      {key}：{value}
                    </p>
                  ))}
                  <p>教师预设反馈：{submission.feedback}</p>
                </section>
              ))}
            </details>
          )}
        </>
      )
    );
  }
  return (
    <section className="activity-list">
      <div className="activity-list-heading">
        <h2>我的任务</h2>
        <Button onClick={onNew}>新建任务</Button>
      </div>
      {!learningDrafts.length && !learningTasks.length && (
        <EmptyState
          title="还没有教学任务"
        />
      )}
      {learningDrafts.map((draft) => {
        const task = learningTasks.find((t) => t.id === draft.id);
        return (
          <article className="activity-list-item local-task" key={draft.id}>
            <span className="activity-list-icon">
              <ClipboardList aria-hidden="true" />
            </span>
            <div className="activity-list-copy">
              <h3>{draftTitle(draft, entries)}</h3>
              <p>
                任务草稿 · 第{' '}
                {draft.step} / 4 步
              </p>
              {records(task)}
            </div>
            <div className="activity-inline-actions">
              <Button variant="outline" onClick={() => onResume(draft)}>
                {task?.submissions.length ? '创建配置副本' : '继续编辑'}
              </Button>
              {task && (
                <Button variant="outline" onClick={() => onPreview(task.id)}>
                  打开学生预览
                </Button>
              )}
            </div>
          </article>
        );
      })}
      {oldTasks.map((task) => (
        <article className="activity-list-item local-task" key={task.id}>
          <span className="activity-list-icon">
            <ClipboardList aria-hidden="true" />
          </span>
          <div className="activity-list-copy">
            <h3>{task.title}</h3>
            <p>{levelNames[task.level]} · 本机预览</p>
            {records(task)}
          </div>
          <Button variant="outline" onClick={() => onPreview(task.id)}>
            打开学生预览
          </Button>
        </article>
      ))}
    </section>
  );
}
