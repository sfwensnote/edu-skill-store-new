import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, MessageSquarePlus, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { companionIssue, type LearningCompanion } from '../../../shared/learning-companion';
import type { SkillEntry } from '../../../shared/marketplace';
import type { RecordedMessage, Trial, TrialSession } from '../../../shared/execution';
import { practiceInputs } from '../../../shared/companion-practice';
import { isCompanionCaseMethod } from '../../../shared/companion-cases';
import { executionApi, failureMessage, methodInput, serviceConfigured } from './api';
import { useVerification } from './useVerification';
import { ServerCompanionTrialPanel } from './CompanionTrialPanel';
import { CompanionAvatar } from '../companions/CompanionProfile';
import { TaskSummary } from '../companions/TaskElements';
import './execution.css';

type Detail = { trial: Trial; sessions: TrialSession[] };
type PageProps = {
  value: LearningCompanion; skills: SkillEntry[]; onBack: () => void; onEdit: () => void;
  onCheck: (entry: SkillEntry) => void; onMethods: () => void;
};

export function CompanionPracticePage(props: PageProps) {
  return serviceConfigured ? <ServerPracticePage {...props} /> : <PreviewPracticePage {...props} />;
}

function ServerPracticePage({ value, skills, onBack, onEdit, onCheck, onMethods }: PageProps) {
  return <main className="page-frame market-page companion-page companion-practice-page">
    <header className="companion-practice-heading page-heading">
      <button className="back-link" onClick={onBack}><ArrowLeft />返回学伴</button>
      <PracticeIdentity value={value} />
    </header>
    <ServerCompanionTrialPanel value={value} skills={skills} onEdit={onEdit} onCheck={onCheck} onMethods={onMethods} />
  </main>;
}

function PracticeIdentity({ value, mode }: { value: LearningCompanion; mode?: string }) {
  return <div className="companion-practice-identity">
    <span className="companion-practice-avatar"><CompanionAvatar value={value} /></span>
    <div><div className="companion-practice-name"><h1>{value.name || '未命名学伴'}</h1>
      {mode && <span className="companion-practice-mode">{mode}</span>}</div>
      <p>{[value.grade, value.subject, value.year].filter(Boolean).join(' · ') || '适用范围待填写'}</p></div>
  </div>;
}

