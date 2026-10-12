import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function SaveFailureExitGuard({ failed, onRetry }: { failed: boolean; onRetry: () => boolean | Promise<boolean> }) {
  const latest = useRef({ failed, onRetry });
  latest.current = { failed, onRetry };
  const currentHash = useRef(window.location.hash);
  const [destination, setDestination] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    function beforeUnload(event: BeforeUnloadEvent) {
      if (!latest.current.failed) return;
      event.preventDefault();
      event.returnValue = '';
    }
    function guard(event: Event) {
      const next = window.location.hash;
      if (next === currentHash.current) return;
      if (!latest.current.failed) {
        currentHash.current = next;
        return;
      }
      // 先恢复编辑页，避免公共导航或浏览器返回卸载未保存内容。
      window.history.replaceState(null, '', currentHash.current);
      event.stopImmediatePropagation();
      setDestination(next);
      setError('');
    }
    window.addEventListener('beforeunload', beforeUnload);
    window.addEventListener('popstate', guard, true);
    window.addEventListener('hashchange', guard, true);
    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      window.removeEventListener('popstate', guard, true);
      window.removeEventListener('hashchange', guard, true);
    };
  }, []);
  async function leave(retry: boolean) {
    if (!destination || saving) return;
    setSaving(true);
    try {
      if (retry && !await latest.current.onRetry()) throw new Error();
      currentHash.current = destination;
      window.location.hash = destination;
      setDestination(null);
    } catch { setError('保存仍未成功，请释放存储空间后重试。'); }
    finally { setSaving(false); }
  }
  return (
    <Dialog open={destination !== null} onOpenChange={(open) => !open && !saving && setDestination(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>还有未保存的修改</DialogTitle>
          <DialogDescription>保存失败。可重试保存；直接离开可能丢失当前内容。</DialogDescription>
        </DialogHeader>
        {error && <p role="alert">{error}</p>}
        <div className="inline-actions">
          <Button variant="outline" disabled={saving} onClick={() => setDestination(null)}>
            继续编辑
          </Button>
          <Button variant="ghost" disabled={saving} onClick={() => void leave(false)}>
            仍然离开
          </Button>
          <Button disabled={saving} onClick={() => void leave(true)}>{saving ? '正在保存…' : '保存后离开'}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
