import { useState, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { useAccount } from '@/features/accounts/AccountProvider';
import { clearLegacyTaskContent } from '../../../shared/legacy-task-cleanup';

export function LegacyTaskCleanup({ children }: { children: ReactNode }) {
  const { storage } = useAccount();
  function clean() {
    try { clearLegacyTaskContent(storage); return ''; }
    catch { return '旧任务未能清理，请检查浏览器存储权限后重试。'; }
  }
  const [error, setError] = useState(clean);
  return error ? <main className="page-frame not-found"><h1>旧任务清理未完成</h1>
    <p role="alert">{error}</p><Button onClick={() => setError(clean())}>重新清理</Button>
  </main> : children;
}
