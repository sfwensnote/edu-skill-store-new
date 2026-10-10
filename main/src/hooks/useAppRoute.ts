import { useEffect, useState } from 'react';
import { readRoute } from '@/lib/routes';

export function useAppRoute() {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    // 等离开保护恢复地址后再同步，避免合成哈希事件提前卸载编辑页。
    const sync = () => queueMicrotask(() => setRoute(readRoute()));
    window.addEventListener('hashchange', sync);
    if (!window.location.hash) window.history.replaceState(null, '', '#/home');
    sync();
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  return route;
}
