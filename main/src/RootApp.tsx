import { lazy, Suspense, useEffect, useState } from 'react';
import { SkillDemoApp } from '@/features/skills/SkillDemoApp';

const LegacyApp = lazy(() => import('./App'));

export default function RootApp() {
  const [hash, setHash] = useState(() => window.location.hash || '#/home');
  useEffect(() => {
    let pending: ReturnType<typeof setTimeout>;
    // 完成所有离开保护监听后再读取地址，避免先卸载尚未保存的编辑页。
    const sync = () => {
      clearTimeout(pending);
      pending = setTimeout(() => setHash(window.location.hash || '#/home'), 0);
    };
    window.addEventListener('hashchange', sync);
    return () => { clearTimeout(pending); window.removeEventListener('hashchange', sync); };
  }, []);
  const path = hash.split('?')[0];
  const demo = path === '#/home' || path === '#/' || path === '#/skills' ||
    path.startsWith('#/skills/') || path === '#/examples' || path.startsWith('#/examples/') ||
    path === '#/market' || path.startsWith('#/market/');
  if (demo) return <SkillDemoApp hash={hash} />;
  return <Suspense fallback={<main className="page-frame" aria-busy="true">正在读取旧版作品…</main>}><LegacyApp /></Suspense>;
}
