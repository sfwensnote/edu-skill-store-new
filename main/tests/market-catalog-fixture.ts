import { test as base, expect } from './workspace-fixture';
import { marketSkills } from './fixtures/marketplace';
import { skillTrialBindings } from './fixtures/skill-trial-bindings';

// 仅旧集市交互回归装入隔离数据；正式页面的集市与案例列表均为空。
export const test = base.extend<{ marketExamples: void }>({
  marketExamples: [async ({ context }, use) => {
    await context.route('**/src/data/marketplace.ts*', (route) => route.fulfill({
      contentType: 'application/javascript', body: `export const marketSkills = ${JSON.stringify(marketSkills)};`,
    }));
    await context.route('**/src/data/skill-trial-bindings.ts*', (route) => route.fulfill({
      contentType: 'application/javascript', body: `export const skillTrialBindings = ${JSON.stringify(skillTrialBindings)};`,
    }));
    await use();
  }, { auto: true }],
});
export { expect };
export type { Page } from '@playwright/test';
