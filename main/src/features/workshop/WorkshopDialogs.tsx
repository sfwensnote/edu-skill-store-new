import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import type { SkillEntry } from '../../../shared/marketplace';
import type { TeachingAssistant } from '../../../shared/assistant';

export type PendingRemoval = { name: string; description: string; action: () => boolean; removalOnly?: boolean };
export function WorkshopDialogs({
  pending,
  onPending,
  mount,
  onMountEntry,
  assistants,
  target,
  onTarget,
  onMount,
  onMessage,
  onRestoreFocus,
}: {
  pending: PendingRemoval | null;
  onPending: (value: PendingRemoval | null) => void;
  mount: SkillEntry | null;
  onMountEntry: (entry: SkillEntry | null) => void;
  assistants: TeachingAssistant[];
  target: string;
  onTarget: (id: string) => void;
  onMount: (id: string, entry: SkillEntry) => boolean;
  onMessage: (message: string) => void;
  onRestoreFocus: () => void;
}) {
  const available = assistants.filter((a) => a.id !== mount?.assistantId && a.skills.length < 8);
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
      <Dialog
        open={!!mount}
        onOpenChange={(open) => {
          setError('');
          if (!open) onMountEntry(null);
        }}
      >
        <DialogContent
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            onRestoreFocus();
          }}
        >
          <DialogHeader>
            <DialogTitle>加入已有助手配置</DialogTitle>
            <DialogDescription>
              加入独立方法副本，助手需重新核对，不自动启用。每个助手最多 8 项能力。
            </DialogDescription>
          </DialogHeader>
          {error && <p role="alert">{error}</p>}
          {available.length ? (
            <label className="form-field">
              目标助手
              <select value={target} onChange={(e) => onTarget(e.target.value)}>
                <option value="">请选择</option>
                {available.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name || '未命名助手'}（{a.skills.length} 项能力）
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <p>暂时没有可用助手。请先创建其他助手，或为已有助手留出能力位置。</p>
          )}
          <Button
            disabled={!target || !mount || !available.some((a) => a.id === target)}
            onClick={() => {
              if (mount && onMount(target, mount)) {
                setError('');
                onMessage('已加入助手配置，请重新核对。');
                onMountEntry(null);
              } else setError('配置未保存，请释放存储空间后重试。');
            }}
          >
            确认加入
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
