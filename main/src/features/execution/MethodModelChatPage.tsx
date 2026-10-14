import { useEffect, useRef, useState } from 'react';
import { ArrowLeft, Download, MessageSquarePlus, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { SaveFailureExitGuard } from '@/components/SaveFailureExitGuard';
import type { SkillEntry } from '../../../shared/marketplace';
import { methodMarkdown, type MethodChatMessage, type MethodChatRecord } from '../../../shared/method-chat';
import { browserPreviewApi } from './preview-runtime';
import { executionChanged, failureMessage, methodInput } from './api';
import { methodModelStatus, methodModelTurn, type MethodModelStatus } from './method-chat-api';
import type { MethodDetectionProps } from './MethodDetectionPage';
import './method-model-chat.css';
import { ModelReply } from './ModelReply';

export function MethodModelChatPage(props: MethodDetectionProps) {
  const [selected, setSelected] = useState(props.entries[0]?.id || '');
  const [busy, setBusy] = useState(false);
  const entry = props.entries.find(item => item.id === selected) || props.entries[0];
  return <main className="page-frame method-model-page">
    <header className="method-model-heading"><button className="back-link" onClick={props.onBack}><ArrowLeft />返回编辑</button>
      <div><h1>教学方法验证<span>{entry?.skill.name || '教学方法'}</span></h1><p>自由对话体验教学方法，由你决定是否通过测验。</p></div>
      {props.onAdjust && <Button variant="outline" disabled={busy} onClick={props.onAdjust}>修改教学方法</Button>}
    </header>
    {props.entries.length > 1 && <label className="method-model-selector">选择教学方法<select value={entry?.id || ''} disabled={busy} onChange={event => setSelected(event.target.value)}>{props.entries.map(item => <option key={item.id} value={item.id}>{item.skill.name}</option>)}</select></label>}
    {entry ? <ModelConversation key={`${entry.id}:${methodMarkdown(entry.skill)}`} {...props} entry={entry} onSelect={setSelected} onBusyChange={setBusy} /> : <section className="market-panel"><p>没有可加载的教学方法，请返回编辑并完成整理。</p></section>}
  </main>;
}

function ModelConversation({ entry, entries, onConfirmed, onPublish, onFinish, onBack, onSelect, onBusyChange }: MethodDetectionProps & {
  entry: SkillEntry; onSelect: (id: string) => void; onBusyChange: (busy: boolean) => void;
}) {
  const markdown = methodMarkdown(entry.skill);
  const [status, setStatus] = useState<MethodModelStatus>({ ready: false, model: '' });
  const [statusError, setStatusError] = useState('');
  const [loading, setLoading] = useState(true);
  const [record, setRecord] = useState<MethodChatRecord | null>(null);
  const [history, setHistory] = useState<MethodChatRecord[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<MethodChatMessage | null>(null);
  const [historyReady, setHistoryReady] = useState(false);
  const [pendingSave, setPendingSave] = useState<MethodChatRecord | null>(null);
  const [pendingMethods, setPendingMethods] = useState<string[]>([]);
  const active = useRef<AbortController | null>(null);
  const alive = useRef(true);
  const sending = useRef(false);
  const messageList = useRef<HTMLOListElement>(null);
  const messages = record?.messages || [];
  useEffect(() => {
    let disposed = false;
    alive.current = true;
    void methodModelStatus().then(value => { if (!disposed) { setStatus(value); setStatusError(value.ready ? '' : '模型服务尚未配置。'); } })
      .catch(reason => { if (!disposed) setStatusError(failureMessage(reason)); });
    void browserPreviewApi<MethodChatRecord[]>(`/method-chats?entryId=${encodeURIComponent(entry.id)}`).then(rows => {
      if (disposed) return;
      const matching = rows.filter(row => row.fingerprint === markdown);
      setHistory(matching); setRecord(matching[0] || null); setHistoryReady(true);
    }).catch(reason => { if (!disposed) setError(failureMessage(reason)); }).finally(() => { if (!disposed) setLoading(false); });
    return () => { disposed = true; alive.current = false; active.current?.abort(); onBusyChange(false); };
  }, []);
  useEffect(() => { const list = messageList.current; if (list) list.scrollTop = list.scrollHeight; }, [messages.length, pendingMessage, generating]);
  function lock(value: boolean) { sending.current = value; setBusy(value); onBusyChange(value); }
  async function persist(next: MethodChatRecord) {
    try {
      const saved = await browserPreviewApi<MethodChatRecord>('/method-chats', next);
      if (alive.current) { setRecord(saved); setPendingSave(null); setError(''); setHistory(rows => [saved, ...rows.filter(row => row.id !== saved.id)]); }
      return true;
    } catch (reason) { if (alive.current) { setPendingSave(next); setError(failureMessage(reason)); } return false; }
  }
  async function send() {
    const content = input.trim();
    if (!content || sending.current || !status.ready || pendingSave || loading || !historyReady) return;
    if (messages.length >= 40) { setError('本次对话较长，请开始新对话。'); return; }
    lock(true); setGenerating(true); setError(''); setPendingMethods([]);
    const controller = new AbortController(); active.current = controller;
    const user: MethodChatMessage = { id: crypto.randomUUID(), role: 'user', content, at: new Date().toISOString() };
    setPendingMessage(user);
    try {
      const reply = await methodModelTurn(methodInput(entry), [...messages, user], controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      if (reply.fingerprint !== markdown) throw new Error('回复所用的方法与当前内容不同，未保存。请重新开始。');
      const now = new Date().toISOString();
      const next: MethodChatRecord = { id: record && record.model === reply.model ? record.id : crypto.randomUUID(), method: methodInput(entry), fingerprint: markdown, model: reply.model,
        messages: [...messages, user, { id: crypto.randomUUID(), role: 'assistant', content: reply.content, at: now }], createdAt: record?.createdAt || user.at, updatedAt: now };
      setRecord(next); setInput(''); await persist(next);
    } catch (reason) { if (alive.current) setError(controller.signal.aborted ? '已停止生成，输入保留。' : failureMessage(reason)); }
    finally { if (alive.current) { lock(false); setGenerating(false); setPendingMessage(null); } active.current = null; }
  }
  async function confirm(publishAfter = false) {
    if (!record || sending.current || pendingSave || !status.ready || record.model !== status.model) return;
    lock(true); setError('');
    try {
      const confirmed = await browserPreviewApi<MethodChatRecord>(`/method-chats/${encodeURIComponent(record.id)}/confirm`, { fingerprint: markdown, teacherConfirmed: true });
      if (!alive.current) return;
      setRecord(confirmed); executionChanged();
      const result = onConfirmed ? await onConfirmed(entry) : { pendingIds: [] };
      if (!alive.current) return;
      setPendingMethods(result.pendingIds);
      if (result.pendingIds.length) { setError('当前方法已确认通过，其它方法也需要完成对话确认后才能发布。'); return; }
      if (publishAfter) onPublish?.(entry);
    } catch (reason) { if (alive.current) setError(failureMessage(reason)); }
    finally { if (alive.current) lock(false); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = 'skill.md'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <>
    <SaveFailureExitGuard failed={!!pendingSave} onRetry={() => pendingSave ? persist(pendingSave) : true} />
    <section className="market-panel method-model-chat" aria-label="教师与教学模型的自由对话">
      <div className="method-model-context"><div><strong>{entry.skill.name}</strong><p>{status.ready ? `${status.model} · 每次对话都载入当前教学方法` : statusError || '正在读取模型服务状态…'}</p></div>
        <div className="method-model-tools"><Button variant="outline" disabled={busy || !!pendingSave} onClick={() => { setRecord(null); setError(''); setPendingMethods([]); }}><MessageSquarePlus />新对话</Button></div>
        <details><summary>已搭载的方法文件 · skill.md</summary><pre>{markdown}</pre><Button variant="outline" onClick={download}><Download />下载方法文件</Button></details>
        {history.length > 0 && <label className="method-model-selector">对话历史<select disabled={busy || !!pendingSave} value={record?.id || ''} onChange={event => { setRecord(history.find(row => row.id === event.target.value) || null); setError(''); }}><option value="">新对话</option>{history.map(row => <option key={row.id} value={row.id}>{new Date(row.createdAt).toLocaleString('zh-CN')} · {row.messages.length / 2} 轮</option>)}</select></label>}
      </div>
      <div className="method-model-dialogue"><ol ref={messageList} className="method-model-messages" aria-live="polite">{[...messages, ...(pendingMessage ? [pendingMessage] : [])].map(message => <li key={message.id} data-role={message.role}><small>{message.role === 'user' ? '教师' : '教学模型'}</small>{message.role === 'assistant' ? <ModelReply content={message.content} /> : <p>{message.content}</p>}</li>)}{!messages.length && !pendingMessage && <li className="method-model-empty"><h2>与搭载教学方法的模型聊一聊</h2><p>{status.ready ? '自由提问，或模拟学生回答，看看模型是否按你的方法引导。' : '教学方法已保留，连接本机模型服务后即可对话。'}</p></li>}{generating && <li className="method-model-wait" role="status">模型正在依据教学方法回复…</li>}</ol>
      <div className="method-model-composer"><label htmlFor="method-model-input">自由对话</label><Textarea id="method-model-input" aria-label="自由对话" value={input} disabled={busy} minRows={2} maxRows={6} maxLength={2000} placeholder="输入你想说的话，Enter 发送，Shift+Enter 换行" onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void send(); } }} />
        <div className="method-model-send">{error && <p role="alert">{error}</p>}{pendingSave && <Button variant="outline" disabled={busy} onClick={() => void persist(pendingSave)}>重试保存对话</Button>}{generating ? <Button variant="outline" onClick={() => active.current?.abort()}><Square />停止生成</Button> : <Button disabled={busy || !input.trim() || !status.ready || loading || !historyReady || !!pendingSave} onClick={() => void send()}><Send />发送</Button>}</div>
      </div>
      </div>
    </section>
    <section className="method-model-publish"><div className="method-model-decision" role="status"><strong>{record?.confirmedAt ? '你已确认这项教学方法通过测验' : '是否通过测验，由你决定'}</strong><p>先自由对话体验；修改教学方法后，需要重新确认。</p></div>
      {!!pendingMethods.length && <div className="method-model-pending">{entries.filter(item => pendingMethods.includes(item.id)).map(item => <Button key={item.id} variant="outline" onClick={() => onSelect(item.id)}>验证：{item.skill.name}</Button>)}</div>}
      <div className="method-model-exits"><Button variant="outline" disabled={!record || !!record.confirmedAt || record.model !== status.model || busy || !!pendingSave || !status.ready} onClick={() => void confirm()}>{record?.confirmedAt ? '已确认通过' : '我确认通过测验'}</Button><Button disabled={!record || record.model !== status.model || busy || !!pendingSave || !status.ready || !onPublish || !!entry.addedFrom} onClick={() => void confirm(true)}>发布到集市</Button><Button variant="outline" disabled={busy} onClick={onFinish || onBack}>暂不发布，返回我的教学方法</Button></div>
    </section>
  </>;
}
