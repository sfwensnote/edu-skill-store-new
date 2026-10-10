import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export type PendingRemoval = { name: string; description: string; action: () => boolean; removalOnly?: boolean };
export function WorkshopDialogs({
  pending,
  onPending,
  onMessage,
  onRestoreFocus,
}: {
  pending: PendingRemoval | null;
  onPending: (value: PendingRemoval | null) => void;
  onMessage: (message: string) => void;
  onRestoreFocus: () => void;
}) {
  const [error, setError] = useState('');
  return (
    <>
      <Dialog
        open={!!pending}
        onOpenChange={(open) => {
          setError('');
          if (!open) onPending(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onRestoreFocus();
          }}
        >
          <DialogHeader>
            <DialogTitle>{pending?.removalOnly ? '从我的 SKILL 移除？' : '删除这项内容？'}</DialogTitle>
            <DialogDescription>
              “{pending?.name}”将被{pending?.removalOnly ? '移除' : '删除'}。{pending?.description}
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert">{error}</p>}
          <div className="inline-actions">
            <Button variant="outline" onClick={() => onPending(null)}>
              取消
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (!pending?.action()) {
                  setError('删除未保存，作品仍保留。请释放存储空间后重试。');
                  return;
                }
                const removalOnly = pending.removalOnly;
                setError('');
                onPending(null);
                onMessage(removalOnly ? '已从我的 SKILL 移除' : '已删除');
              }}
            >
              {pending?.removalOnly ? '确认移除' : '确认删除'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
