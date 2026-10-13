import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import type { Trial, TrialReport, TrialSession } from '../../../shared/execution';
import { executionApi, failureMessage, methodInput, serviceConfigured, serviceIssue } from './api';
import { useVerification } from './useVerification';
import { TrialChat } from './TrialChat';
import { TrialReportView } from './TrialReportView';
import { Transcript } from './Transcript';
import { CompanionPracticePanel } from './CompanionPracticePanel';
import './execution.css';

type TrialDetail = { trial: Trial; sessions: TrialSession[]; reports: TrialReport[] };
type PanelProps = {
  value: LearningCompanion; skills: SkillEntry[]; onEdit: () => void; onCheck: (entry: SkillEntry) => void; onMethods: () => void;
};
export function CompanionTrialPanel(props: PanelProps) {
  return serviceConfigured ? <ServerCompanionTrialPanel {...props} /> : <CompanionPracticePanel {...props} />;
}
export function ServerCompanionTrialPanel({ value, skills, onEdit, onCheck, onMethods }: PanelProps) {
  const verification = useVerification();
  const selected = skills.filter(entry => value.skillIds.includes(entry.id));
  const [trials, setTrials] = useState<Trial[]>([]);
  const [detail, setDetail] = useState<TrialDetail | null>(null);
  const [chat, setChat] = useState<TrialSession | null>(null);
  const [link, setLink] = useState('');
  const [capacity, setCapacity] = useState(5);
  const [hours, setHours] = useState(48);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(serviceConfigured ? '' : serviceIssue());
  const [copied, setCopied] = useState(false);
  const trial = detail?.trial;
  const isOpen = trial?.status === 'open' && Date.parse(trial.expiresAt) > Date.now();
  const ready = selected.length > 0 && selected.length === value.skillIds.length && selected.every(verification.verified);
  async function refresh(id?: string) {
    const rows = await executionApi<Trial[]>(`/trials?companionId=${encodeURIComponent(value.id)}`); setTrials(rows);
    const chosen = id || rows[0]?.id;
    setDetail(chosen ? await executionApi<TrialDetail>(`/trials/${chosen}`) : null);
  }
  useEffect(() => {
    if (!serviceConfigured) return;
    let disposed = false;
    void executionApi<Trial[]>(`/trials?companionId=${encodeURIComponent(value.id)}`).then(async rows => {
      if (disposed) return; setTrials(rows);
      const detail = rows[0] ? await executionApi<TrialDetail>(`/trials/${rows[0].id}`) : null;
      if (!disposed) setDetail(detail);
    }).catch(error => { if (!disposed) setError(failureMessage(error)); });
    return () => { disposed = true; };
  }, [value.id]);
  useEffect(() => {
    if (detail?.reports[0]?.status !== 'running') return;
    let disposed = false;
    const timer = window.setTimeout(() => {
      void executionApi<TrialDetail>(`/trials/${detail.trial.id}`).then(result => { if (!disposed) setDetail(result); })
        .catch(error => { if (!disposed) { setError(failureMessage(error)); setDetail(previous => previous ? { ...previous } : null); } });
    }, 1500);
    return () => { disposed = true; window.clearTimeout(timer); };
  }, [detail]);
  async function act(work: () => Promise<void>) {
    if (busy) return; setBusy(true); setError('');
    try { await work(); } catch (error) { setError(failureMessage(error)); }
    finally { setBusy(false); }
  }
  async function start() {
    const result = await executionApi<{ trial: Trial; invitation: string }>('/trials', { companion: value, methods: selected.map(methodInput), hours, capacity });
    setLink(''); setCopied(false); setChat(null); await refresh(result.trial.id); return result.trial;
  }
  return <section className="market-panel execution-trial-panel">
    <h2>学伴试发布</h2><p className="subtle">先试用，再邀请少量学生。结束后核对对话和方法执行情况。</p>
    {!ready && <div className="execution-method-gate"><p>已添加的教学方法需要完成验证并由教师确认。</p>
      {selected.filter(entry => !verification.verified(entry)).map(entry => <Button key={entry.id} variant="outline" onClick={() => onCheck(entry)}>检测：{entry.skill.name}</Button>)}
      {verification.error && verification.error !== error && <p role="alert">{verification.error}</p>}
    </div>}
    <div className="execution-trial-settings"><label className="form-field">学生人数上限<input type="number" min={1} max={30} value={capacity} disabled={busy} onChange={event => setCapacity(Number(event.target.value))} /></label>
      <label className="form-field">链接有效期<select value={hours} disabled={busy} onChange={event => setHours(Number(event.target.value))}><option value={24}>24 小时</option><option value={48}>48 小时</option><option value={168}>7 天</option></select></label>
    </div>
    <div className="inline-actions"><Button disabled={busy || !serviceConfigured || (!isOpen && !ready)} onClick={() => void act(async () => {
      const target = isOpen ? trial! : await start(); setChat(await executionApi<TrialSession>(`/trials/${target.id}/teacher-session`, {}));
    })}>教师自行试用</Button>
      <Button variant="outline" disabled={busy || !serviceConfigured || (!isOpen && !ready)} onClick={() => void act(async () => {
        const target = isOpen ? trial! : await start();
        const result = await executionApi<{ invitation: string }>(`/trials/${target.id}/invitation`, {});
        setLink(`${location.origin}${location.pathname}#/try/${result.invitation}`); setCopied(false);
      })}>生成学生试用链接</Button>
      {isOpen && <Button variant="outline" disabled={busy} onClick={() => void act(async () => {
        await executionApi(`/trials/${trial!.id}/stop`, { status: 'closed' }); setLink(''); await refresh(trial!.id);
      })}>结束试用</Button>}
    </div>
    {error && <p className="execution-error" role="alert">{error}</p>}
    {link && <div className="execution-trial-link"><label className="form-field">学生试用链接<input readOnly value={link} onFocus={event => event.target.select()} /></label>
      <Button variant="outline" onClick={() => void navigator.clipboard.writeText(link).then(() => setCopied(true)).catch(() => setError('复制失败，请选中链接手动复制。'))}>{copied ? '已复制' : '复制链接'}</Button>
      <p className="subtle">重新生成会撤销旧邀请链接，已进入的学生可继续本次试用。</p></div>}
    {trials.length > 0 && <div className="execution-trial-history"><label className="form-field">试用记录<select value={trial?.id || ''} disabled={busy} onChange={event => {
      const id = event.target.value; setChat(null); setLink(''); void act(() => refresh(id));
    }}>{trials.map(item => <option value={item.id} key={item.id}>{new Date(item.createdAt).toLocaleString('zh-CN')} · {item.status === 'open' && Date.parse(item.expiresAt) > Date.now() ? '开放中' : '已结束'}</option>)}</select></label>
      {trial && <p className="subtle">本次保留创建时的场景、材料和方法。名额 {trial.capacity} 人，有效期至 {new Date(trial.expiresAt).toLocaleString('zh-CN')}。</p>}
      <Button variant="outline" disabled={busy} onClick={() => void act(() => refresh(trial?.id))}>刷新记录</Button>
      {isOpen && <Button variant="outline" disabled={busy} onClick={() => void act(async () => {
        await executionApi(`/trials/${trial!.id}/stop`, { status: 'revoked' }); setLink(''); await refresh(trial!.id);
      })}>撤销本次试用</Button>}
    </div>}
    {chat && <section className="execution-self-test"><h3>教师自行试用</h3><p className="subtle">此处对话不计入学生表现报告。</p>
      <TrialChat key={chat.id} session={chat} disabled={!isOpen} onSend={(content, requestId) => executionApi(`/sessions/${chat.id}/turn`, { content, requestId })} /></section>}
    {detail && <section className="execution-student-records"><h3>学生交互记录</h3>
      {!detail.sessions.some(item => item.audience === 'student') && <p className="subtle">暂无学生试用记录。</p>}
      {detail.sessions.filter(item => item.audience === 'student').map(item => <details key={item.id}><summary>{item.name} · {item.messages.filter(m => m.role === 'assistant').length} 轮回复{item.pending ? ' · 回复中' : ''}</summary>
        <Transcript messages={item.messages} />{item.error && <p role="alert">{item.error}</p>}
        {!!item.failures?.length && <details><summary>请求异常记录</summary>{item.failures.map((failure, index) => <p key={index}>{new Date(failure.at).toLocaleString('zh-CN')}：{failure.error}</p>)}</details>}</details>)}
    </section>}
    {trial && !isOpen && (!detail?.reports.length || detail.reports[0].status === 'failed') && <Button disabled={busy} onClick={() => void act(async () => {
      await executionApi(`/trials/${trial.id}/report`, {}); await refresh(trial.id);
    })}>{busy ? '正在分析对话…' : '生成回收报告'}</Button>}
    {detail?.reports[0]?.status === 'running' && <p role="status">正在分析学生对话，离开后报告会继续生成。</p>}
    {detail?.reports[0]?.status === 'failed' && <p role="alert">{detail.reports[0].error}</p>}
    {detail?.reports[0]?.status === 'ready' && <TrialReportView key={detail.reports[0].id} initial={detail.reports[0]} sessions={detail.sessions} onEdit={onEdit} onMethods={onMethods} />}
  </section>;
}
