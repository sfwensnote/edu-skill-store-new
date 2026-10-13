import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import type { LocalTeachingTask, TaskSubmission } from '../../../shared/marketplace';
export function TaskPreview({
  task,
  onBack,
  onSubmit,
}: {
  task: LocalTeachingTask;
  onBack: () => void;
  onSubmit: (s: TaskSubmission) => boolean;
}) {
  const key = `teaching-method.task-draft:${task.id}`;
  const rawItems =
    task.kind === 'skill'
      ? [
          {
            id: '方法体验',
            title: task.skill?.skill.name || '方法体验',
            text: `请写下你的想法或一个需要帮助的问题。该教学方法会在“${task.skill?.skill.trigger}”时使用。`,
          },
        ]
      : task.level === 1
        ? [
            {
              id: '情境题回答',
              title: task.design?.contextualProblem?.title || '情境问题',
              text: task.design?.contextualProblem?.question || '',
            },
          ]
        : task.level === 2
          ? task.design?.taskChain?.tasks.map((t, i) => ({
              id: `任务 ${i + 1}：${t.title}`,
              title: t.title,
              text: `${t.requirement}\n学习产出：${t.output}`,
            })) || []
          : task.design?.pblProject?.stages
              .split('\n')
              .filter((s) => s.trim())
              .map((s, i) => ({
                id: `阶段 ${i + 1}`,
                title: s,
                text: `记录这个阶段的进展、证据和遇到的问题。\n项目目标：${task.design?.pblProject?.goals}`,
              })) || [];
  const items =
    task.activitySettings?.submission === 'text' && rawItems.length > 1
      ? [
          {
            id: '完整学习记录',
            title: '完整学习记录',
            text: rawItems.map((item, i) => `${i + 1}. ${item.title}\n${item.text}`).join('\n\n'),
          },
        ]
      : rawItems;
  const locked = task.activitySettings?.allowRetry === false && task.submissions.length > 0;
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    try {
      return locked ? task.submissions.at(-1)!.answers : JSON.parse(localStorage.getItem(key) || '{}');
    } catch {
      return {};
    }
  });
  const [index, setIndex] = useState(0);
  const [submitted, setSubmitted] = useState(locked);
  const [message, setMessage] = useState('');
  const item = items[index];
  const ready = items.length > 0 && items.every((i) => answers[i.id]?.trim());
  function answer(value: string) {
    const next = { ...answers, [item.id]: value };
    setAnswers(next);
    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch {
      setMessage('存储空间不足，输入仍在当前页面，请保持页面打开。');
    }
  }
  return (
    <main className="page-frame market-page student-task">
      <button className="back-link" onClick={onBack}>
        <ArrowLeft />
        返回教学任务
      </button>
      <header className="page-title-block">
        <h1>{task.title}</h1>
        <p>{task.instructions}</p>
      </header>
      {task.activitySettings && (
        <section className="market-panel">
          <h2>任务安排</h2>
          <p>
            提交方式：{task.activitySettings.submission === 'stages' ? '逐项记录任务或阶段' : '文字回答'} ·{' '}
            {task.activitySettings.allowRetry ? '允许多次尝试' : '一次提交'}
          </p>
          <p>截止时间：{task.activitySettings.endsAt.replace('T', ' ') || '未设置'}</p>
          {task.supportSkill && (
            <p>
              智能支持配置：{task.supportSkill.skill.name} · 本次预览不执行
             教学方法。
            </p>
          )}
        </section>
      )}
      {task.design && (
        <section className="market-panel">
          <h2>{task.level === 3 ? '项目驱动问题' : '情境背景'}</h2>
          <p>{task.design.contextualProblem?.context}</p>
          {task.level === 3 && (
            <>
              <p>{task.design.pblProject?.drivingQuestion}</p>
              <p>项目成果：{task.design.pblProject?.outcome}</p>
              <p>评价要求：{task.design.pblProject?.evaluation}</p>
            </>
          )}
        </section>
      )}
      {submitted ? (
        <section className="market-panel submission-complete">
          <Check />
          <h2>学习记录已提交</h2>
          <p>【教师预设提示】{task.feedback}</p>
          {task.kind === 'skill' && (
            <p>
              方法提示
              {task.skill?.skill.steps?.[0]?.action || task.skill?.skill.behaviorSteps[0]}
            </p>
          )}
          <p className="subtle">{locked ? '仅允许一次提交' : '可返回修改并再次提交'}</p>
          <Button variant="outline" onClick={() => setSubmitted(false)}>
            继续查看我的回答
          </Button>
        </section>
      ) : (
        <section className="market-panel">
          <nav className="student-progress" aria-label="学习进度">
            {items.map((i, n) => (
              <button key={i.id} className={n === index ? 'active' : ''} onClick={() => setIndex(n)}>
                {answers[i.id]?.trim() ? '✓ ' : ''}
                {task.level === 3 ? '阶段' : task.level === 2 ? '任务' : '回答'} {n + 1}
              </button>
            ))}
          </nav>
          {item && (
            <>
              <h2>{item.title}</h2>
              <p className="preserve-lines">{item.text}</p>
              <label className="form-field">
                {task.level === 3 ? '阶段学习记录' : '我的回答'}
                <Textarea
                  aria-label={task.level === 3 ? '阶段学习记录' : '我的回答'}
                  rows={7}
                  disabled={locked}
                  value={answers[item.id] || ''}
                  onChange={(e) => answer(e.target.value)}
                  placeholder="写下你的过程、依据或需要的帮助……"
                  maxLength={6000}
                />
              </label>
              <div className="inline-actions">
                <Button variant="outline" disabled={index === 0} onClick={() => setIndex(index - 1)}>
                  上一步
                </Button>
                {index < items.length - 1 ? (
                  <Button disabled={!answers[item.id]?.trim()} onClick={() => setIndex(index + 1)}>
                    记录完成，下一步
                    <ArrowRight />
                  </Button>
                ) : (
                  <Button
                    disabled={!ready || locked}
                    onClick={() => {
                      const saved = onSubmit({
                        answers: { ...answers },
                        submittedAt: new Date().toISOString(),
                        feedback: task.feedback,
                      });
                      if (!saved) {
                        setMessage('学习记录保存失败，回答仍在当前页面，请释放存储空间后重试。');
                        return;
                      }
                      setSubmitted(true);
                      setMessage('');
                    }}
                  >
                    提交学习记录
                  </Button>
                )}
              </div>
              {!ready && index === items.length - 1 && <p className="subtle">请完成各步骤的记录后提交。</p>}
            </>
          )}
          {message && <p role="status">{message}</p>}
        </section>
      )}
    </main>
  );
}
