import { test as base, expect } from '@playwright/test';
import { skillResetKey } from '../shared/skill-reset';

// 原流程测试的资料视为清理之后新建；一次性清理另用未标记的隔离浏览器核验。
export const test = base.extend<{ resetApplied: void }>({
  resetApplied: [async ({ context }, use) => {
    await context.addInitScript((key) => localStorage.setItem(key, 'done'), skillResetKey);
    await use();
  }, { auto: true }],
});
export { expect };
export type { Page } from '@playwright/test';
