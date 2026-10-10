import { test as base, expect } from '@playwright/test';
import { initialMine } from '../src/data/platform';

// 历史资料兼容检查显式装入样例；真实新用户的个人工作区保持为空。
export const test = base.extend<{ demoWorkspace: void }>({
  demoWorkspace: [async ({ context }, use) => {
    await context.addInitScript((items) => {
      const key = 'teaching-assistant.frontend-demo.v2';
      if (location.protocol.startsWith('http') && !localStorage.getItem(key))
        localStorage.setItem(key, JSON.stringify(items));
    }, initialMine);
    await use();
  }, { auto: true }],
});
export { expect };
export type { Page } from '@playwright/test';