function PreviewPracticePage({ value, skills, onBack, onEdit, onCheck, onMethods }: PageProps) {
  const verification = useVerification();
  const selected = skills.filter(entry => value.skillIds.includes(entry.id));
  const [trials, setTrials] = useState<Trial[]>([]);
  const [detail, setDetail] = useState<Detail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [sending, setSending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const session = detail?.sessions[0];
  const isOpen = Boolean(detail && detail.trial.status === 'open' && Date.parse(detail.trial.expiresAt) > Date.now());
  const issue = companionIssue(value, skills);
  const ready = !issue && selected.every(entry => {
    try { return (!serviceConfigured && isCompanionCaseMethod(value, methodInput(entry))) || verification.verified(entry); }
    catch { return verification.verified(entry); }
  });
  const suggestions = detail ? practiceInputs(detail.trial.companion, detail.trial.methods) : [];

  async function refresh(id?: string) {
    const rows = await executionApi<Trial[]>(`/trials?companionId=${encodeURIComponent(value.id)}`);
    setTrials(rows);
    const chosen = id || rows[0]?.id;
    setDetail(chosen ? await executionApi<Detail>(`/trials/${chosen}`) : null);
  }

  useEffect(() => {
    let disposed = false;
    void executionApi<Trial[]>(`/trials?companionId=${encodeURIComponent(value.id)}`).then(async rows => {
      if (disposed) return;
      const next = rows[0] ? await executionApi<Detail>(`/trials/${rows[0].id}`) : null;
      if (!disposed) { setTrials(rows); setDetail(next); }
    }).catch(reason => { if (!disposed) setError(failureMessage(reason)); })
      .finally(() => { if (!disposed) setLoadingHistory(false); });
    return () => { disposed = true; };
  }, [value.id]);

  async function act(work: () => Promise<void>) {
    if (busy) return; setBusy(true); setError('');
    try { await work(); } catch (reason) { setError(failureMessage(reason)); }
    finally { setBusy(false); }
  }

  function start() {
    void act(async () => {
      setStarting(true);
      const settled = await executionApi<{ trial: Trial }>('/trials', {
        companion: value, methods: selected.map(methodInput), hours: 168, capacity: 1,
      });
      await executionApi(`/trials/${settled.trial.id}/teacher-session`, {});
      await refresh(settled.trial.id);
    }).finally(() => setStarting(false));
  }

  const end = () => void act(async () => {
    await executionApi(`/trials/${detail!.trial.id}/stop`, { status: 'closed' });
    await refresh(detail!.trial.id);
  });

  return <main className="page-frame market-page companion-page companion-practice-page">
    <header className="companion-practice-heading page-heading">
      <button className="back-link" onClick={onBack}><ArrowLeft />返回学伴</button>
      <PracticeIdentity value={value} mode="规则预览" />
      <div className="companion-practice-actions">
        <Button variant="outline" disabled={busy || sending || loadingHistory || !ready} onClick={start}><MessageSquarePlus data-icon="inline-start" />{session ? '新对话' : '开始试运行'}</Button>
        {isOpen && <Button variant="outline" disabled={busy || sending} onClick={end}><Square data-icon="inline-start" />结束试运行</Button>}
      </div>
    </header>

    {!ready && <section className="market-panel execution-method-gate">
      {issue ? <><p>{issue}</p><Button variant="outline" onClick={onEdit}>完善学伴信息</Button></> : null}
      {selected.filter(entry => {
        try { return !isCompanionCaseMethod(value, methodInput(entry)); } catch { return true; }
      }).filter(entry => !verification.verified(entry)).map(entry =>
        <Button key={entry.id} variant="outline" onClick={() => onCheck(entry)}>核对：{entry.skill.name}</Button>)}
      <Button variant="link" onClick={onMethods}>查看我的 SKILL</Button>
      {verification.error && <p role="alert">{verification.error}</p>}
    </section>}

    <details className="market-panel companion-practice-context" open={!session || undefined}>
      <summary>{session ? '本次学习场景与教学方法' : '开始前的场景与方法'}</summary>
      {detail ? <div className="companion-practice-context-body">
        <TaskSummary task={detail.trial.companion.task} />
        <p className="subtle">教学方法：{detail.trial.methods.map(method => method.skill.name).join('、')}</p>
        {!!detail.trial.companion.materials.length && <p className="subtle">教学材料：{detail.trial.companion.materials.map(item => item.name).join('、')}</p>}
      </div> : <div className="companion-practice-context-body">
        <TaskSummary task={value.task} />
        <p className="subtle">教学方法：{selected.map(entry => entry.skill.name).join('、') || '尚未选择'}</p>
      </div>}
    </details>

    {trials.length > 1 && <label className="form-field companion-practice-history">历史记录
      <select value={detail?.trial.id || ''} disabled={busy || sending} onChange={event => void act(() => refresh(event.target.value))}>
        {trials.map(item => <option key={item.id} value={item.id}>{new Date(item.createdAt).toLocaleString('zh-CN')} · {item.status === 'open' && Date.parse(item.expiresAt) > Date.now() ? '进行中' : '已结束'}</option>)}
      </select>
    </label>}

    {error && <p className="execution-error" role="alert">{error}</p>}

    <section className="market-panel companion-practice-chat" aria-label="学伴试运行对话">
      {!session ? <div className="companion-practice-empty">
        <p>{loadingHistory ? '正在读取试运行记录…' : starting ? '正在开始…' : ready ? '从上方开始试运行，以学生身份与学伴连续对话。' : '请先完成上方提示，再开始试运行。'}</p>
      </div> : <PracticeChat key={session.id} session={session} disabled={!isOpen} suggestions={suggestions}
        companionName={detail?.trial.companion.name || value.name} onBusyChange={setSending}
        onSend={async (content, requestId) => {
          const next = await executionApi<TrialSession>(`/sessions/${session.id}/practice-turn`, { content, requestId });
          setDetail(previous => previous ? { ...previous, sessions: [next] } : previous);
          return next;
        }} />}
    </section>
  </main>;
}

function PracticeChat({ session, onSend, disabled, suggestions, companionName, onBusyChange }: {
  session: TrialSession; disabled: boolean; suggestions: string[];
  companionName: string; onBusyChange: (busy: boolean) => void;
  onSend: (content: string, requestId: string) => Promise<TrialSession>;
}) {
  const [messages, setMessages] = useState<RecordedMessage[]>(session.messages);
  const [input, setInput] = useState(session.messages.length ? '' : suggestions[0] || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<{ content: string; requestId: string } | null>(null);
  const endRef = useRef<HTMLLIElement>(null);

  useEffect(() => { if (session.messages.length) requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' })); }, []);

  async function send(pending?: { content: string; requestId: string }) {
    const content = (pending?.content ?? input).trim();
    if (!content || busy || disabled) return;
    const requestId = pending?.requestId || crypto.randomUUID();
    setBusy(true); onBusyChange(true); setError(''); setFailed(null);
    try {
      const next = await onSend(content, requestId);
      setMessages(next.messages);
      requestAnimationFrame(() => endRef.current?.scrollIntoView({ block: 'end' }));
      if (next.error) { setError(next.error); setFailed({ content, requestId }); }
      else setInput('');
    } catch (reason) {
      setError(failureMessage(reason)); setFailed({ content, requestId });
    } finally { setBusy(false); onBusyChange(false); }
  }

  return <div className="companion-chat">
    <ol className="companion-chat-log" aria-label="对话记录" aria-live="polite">
      {!messages.length && <li className="companion-chat-hint">先在下方写出学生的第一句话。</li>}
      {messages.map(message => <li key={message.id} data-role={message.role} className="companion-chat-message">
        <span className="companion-chat-meta">{message.role === 'user' ? '学生' : companionName || '学伴'}</span>
        <p className="companion-chat-bubble">{message.content}</p>
        {message.role === 'assistant' && !!message.activations.length && <details className="companion-chat-trace"><summary>本次参考</summary>
          {message.activations.map((item, index) => <p key={`${message.id}:${index}`}>{item.ended ? '判断达到结束条件' : `选择第 ${item.step + 1} 步`}：{item.reason}</p>)}
        </details>}
      </li>)}
      <li ref={endRef} aria-hidden="true" />
    </ol>
    {busy && <p role="status" className="companion-chat-status">学伴正在回复…</p>}
    {error && <p className="execution-error" role="alert">{error}{failed && <Button variant="link" disabled={busy} onClick={() => void send(failed)}>重试</Button>}</p>}
    {disabled ? <p className="subtle companion-chat-status">本次对话已结束，记录仍保留。可以开始新对话或查看历史记录。</p> :
      <form className="companion-chat-composer" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label className="form-field">以学生身份输入
          <Textarea rows={2} value={input} maxLength={2000} disabled={busy}
            placeholder="输入学生的表达，Enter 发送，Shift+Enter 换行"
            onChange={event => setInput(event.target.value)}
            onKeyDown={event => {
              if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) {
                event.preventDefault(); void send();
              }
            }} />
        </label>
        <div className="companion-chat-actions">
          {!!suggestions.length && <details className="practice-suggestions"><summary>填入学生表达</summary>
            <div>{suggestions.map((text, index) => <button key={index} type="button" disabled={busy} onClick={() => setInput(text)}>{text.split('\n').at(-1)}</button>)}</div>
          </details>}
          <Button type="submit" disabled={busy || !input.trim()}><Send data-icon="inline-start" />{busy ? '正在回复…' : '发送'}</Button>
        </div>
      </form>}
  </div>;
}
