import { ChatComposer } from '@/components/ChatComposer';
import { Sparkles, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { DesignerMessage } from '../../../shared/assistant';

export function DesignerChat({
  messages,
  skillCount,
  adjustingSkill,
  busy,
  onCancelAdjust,
  onSend,
}: {
  messages: DesignerMessage[];
  skillCount: number;
  adjustingSkill: string;
  busy: boolean;
  onCancelAdjust: () => void;
  onSend: (content: string) => void;
}) {
  const [value, setValue] = useState('');
  const stream = useRef<HTMLDivElement>(null);
  const suggestions = adjustingSkill
    ? ['第二次还不会时，提示再具体一点']
    : skillCount === 0
      ? ['设计一个错因诊断助手']
      : skillCount === 1
        ? ['学生仍然不会时，逐步增加提示']
        : skillCount === 2
          ? ['学生改对后，再检查是否真正理解']
          : [];
  useEffect(() => {
    if (stream.current) stream.current.scrollTop = stream.current.scrollHeight;
  }, [messages.length, busy]);
  function submit() {
    const content = value.trim();
    if (!content || busy) return;
    onSend(content);
    setValue('');
  }
  return (
    <section className="designer-chat" aria-label="教学设计器">
      <header className="designer-panel-head">
        <span className="designer-mark">
          <Sparkles />
        </span>
        <div>
          <h2>教学设计器</h2>
        </div>
      </header>
      <div className="designer-message-stream" ref={stream}>
        {messages.map((message) => (
          <div key={message.id} className={`designer-message ${message.role}`}>
            {message.role === 'assistant' && (
              <span className="message-role">
                <Sparkles />
              </span>
            )}
            <div>{message.content}</div>
          </div>
        ))}
        {busy && (
          <div className="designer-message assistant">
            <span className="message-role">
              <Sparkles />
            </span>
            <div className="typing">
              正在整理你的教学想法<span>…</span>
            </div>
          </div>
        )}
      </div>
      <div className="designer-composer-area">
        {suggestions.length > 0 && (
          <div className="suggestion-row">
            {suggestions.map((suggestion) => (
              <button key={suggestion} onClick={() => setValue(suggestion)}>
                {suggestion}
              </button>
            ))}
          </div>
        )}
        {adjustingSkill && (
          <div className="adjust-context">
            <span>正在调整「{adjustingSkill}」</span>
            <button onClick={onCancelAdjust} aria-label="取消调整">
              <X />
            </button>
          </div>
        )}
        <ChatComposer
          value={value}
          onChange={setValue}
          onSend={submit}
          disabled={busy}
          label="教学想法"
          placeholder={adjustingSkill ? '告诉我你希望怎样调整这项教学技能……' : '继续描述你的教学想法……'}
        />
      </div>
    </section>
  );
}
