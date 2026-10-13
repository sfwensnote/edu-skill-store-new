import type { RecordedMessage } from '../../../shared/execution';
import { BookOpen, UserRound } from 'lucide-react';
import './transcript-chat.css';

export function Transcript({ messages, highlight, traceLabel = '方法触发判断', assistantLabel = '学伴', presentation = 'record' }: {
  messages: RecordedMessage[]; highlight?: string[]; traceLabel?: string; assistantLabel?: string; presentation?: 'record' | 'conversation';
}) {
  const conversation = presentation === 'conversation';
  return <ol className={conversation ? 'execution-transcript execution-transcript-conversation' : 'execution-transcript'} aria-label="对话记录">{messages.map(message => {
    const content = <>
      <span>{message.role === 'user' ? '学生' : assistantLabel}</span><p>{message.content}</p>
      {message.role === 'assistant' && !!message.activations.length && <details><summary>{traceLabel}</summary>
        {message.activations.map(item => <p key={item.entryId}>{item.ended ? '判断达到结束条件' : `选择第 ${item.step + 1} 步`}：{item.reason}</p>)}
      </details>}
    </>;
    return <li key={message.id} id={`message-${message.id}`} data-role={message.role} data-highlight={highlight?.includes(message.id) || undefined}>
      {conversation ? <>
        <span className="execution-chat-avatar" aria-hidden="true">{message.role === 'user' ? <UserRound /> : <BookOpen />}</span>
        <div className="execution-chat-bubble">{content}</div>
      </> : content}
    </li>;
  })}</ol>;
}
