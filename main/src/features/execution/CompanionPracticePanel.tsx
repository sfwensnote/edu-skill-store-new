import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { companionIssue, type LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import type { Trial, TrialSession } from '../../../shared/execution';
import { previewCases } from '../../../shared/execution-preview';
import { compileSkillInstructions } from '../../../shared/skill-preview';
import { executionApi, failureMessage, methodInput } from './api';
import { useVerification } from './useVerification';
import { TrialChat } from './TrialChat';

type Detail = { trial: Trial; sessions: TrialSession[] };
export function CompanionPracticePanel({ value, skills, onCheck, onEdit }: {
  value: LearningCompanion; skills: SkillEntry[]; onCheck: (entry: SkillEntry) => void; onEdit: () => void;
}) {
  const verification = useVerification();
  const selected = skills.filter(entry => value.skillIds.includes(entry.id));
  const [trials, setTrials] = useState<Trial[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [caseId, setCaseId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const session = detail?.sessions[0];
  const issue = companionIssue(value, skills);
  const ready = !issue && selected.length > 0 && selected.every(verification.verified);
  const isOpen = detail?.trial.status === 'open' && Date.parse(detail.trial.expiresAt) > Date.now();
  const cases = useMemo(() => detail?.trial.methods.flatMap(method => previewCases(method).map(example => ({ method, example }))) || [], [detail?.trial]);
  const last = session?.messages.at(-1)?.activations[0];
  const resumed = last && cases.find(item => item.method.entryId === last.entryId &&
    item.example.target === last.step && (item.example.kind === 'ending') === last.ended);
  const current = cases.find(item => item.example.id === caseId) || resumed || cases[0];
  const stale = detail && (JSON.stringify(detail.trial.companion.task) !== JSON.stringify(value.task) ||
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
  async function act(work: () => Promise<void>) {
    if (busy) return; setBusy(true); setError('');
    try { await work(); } catch (error) { setError(failureMessage(error)); }
    finally { setBusy(false); }
  }
  return <section className="market-panel execution-trial-panel">
    <h2>学伴试运行</h2><p className="subtle">选择教学情境，以学生身份输入。</p>
    {!ready && <div className="execution-method-gate">
      {issue && <><p>{issue}</p><Button variant="outline" onClick={onEdit}>完善学伴信息</Button></>}
      {selected.filter(entry => !verification.verified(entry)).map(entry => <Button key={entry.id} variant="outline" onClick={() => onCheck(entry)}>核对：{entry.skill.name}</Button>)}
      {verification.error && <p role="alert">{verification.error}</p>}
    </div>}
    <div className="inline-actions"><Button disabled={busy || !ready} onClick={() => void act(async () => {
      const result = await executionApi<{ trial: Trial }>('/trials', { companion: value, methods: selected.map(methodInput), hours: 168, capacity: 1 });
      await executionApi(`/trials/${result.trial.id}/teacher-session`, {}); setCaseId(''); await refresh(result.trial.id);
    })}>{session ? '开始新的试运行' : '开始试运行'}</Button>
      {isOpen && <Button variant="outline" disabled={busy} onClick={() => void act(async () => {
        await executionApi(`/trials/${detail!.trial.id}/stop`, { status: 'closed' }); await refresh(detail!.trial.id);
      })}>结束试运行</Button>}
    </div>
    {error && <p className="execution-error" role="alert">{error}</p>}
    {stale && <p className="subtle">方法或场景已修改，当前对话保留原内容。开始新的试运行可使用新设置。</p>}
    {trials.length > 1 && <label className="form-field execution-trial-history">试运行记录<select value={detail?.trial.id || ''} disabled={busy} onChange={event => {
      const id = event.target.value; setCaseId(''); void act(() => refresh(id));
    }}>{trials.map(trial => <option key={trial.id} value={trial.id}>{new Date(trial.createdAt).toLocaleString('zh-CN')} · {trial.status === 'open' && Date.parse(trial.expiresAt) > Date.now() ? '运行中' : '已结束'}</option>)}</select></label>}
    {session && current && <section className="execution-self-test">
      <label className="form-field">教学情境<select value={current.example.id} disabled={busy || !isOpen} onChange={event => setCaseId(event.target.value)}>
        {cases.map(item => <option key={item.example.id} value={item.example.id}>{item.method.skill.name} · {item.example.title}</option>)}
      </select></label>
      <p className="subtle">{current.example.scenario}</p>
      <TrialChat key={session.id} session={session} disabled={!isOpen} traceLabel="当前教学情境" inputLabel="以学生身份输入" initialInput={current.example.studentTurns[0]}
        onSend={async (content, requestId) => {
          setBusy(true); setError('');
          try {
            await new Promise(resolve => window.setTimeout(resolve, 250));
            const next = await executionApi<TrialSession>(`/sessions/${session.id}/turn`, { content, requestId, entryId: current.method.entryId, caseId: current.example.id });
            setDetail(previous => previous ? { ...previous, sessions: [next] } : previous); return next;
          } finally { setBusy(false); }
        }} />
    </section>}
  </section>;
}
