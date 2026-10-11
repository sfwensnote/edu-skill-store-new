import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import type { TrialSession } from '../../../shared/execution';
import { Transcript } from './Transcript';
import { failureMessage } from './api';

export function TrialChat({ session, onSend, disabled = false }: {
  session: TrialSession; onSend: (content: string, requestId: string) => Promise<TrialSession>; disabled?: boolean;
}) {
  const [value, setValue] = useState(session);
  const [input, setInput] = useState('');
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
  return <div className="execution-chat"><Transcript messages={value.messages} />
    {busy && <p role="status">学伴正在回复…</p>}
    {(error || value.error) && <p className="execution-error" role="alert">{error || value.error}</p>}
    {disabled ? <p className="subtle">本次试用已结束，对话记录仍保留。</p> : <form onSubmit={event => { event.preventDefault(); void send(); }}>
      <label className="form-field">你的问题<textarea rows={3} value={input} maxLength={2000} disabled={disabled || busy} onChange={event => setInput(event.target.value)} /></label>
      <Button type="submit" disabled={disabled || busy || !input.trim()}>{busy ? '正在回复…' : '发送'}</Button>
    </form>}
  </div>;
}
