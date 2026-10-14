import { useEffect, useRef, useState } from 'react';
import { MessageSquarePlus, Send, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import type { SkillEntry } from '../../../shared/marketplace';
import { methodMarkdown, type MethodChatMessage } from '../../../shared/method-chat';
import { failureMessage, methodInput } from '../execution/api';
import { methodModelStatus, methodModelTurn, type MethodModelStatus } from '../execution/method-chat-api';
import { ModelReply } from '../execution/ModelReply';
import '../execution/method-model-chat.css';
import './market-chat.css';

export function SkillChatPreview({ entry }: { entry: SkillEntry }) {
  const [status, setStatus] = useState<MethodModelStatus>({ ready: false, model: '' });
  const [messages, setMessages] = useState<MethodChatMessage[]>([]);
  const [pending, setPending] = useState<MethodChatMessage | null>(null);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const active = useRef<AbortController | null>(null);
  const sending = useRef(false);
  const alive = useRef(true);
  const messageList = useRef<HTMLOListElement>(null);
  useEffect(() => {
    let disposed = false;
    alive.current = true;
    void methodModelStatus().then(value => {
      if (disposed) return;
      setStatus(value);
      if (!value.ready) setError('模型服务尚未配置，请连接本机工作台后试用。');
    }).catch(reason => { if (!disposed) setError(failureMessage(reason)); });
    return () => { disposed = true; alive.current = false; active.current?.abort(); };
  }, []);
  useEffect(() => {
    const list = messageList.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [messages.length, pending, busy]);
  async function send() {
    const content = input.trim();
    if (!content || sending.current || !status.ready) return;
    if (messages.length >= 40) { setError('本次对话较长，请开始新对话。'); return; }
    const controller = new AbortController();
    const user: MethodChatMessage = { id: crypto.randomUUID(), role: 'user', content, at: new Date().toISOString() };
    active.current = controller; sending.current = true;
    setBusy(true); setPending(user); setError('');
    try {
      const reply = await methodModelTurn(methodInput(entry), [...messages, user], controller.signal);
      if (!alive.current || controller.signal.aborted) return;
      if (reply.fingerprint !== methodMarkdown(entry.skill)) throw new Error('本次回复使用的方法与当前内容不同，请重新试用。');
      setMessages([...messages, user, { id: crypto.randomUUID(), role: 'assistant', content: reply.content, at: new Date().toISOString() }]);
      setInput('');
    } catch (reason) {
      if (alive.current) setError(controller.signal.aborted ? '已停止生成，输入保留。' : failureMessage(reason));
    } finally {
      sending.current = false; active.current = null;
      if (alive.current) { setBusy(false); setPending(null); }
    }
  }
  return <section className="market-panel method-model-chat market-model-trial" aria-label="试用教学方法">
    <div className="method-model-context"><div><h2>试用对话</h2><p>{status.ready ? '已搭载当前教学方法，可以自由提问或模拟学生回答。' : '正在连接教学模型…'}</p></div>
      <Button variant="outline" disabled={busy} onClick={() => { setMessages([]); setPending(null); setError(''); }}><MessageSquarePlus />新对话</Button>
    </div>
    <ol ref={messageList} className="method-model-messages" aria-live="polite">{[...messages, ...(pending ? [pending] : [])].map(message => <li key={message.id} data-role={message.role}><small>{message.role === 'user' ? '我' : '教学模型'}</small>{message.role === 'assistant' ? <ModelReply content={message.content} /> : <p>{message.content}</p>}</li>)}
      {!messages.length && !pending && <li className="method-model-empty"><h2>直接聊一聊，体验这项教学方法</h2><p>在下方输入你的话，模型会依据当前方法回应。</p></li>}
      {busy && <li className="method-model-wait" role="status">模型正在依据教学方法回复…</li>}
    </ol>
    <div className="method-model-composer"><label htmlFor="market-method-message">自由对话</label><Textarea id="market-method-message" value={input} disabled={busy} minRows={3} maxLength={2000} placeholder="输入你想说的话，Enter 发送，Shift+Enter 换行" onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing && event.keyCode !== 229) { event.preventDefault(); void send(); } }} />
      <div className="method-model-send">{error && <p role="alert">{error}</p>}{busy ? <Button variant="outline" onClick={() => active.current?.abort()}><Square />停止生成</Button> : <Button disabled={!status.ready || !input.trim()} onClick={() => void send()}><Send />发送</Button>}</div>
    </div>
  </section>;
}
