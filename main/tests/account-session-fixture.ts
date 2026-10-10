import { test as base, expect } from '@playwright/test';
import { accountSessionKey, primaryTeacherId } from '../shared/local-accounts';

// 原 SKILL 回归在已登录的首个教师工作区执行；登录本身使用独立浏览器核验。
export const test = base.extend<{ teacherSession: void }>({
  teacherSession: [async ({ context }, use) => {
    await context.addInitScript(({ key, id }) => {
      sessionStorage.setItem(key, JSON.stringify({ accountId: id, expires: Date.now() + 8 * 3600000 }));
    }, { key: accountSessionKey, id: primaryTeacherId });
    await use();
  }, { auto: true }],
});
export { expect };
