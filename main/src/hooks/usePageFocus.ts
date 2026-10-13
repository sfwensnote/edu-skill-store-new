import { useLayoutEffect, useRef } from 'react';
import { routeHash, type AppRoute } from '@/lib/routes';

export function usePageFocus(route: AppRoute) {
  const key = routeHash(route);
  const previous = useRef(key);
  useLayoutEffect(() => {
    const main = document.querySelector('main');
    if (!main) return;
    main.id = 'main-content';
    main.tabIndex = -1;
    const heading = main.querySelector('h1')?.textContent?.trim();
    document.title = heading ? `${heading} · 师说` : '师说 · 教师工作台';
    if (previous.current !== key) {
      // 列表页自行恢复浏览位置，其余页面从新的内容开始。
      if (!['market', 'workshop', 'mine'].includes(route.page)) window.scrollTo(0, 0);
      main.focus({ preventScroll: true });
    }
    previous.current = key;
  });
}
