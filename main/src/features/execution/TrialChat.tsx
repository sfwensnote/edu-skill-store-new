import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { TrialSession } from '../../../shared/execution';
import { Transcript } from './Transcript';
import { failureMessage } from './api';

export function TrialChat({ session, onSend, disabled = false, traceLabel, inputLabel = '你的问题', initialInput = '', suggestions }: {
  session: TrialSession; onSend: (content: string, requestId: string) => Promise<TrialSession>; disabled?: boolean;
  traceLabel?: string; inputLabel?: string; initialInput?: string; suggestions?: string[];
}) {
  const [value, setValue] = useState(session);
  const [input, setInput] = useState(initialInput);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const request = useRef<{ content: string; id: string } | null>(null);
  async function send() {
    const content = input.trim(); if (!content || busy || disabled) return;
    setBusy(true); setError('');
    if (request.current?.content !== content) request.current = { content, id: crypto.randomUUID() };
    try {
      const result = await onSend(content, request.current.id); setValue(result);
      if (result.error) setError(result.error); else { request.current = null; setInput(''); }
    } catch (error) { setError(failureMessage(error)); }
    finally { setBusy(false); }
  }
  return <div className="execution-chat"><Transcript messages={value.messages} traceLabel={traceLabel} />
    {busy && <p role="status">学伴正在回复…</p>}
    {(error || value.error) && <p className="execution-error" role="alert">{error || value.error}</p>}
    {disabled ? <p className="subtle">本次对话已结束，记录仍保留。</p> : <form onSubmit={event => { event.preventDefault(); void send(); }}>
      <label className="form-field">{inputLabel}<textarea rows={3} value={input} maxLength={2000} disabled={disabled || busy} onChange={event => setInput(event.target.value)} /></label>
      {suggestions ? <details className="practice-suggestions"><summary>填入学生表达</summary><div>{suggestions.map((text, index) => <button key={index} type="button" disabled={busy} onClick={() => setInput(text)}>{text.split('\n').at(-1)}</button>)}</div></details>
        : initialInput && <Button type="button" variant="ghost" disabled={busy} onClick={() => setInput(initialInput)}>填入当前情境的学生输入</Button>}
      <Button type="submit" disabled={disabled || busy || !input.trim()}>{busy ? '正在回复…' : '发送'}</Button>
    </form>}
  </div>;
}
