import { ChevronRight } from 'lucide-react';
import type { TeachingAssistant } from '../../../shared/assistant';
import { AssistantIcon } from '@/components/AssistantIcon';

export function AssistantList({
  items,
  onOpen,
  emptyMessage = '没有找到符合条件的助手，换个关键词试试。',
}: {
  items: Array<Pick<TeachingAssistant, 'id' | 'name' | 'goal' | 'grade' | 'subject' | 'activity'>>;
  onOpen: (assistantId: string) => void;
  emptyMessage?: string;
}) {
  if (!items.length) {
    return <div className="list-empty">{emptyMessage}</div>;
  }
  return (
    <div className="assistant-list">
      {items.map((assistant) => (
        <div className="assistant-row" key={assistant.id}>
          <button className="assistant-row-main" onClick={() => onOpen(assistant.id)}>
            <span className="assistant-icon"><AssistantIcon subject={assistant.subject} /></span>
            <span className="assistant-copy">
              <strong>{assistant.name || '未命名助手'}</strong>
              <span>{assistant.goal || '继续描述你的教学想法，完善这个助手。'}</span>
            </span>
            <span className="assistant-meta">
              {assistant.grade}<i>·</i>{assistant.subject}<i>·</i>{assistant.activity}
            </span>
            <ChevronRight className="row-chevron" aria-hidden="true" />
          </button>
        </div>
      ))}
    </div>
  );
}
