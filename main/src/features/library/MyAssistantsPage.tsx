import type { TeachingAssistant } from '../../../shared/assistant';
import { AssistantList } from './AssistantList';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function MyAssistantsPage({
  assistants,
  onOpen,
  onCreate,
  onDelete,
}: {
  assistants: TeachingAssistant[];
  onOpen: (assistant: TeachingAssistant) => void;
  onCreate: () => void;
  onDelete: (assistantId: string) => void;
}) {
  const [pendingDelete, setPendingDelete] = useState<TeachingAssistant | null>(null);
  return (
    <>
      <main className="mine-page page-frame narrow-frame">
        <div className="mine-heading">
          <div className="page-title-block">
            <h1>我的助手</h1>
          </div>
          <Button onClick={onCreate}>
            <Plus data-icon="inline-start" />
            创建助手
          </Button>
        </div>
        <div className="mine-count">{assistants.length} 个助手</div>
        <AssistantList
          items={assistants}
          showStatus
          emptyMessage="还没有助手"
          onOpen={(id) => {
            const assistant = assistants.find((item) => item.id === id);
            if (assistant) onOpen(assistant);
          }}
          onDelete={(id) => {
            const assistant = assistants.find((item) => item.id === id);
            if (assistant) setPendingDelete(assistant);
          }}
        />
      </main>
      <Dialog
        open={Boolean(pendingDelete)}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <DialogContent className="assistant-delete-dialog" showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>删除这个助手？</DialogTitle>
            <DialogDescription>
              “{pendingDelete?.name || '未命名助手'}”及其设计对话会从当前设备删除，此操作无法撤销。
            </DialogDescription>
          </DialogHeader>
          <div className="assistant-delete-actions">
            <Button variant="outline" onClick={() => setPendingDelete(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!pendingDelete) return;
                onDelete(pendingDelete.id);
                setPendingDelete(null);
              }}
            >
              确认删除
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
