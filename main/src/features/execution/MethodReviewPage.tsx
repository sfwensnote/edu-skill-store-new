import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SaveFailureExitGuard } from '@/components/SaveFailureExitGuard';
import { dimensionLabels } from '../../../shared/execution';
import { compileSkillInstructions } from '../../../shared/skill-preview';
import { browserPreviewApi } from './preview-runtime';
import { executionChanged, failureMessage, methodInput } from './api';
import { reviewProgress, type CaseEdit, type ReviewedDetection } from './case-review';
import type { MethodDetectionProps } from './MethodDetectionPage';
import { Transcript } from './Transcript';
import './execution.css';

export function MethodReviewPage({ entries, onBack, onConfirmed, onRevise }: MethodDetectionProps) {
  const [selected, setSelected] = useState(entries[0]?.id || '');
  const entry = entries.find(item => item.id === selected);
  const [detection, setDetection] = useState<ReviewedDetection | null>(null);
  const [edit, setEdit] = useState<CaseEdit | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let disposed = false;
    setDetection(null); setEdit(null); setError(''); setLoading(true);
    void browserPreviewApi<ReviewedDetection[]>(`/detections?entryId=${encodeURIComponent(selected)}`)
      .then(rows => { if (!disposed) setDetection(rows[0] || null); })
      .catch(error => { if (!disposed) setError(failureMessage(error)); })
      .finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; };
  }, [selected]);
  useEffect(() => {
    if (detection?.status !== 'running') return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      void browserPreviewApi<ReviewedDetection>(`/detections/${detection.id}`).then(value => {
        if (!disposed) { setDetection(value); setError(''); }
      }).catch(error => { if (!disposed) { setError(failureMessage(error)); setDetection(value => value && { ...value }); } });
    }, 800);
    return () => { disposed = true; clearTimeout(timer); };
  }, [detection]);
  const progress = detection ? reviewProgress(detection) : { cursor: 0, confirmed: 0 };
  const item = detection?.cases[progress.cursor];
  const stale = !!entry && !!detection && compileSkillInstructions(entry.skill) !== detection.fingerprint;
  const locked = busy || loading || stale || detection?.status === 'running';
  async function act(work: () => Promise<void>) {
    if (busy) return false;
    setBusy(true); setError('');
    try { await work(); return true; } catch (error) { setError(failureMessage(error)); return false; }
    finally { setBusy(false); }
  }
  async function review(operation: string, caseId = item?.id) {
    if (!detection || !entry || !caseId) return;
    const next = await browserPreviewApi<ReviewedDetection>(`/detections/${detection.id}/${operation}`,
      { caseId, fingerprint: detection.fingerprint, ...(edit ? { edit } : {}) },
      onRevise && !entry.addedFrom ? method => onRevise(entry, method) : undefined);
    setDetection(next); setEdit(null); executionChanged();
    if (next.status === 'verified' && operation === 'confirm-case') onConfirmed?.();
  }
  const saveEdit = () => act(() => review('revise-case'));
  return <main className="page-frame execution-page">
    <SaveFailureExitGuard failed={!!edit && !!error} onRetry={saveEdit} />
    <header className="execution-heading">
      <button className="back-link" onClick={onBack}><ArrowLeft />返回上一步</button>
      <h1>{entry?.skill.name || '教学 SKILL'}<span>方法检测</span></h1>
      <p>{detection?.status === 'verified' && !stale ? '教师已核对' : '逐个核对情境和回复，确认后继续。'}</p>
      <div className="execution-progress"><progress aria-label="方法检测进度" max={detection?.cases.length || 1} value={progress.confirmed} /><span>已确认 {progress.confirmed} / {detection?.cases.length || 0}</span></div>
    </header>
    {entries.length > 1 && <label className="form-field">选择 SKILL<select value={selected} disabled={busy || !!edit} onChange={event => setSelected(event.target.value)}>{entries.map(entry => <option key={entry.id} value={entry.id}>{entry.skill.name}</option>)}</select></label>}
    {stale && <p role="alert">方法已修改，请重新检测。</p>}
    {error && <p className="execution-error" role="alert">{error}</p>}
    {loading && <p role="status">正在读取核对进度…</p>}
    {(!detection || stale || detection.status === 'failed') && <Button disabled={!entry || busy || loading} onClick={() => void act(async () => {
      setDetection(await browserPreviewApi<ReviewedDetection>('/detections', methodInput(entry!))); setEdit(null); executionChanged();
    })}>{detection ? '重新检测' : '开始检测'}</Button>}
    {detection?.status === 'running' && <p role="status">正在准备教学情境与回复…</p>}
    {item && detection?.status !== 'running' && <div className="execution-cases"><section className="market-panel execution-case">
      <div className="execution-case-heading"><h2>{item.title}</h2><span className="subtle">{progress.cursor + 1} / {detection!.cases.length}{progress.cursor < progress.confirmed ? ' · 已确认' : ''}</span></div>
      {edit ? <form className="execution-case-editor" onSubmit={event => { event.preventDefault(); void saveEdit(); }}>
        <div className="form-field"><label htmlFor="review-scenario">{item.kind === 'ending' ? '结束条件' : '情况描述'}</label><textarea id="review-scenario" autoFocus rows={3} maxLength={500} required value={edit.scenario} disabled={busy} onChange={event => setEdit({ ...edit, scenario: event.target.value })} /></div>
        {item.kind !== 'ending' && <div className="form-field"><label htmlFor="review-action">教师做法</label><textarea id="review-action" rows={3} maxLength={500} required value={edit.action} disabled={busy} onChange={event => setEdit({ ...edit, action: event.target.value })} /></div>}
        <p className="subtle">保存后同步到原 SKILL，并重新核对{item.kind === 'ending' ? '所有情况' : '当前及后续情况'}。</p>
        <div className="inline-actions"><Button type="button" variant="outline" disabled={busy} onClick={() => { setEdit(null); setError(''); }}>取消修改</Button><Button disabled={locked || !edit.scenario.trim() || !edit.action.trim()} type="submit">保存并重新核对</Button></div>
      </form> : <>
        <p>{item.scenario}</p><p className="subtle">教师做法：{item.expected}</p>
        <Transcript messages={item.messages} />
        <ul className="execution-verdicts">{item.verdicts.map(verdict => <li key={verdict.dimension}><strong>{dimensionLabels[verdict.dimension]} · {verdict.status === 'not-applicable' ? '不涉及' : '请核对'}</strong><p>{verdict.reason}</p></li>)}</ul>
        <footer className="execution-case-actions">
          <Button variant="outline" disabled={locked || progress.cursor === 0} onClick={() => void act(() => review('view-case', detection!.cases[progress.cursor - 1].id))}>返回上一步</Button>
          <div className="inline-actions">{onRevise && !entry?.addedFrom && <Button variant="outline" disabled={locked} onClick={() => setEdit({ scenario: item.scenario, action: item.expected })}>修改描述</Button>}
            <Button disabled={locked || (detection?.status === 'verified' && progress.cursor === detection.cases.length - 1)} onClick={() => void act(() => review('confirm-case'))}>{progress.cursor === detection!.cases.length - 1 ? detection?.status === 'verified' ? '已完成核对' : '确认并完成检测' : '确认并继续'}</Button></div>
        </footer>
      </>}
    </section></div>}
    {detection?.status === 'verified' && !stale && <p className="execution-complete" role="status">教师已确认，可将这项方法挂载到学伴。</p>}
  </main>;
}
