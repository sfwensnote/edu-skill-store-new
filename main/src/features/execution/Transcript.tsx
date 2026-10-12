import type { RecordedMessage } from '../../../shared/execution';

export function Transcript({ messages, highlight, traceLabel = '方法触发判断' }: { messages: RecordedMessage[]; highlight?: string[]; traceLabel?: string }) {
  return <ol className="execution-transcript" aria-label="对话记录">{messages.map(message => <li key={message.id}
    id={`message-${message.id}`} data-role={message.role} data-highlight={highlight?.includes(message.id) || undefined}>
    <span>{message.role === 'user' ? '学生' : '学伴'}</span><p>{message.content}</p>
    {message.role === 'assistant' && !!message.activations.length && <details><summary>{traceLabel}</summary>
      {message.activations.map(item => <p key={item.entryId}>{item.ended ? '判断达到结束条件' : `选择第 ${item.step + 1} 步`}：{item.reason}</p>)}
    </details>}
  </li>)}</ol>;
}
