import { ChevronRight, Trash2 } from 'lucide-react';
import type { AssistantStatus, TeachingAssistant } from '../../../shared/assistant';
import { AssistantIcon } from '@/components/AssistantIcon';
import { statusLabels } from '@/data/platform';
import { Button } from '@/components/ui/button';

export function AssistantList({
  items,
  showStatus = false,
  onOpen,
  onDelete,
  emptyMessage = '没有找到符合条件的助手，换个关键词试试。',
}: {
  items: Array<Pick<TeachingAssistant, 'id' | 'name' | 'goal' | 'grade' | 'subject' | 'activity'> & { status: AssistantStatus }>;
  showStatus?: boolean;
  onOpen: (assistantId: string) => void;
  onDelete?: (assistantId: string) => void;
  emptyMessage?: string;
}) {
  if (!items.length) {
    return <div className="list-empty">{emptyMessage}</div>;
  }
  return (
    <div className="assistant-list">
      {items.map((assistant) => (
        <div className={`assistant-row ${onDelete ? 'manageable' : ''}`} key={assistant.id}>
          <button className="assistant-row-main" onClick={() => onOpen(assistant.id)}>
            <span className="assistant-icon"><AssistantIcon subject={assistant.subject} /></span>
            <span className="assistant-copy">
              <strong>{assistant.name || '未命名助手'}</strong>
              <span>{assistant.goal || '继续描述你的教学想法，完善这个助手。'}</span>
            </span>
            <span className="assistant-meta">
              {showStatus ? (
                <span className={`status-text status-${assistant.status.toLowerCase()}`}>{statusLabels[assistant.status]}</span>
              ) : (
                <>{assistant.grade}<i>·</i>{assistant.subject}<i>·</i>{assistant.activity}</>
              )}
            </span>
            <ChevronRight className="row-chevron" aria-hidden="true" />
          </button>
          {onDelete && (
            <Button
              variant="ghost"
              size="icon"
              className="assistant-delete"
              onClick={() => onDelete(assistant.id)}
              aria-label={`删除${assistant.name || '未命名助手'}`}
              title="删除助手"
            >
              <Trash2 />
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
