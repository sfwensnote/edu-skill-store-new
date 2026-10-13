import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { companionIssue, learningAudiences, learningScenarios, type LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import type { Trial, TrialSession } from '../../../shared/execution';
import { practiceInputs } from '../../../shared/companion-practice';
import { compileSkillInstructions } from '../../../shared/skill-preview';
import { executionApi, failureMessage, methodInput } from './api';
import { useVerification } from './useVerification';
import { TrialChat } from './TrialChat';
import { TaskSummary } from '../companions/TaskElements';

type Detail = { trial: Trial; sessions: TrialSession[] };
export function CompanionPracticePanel({ value, skills, onCheck, onEdit }: {
  value: LearningCompanion; skills: SkillEntry[]; onCheck: (entry: SkillEntry) => void; onEdit: () => void;
}) {
  const verification = useVerification();
  const selected = skills.filter(entry => value.skillIds.includes(entry.id));
  const [trials, setTrials] = useState<Trial[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [task, setTask] = useState(value.task);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const session = detail?.sessions[0];
  const issue = companionIssue({ ...value, task }, skills);
  const ready = !issue && selected.length > 0 && selected.every(verification.verified);
  const isOpen = detail?.trial.status === 'open' && Date.parse(detail.trial.expiresAt) > Date.now();
  const suggestions = detail ? practiceInputs(detail.trial.companion, detail.trial.methods) : [];
  const stale = detail && (JSON.stringify(detail.trial.companion.task) !== JSON.stringify(task) ||
    detail.trial.methods.some(method => !selected.some(entry => entry.id === method.entryId && compileSkillInstructions(entry.skill) === compileSkillInstructions(method.skill))));
  async function refresh(id?: string) {
    const rows = await executionApi<Trial[]>(`/trials?companionId=${encodeURIComponent(value.id)}`); setTrials(rows);
    const chosen = id || rows[0]?.id;
    setDetail(chosen ? await executionApi<Detail>(`/trials/${chosen}`) : null);
  }
  useEffect(() => {
    let disposed = false;
    void executionApi<Trial[]>(`/trials?companionId=${encodeURIComponent(value.id)}`).then(async rows => {
      if (disposed) return;
      const next = rows[0] ? await executionApi<Detail>(`/trials/${rows[0].id}`) : null;
      if (!disposed) { setTrials(rows); setDetail(next); }
    }).catch(error => { if (!disposed) setError(failureMessage(error)); });
    return () => { disposed = true; };
  }, [value.id]);
  useEffect(() => { setTask(value.task); }, [value.task]);
  async function act(work: () => Promise<void>) {
    if (busy) return; setBusy(true); setError('');
    try { await work(); } catch (error) { setError(failureMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="market-panel execution-trial-panel">
    <h2>学伴试运行</h2><p className="subtle">以学生身份进入学习场景，观察学伴如何使用教学方法。</p>
    {!ready && <div className="execution-method-gate">
      {issue && <><p>{issue}</p><Button variant="outline" onClick={onEdit}>完善学伴信息</Button></>}
      {selected.filter(entry => !verification.verified(entry)).map(entry => <Button key={entry.id} variant="outline" onClick={() => onCheck(entry)}>核对：{entry.skill.name}</Button>)}
      {verification.error && <p role="alert">{verification.error}</p>}
    </div>}
    <details className="practice-setup" open={!session || undefined}><summary>{session ? '新试运行的场景设置' : '本次试运行的场景'}</summary>
      <p className="subtle">已填入学伴的设置，可调整后开始。修改仅用于新试运行。</p>
      <div className="execution-trial-settings">{([['audience', '学习对象', learningAudiences], ['scenario', '学习情境', learningScenarios]] as const).map(([key, label, options]) => <label className="form-field" key={key}>{label}<select value={task[key]} disabled={busy} onChange={event => setTask({ ...task, [key]: event.target.value })}>
        <option value="">请选择{label}</option>{[...new Set([...options, task[key]].filter(Boolean))].map(option => <option key={option}>{option}</option>)}
      </select></label>)}</div>
      <label className="form-field">学习任务与目标<textarea rows={3} maxLength={4000} value={task.taskAndGoals} disabled={busy} onChange={event => setTask({ ...task, taskAndGoals: event.target.value })} /></label>
    </details>
    <div className="inline-actions"><Button disabled={busy || !ready} onClick={() => void act(async () => {
      const result = await executionApi<{ trial: Trial }>('/trials', { companion: { ...value, task }, methods: selected.map(methodInput), hours: 168, capacity: 1 });
      await executionApi(`/trials/${result.trial.id}/teacher-session`, {}); await refresh(result.trial.id);
    })}>{session ? '开始新的试运行' : '开始试运行'}</Button>
      {isOpen && <Button variant="outline" disabled={busy} onClick={() => void act(async () => {
        await executionApi(`/trials/${detail!.trial.id}/stop`, { status: 'closed' }); await refresh(detail!.trial.id);
      })}>结束试运行</Button>}
    </div>
    {error && <p className="execution-error" role="alert">{error}</p>}
    {stale && <p className="subtle">当前记录保留创建时的场景和方法。开始新的试运行可使用上方设置。</p>}
    {trials.length > 1 && <label className="form-field execution-trial-history">试运行记录<select value={detail?.trial.id || ''} disabled={busy} onChange={event => {
      const id = event.target.value; void act(() => refresh(id));
    }}>{trials.map(trial => <option key={trial.id} value={trial.id}>{new Date(trial.createdAt).toLocaleString('zh-CN')} · {trial.status === 'open' && Date.parse(trial.expiresAt) > Date.now() ? '运行中' : '已结束'}</option>)}</select></label>}
    {session && detail && <section className="execution-self-test">
      <div className="practice-context"><h3>本次学习场景</h3><TaskSummary task={detail.trial.companion.task} /><p className="subtle">已添加的教学方法：{detail.trial.methods.map(method => method.skill.name).join('、')}</p>
        {!!detail.trial.companion.materials.length && <p className="subtle">教学材料：{detail.trial.companion.materials.map(material => material.name).join('、')}</p>}
      </div>
      <TrialChat key={session.id} session={session} disabled={!isOpen} traceLabel="教学方法使用记录" inputLabel="以学生身份输入" initialInput={session.messages.length ? '' : suggestions[0]} suggestions={suggestions}
        onSend={async (content, requestId) => {
          setBusy(true); setError('');
          try {
            await new Promise(resolve => window.setTimeout(resolve, 250));
            const next = await executionApi<TrialSession>(`/sessions/${session.id}/practice-turn`, { content, requestId });
            setDetail(previous => previous ? { ...previous, sessions: [next] } : previous); return next;
          } finally { setBusy(false); }
        }} />
    </section>}
  </section>;
}
