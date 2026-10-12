import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { SkillEntry } from '../../../shared/marketplace';
import { dimensionLabels, type Detection } from '../../../shared/execution';
import { compileSkillInstructions } from '../../../shared/skill-preview';
import { executionApi, executionChanged, failureMessage, methodInput, serviceConfigured } from './api';
import { Transcript } from './Transcript';
import './execution.css';

const statuses = { running: '检测中', review: '待教师确认', failed: '未通过', verified: '已验证' };
const verdictLabels = { pass: '符合', fail: '不符合', uncertain: '证据不足', 'not-applicable': '不涉及' };
export function MethodDetectionPage({ entries, onBack, onAdjust, onConfirmed }: {
  entries: SkillEntry[]; onBack: () => void; onAdjust?: () => void; onConfirmed?: () => void;
}) {
  const [selected, setSelected] = useState(entries[0]?.id || '');
  const entry = entries.find(item => item.id === selected);
  const [detection, setDetection] = useState<Detection | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [agree, setAgree] = useState(false);
  useEffect(() => {
    if (!entry) return;
    let disposed = false;
    setDetection(null); setAgree(false); setError('');
    void executionApi<Detection[]>(`/detections?entryId=${encodeURIComponent(entry.id)}`)
      .then(rows => { if (!disposed) setDetection(rows[0] || null); }).catch(error => { if (!disposed) setError(failureMessage(error)); });
    return () => { disposed = true; };
  }, [selected]);
  useEffect(() => {
    if (detection?.status !== 'running') return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      void executionApi<Detection>(`/detections/${detection.id}`).then(result => {
        if (!disposed) { setDetection(result); setError(''); if (result.status !== 'running') executionChanged(); }
      }).catch(error => { if (!disposed) { setError(failureMessage(error)); setDetection(previous => previous ? { ...previous } : null); } });
    }, 1500);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [detection]);
  async function act(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setError('');
    try { await work(); } catch (error) { setError(failureMessage(error)); }
    finally { setBusy(false); }
  }
  const stale = !!entry && !!detection && compileSkillInstructions(entry.skill) !== compileSkillInstructions(detection.method.skill);
  const done = detection?.cases.filter(item => item.verdicts.length === 4).length || 0;
  return <main className="page-frame execution-page">
    <header className="execution-heading"><button className="back-link" onClick={onBack}><ArrowLeft />返回上一步</button>
      <div><h1>{entry?.skill.name || '教学 SKILL'}<span>方法检测</span></h1>
        <p>{detection ? !serviceConfigured && detection.status === 'verified' ? '教师已核对' : statuses[detection.status]
          : serviceConfigured ? '检查模型能否按教学方法执行' : '查看教学情境与回复，核对你的教学方法'}</p></div>
      <div className="execution-progress"><progress aria-label="方法检测进度" max={detection?.cases.length || 1} value={done} /><span>{done} / {detection?.cases.length || 0}</span></div>
    </header>
    {entries.length > 1 && <label className="form-field">选择 SKILL<select value={selected} disabled={busy} onChange={event => setSelected(event.target.value)}>{entries.map(item => <option key={item.id} value={item.id}>{item.skill.name}</option>)}</select></label>}
    {stale && <p role="alert">方法已修改，以下是旧方法的检测记录。请重新检测。</p>}
    {error && <p className="execution-error" role="alert">{error}</p>}
    {detection?.error && <p className="execution-error" role="alert">{detection.error}</p>}
    <div className="inline-actions"><Button disabled={!entry || busy || detection?.status === 'running'} onClick={() => void act(async () => {
      setAgree(false); setDetection(await executionApi<Detection>('/detections', methodInput(entry!))); executionChanged();
    })}>{busy ? '正在处理…' : detection ? '重新检测' : '开始检测'}</Button>
      {onAdjust && <Button variant="outline" onClick={onAdjust}>修改方法</Button>}
    </div>
    {detection?.status === 'running' && <p role="status">{serviceConfigured ? '正在生成情境并调用模型，离开页面后检测会继续。' : '正在准备教学情境与回复…'}</p>}
    <div className="execution-cases">{detection?.cases.map(item => <section className="market-panel execution-case" key={item.id}>
      <h2>{item.title}</h2><p>{item.scenario}</p><p className="subtle">核验要求：{item.expected}</p>
      <Transcript messages={item.messages} />
      {!item.verdicts.length ? <p className="subtle">等待执行与核验</p> : <ul className="execution-verdicts">{item.verdicts.map(verdict => <li key={verdict.dimension} data-status={verdict.status}>
        <strong>{dimensionLabels[verdict.dimension]} · {!serviceConfigured && verdict.status === 'uncertain' ? '请核对' : verdictLabels[verdict.status]}</strong><p>{verdict.reason}</p>
        {verdict.evidence.map((e, index) => <blockquote key={index}>{e.quote}</blockquote>)}
      </li>)}</ul>}
    </section>)}</div>
    {detection?.status === 'review' && !stale && <section className="market-panel execution-confirm">
      <h2>教师确认</h2><label><input type="checkbox" checked={agree} onChange={event => setAgree(event.target.checked)} />{serviceConfigured ? '我已查看实际回复，执行符合我的教学方法。' : '我已核对情境和回复，确认符合我的教学方法。'}</label>
      <Button disabled={!agree || busy} onClick={() => void act(async () => {
        setDetection(await executionApi<Detection>(`/detections/${detection.id}/confirm`, {})); executionChanged(); onConfirmed?.();
      })}>确认检测结果</Button>
    </section>}
    {detection?.status === 'verified' && !stale && <p role="status">教师已确认，可将这项方法挂载到学伴。</p>}
    <footer className="execution-footer"><Button variant="outline" onClick={onBack}><ArrowLeft data-icon="inline-start" />返回上一步</Button></footer>
  </main>;
}
