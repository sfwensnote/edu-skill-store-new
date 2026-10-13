import { expect, test, type Page } from './workspace-fixture';
import { initialMine } from '../src/data/platform';
import { buildContextualProblem, rentalSampleDesign } from '../shared/contextual-design';
import { legacyActivityDraft } from './fixtures/legacy-activity';

async function seed(page: Page) {
  const design = rentalSampleDesign('frontend-review-design');
  design.contextualProblem = { ...buildContextualProblem(design), confirmed: true };
  design.savedLevels = [1];
  const draft = legacyActivityDraft('frontend-review-activity');
  draft.resourceKey = `design:${design.id}:1`;
  draft.settings.title = '租赁方案课堂活动';
  draft.settings.instructions = '比较不同使用时长的费用，并说明你的依据。';
  await page.addInitScript(
    ({ assistants, design, draft }) => {
      if (!localStorage.getItem('teaching-assistant.frontend-demo.v2'))
        localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify(assistants));
      if (!localStorage.getItem('teaching-method.market-workspace.v1'))
        localStorage.setItem(
          'teaching-method.market-workspace.v1',
          JSON.stringify({
            version: 1,
            designs: [design],
            activityDrafts: [draft],
            tasks: [],
            favorites: [],
            sharedSkillIds: [],
          }),
        );
    },
    { assistants: initialMine, design, draft },
  );
}

test('手机作品页默认只保留一处搜索，筛选可展开并保留有效条件', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/workshop');
  await expect(page.getByLabel('搜索我的教学方法')).toHaveCount(1);
  await expect(page.getByLabel('搜索我的教学方法')).toBeVisible();
  await expect(page.getByLabel('作品学段')).toBeHidden();
  await page.getByRole('button', { name: '筛选', exact: true }).click();
  await page.getByLabel('作品学段').selectOption('初中');
  await page.getByRole('button', { name: '筛选 · 1', exact: true }).click();
  await expect(page.getByLabel('作品学段')).toBeHidden();
  await expect(page.locator('.workshop-item')).not.toHaveCount(0);
  const first = page.locator('.workshop-item').first();
  await first.getByRole('button', { name: /更多操作/ }).click();
  const menu = page.getByRole('menu');
  const item = await menu.getByRole('menuitem').first().boundingBox();
  expect(item!.height).toBeGreaterThanOrEqual(44);
  await page.keyboard.press('Escape');
  const icon = await first.getByRole('button', { name: /更多操作/ }).boundingBox();
  expect(icon!.width).toBeGreaterThanOrEqual(44);
  expect(icon!.height).toBeGreaterThanOrEqual(44);
  await page.screenshot({ path: 'docs/assets/前端审查-作品手机.png', fullPage: true });
});

test('活动步骤切换定位新内容，手机保存反馈可见且底部留白跟随操作栏', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/space?draft=frontend-review-activity');
  const next = page.locator('.activity-bottom-actions').getByRole('button', { name: '下一步', exact: true });
  await next.click();
  await expect(page.locator('#activity-configure-panel')).toBeFocused();
  await expect(page.getByRole('heading', { name: '任务要求', exact: true })).toBeInViewport();
  await expect(page.getByLabel('任务名称')).toHaveCSS('font-size', '16px');
  await page.getByRole('button', { name: '保存草稿', exact: true }).click();
  await expect(page.locator('.activity-bottom-status')).toBeVisible();
  await expect(page.locator('.activity-bottom-status')).toContainText('任务草稿已保存');
  await next.click();
  await next.click();
  const size = await page.locator('.activity-workbench').evaluate((element) => ({
    padding: parseFloat(getComputedStyle(element).paddingBottom),
    bar: document.querySelector('.activity-bottom-bar')!.getBoundingClientRect().height,
  }));
  expect(size.padding).toBeGreaterThan(size.bar);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/assets/前端审查-活动手机.png', fullPage: true });
  await page.screenshot({ path: 'docs/assets/前端审查-活动手机可见区.png' });
});

test('手机活动支持方向键切换，教学方法验证与进度同时显示', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/space?draft=frontend-review-activity');
  const configure = page.getByRole('tab', { name: '配置任务', exact: true });
  const preview = page.getByRole('tab', { name: '实时预览', exact: true });
  await configure.press('ArrowRight');
  await expect(preview).toBeFocused();
  await expect(preview).toHaveAttribute('aria-selected', 'true');
  await expect(page.locator('#activity-configure-panel')).toBeHidden();
  await preview.press('Home');
  await expect(configure).toBeFocused();
  await expect(page.locator('#activity-configure-panel')).toBeVisible();
  await page.goto('/#/assistant/assistant-demo-active/test');
  await expect(page.getByRole('progressbar', { name: '教学方法验证进度' })).toBeVisible();
  await expect(page.locator('#testing-process')).toBeVisible();
  await expect(page.getByRole('tab', { name: '核对进度', exact: true })).toHaveCount(0);
});

test('长内容弹窗在低屏高可滚动，Escape 关闭后恢复焦点', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 320 });
  await page.goto('/#/workshop');
  const first = page.locator('.workshop-item').first();
  const trigger = first.getByRole('button', { name: /更多操作/ });
  await trigger.click();
  await page.getByRole('menuitem', { name: '加入助手配置', exact: true }).click();
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.boundingBox();
  expect(bounds!.y).toBeGreaterThanOrEqual(15);
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(305);
  await expect(dialog).toHaveCSS('overflow-y', 'auto');
  expect(await dialog.evaluate((element) => element.scrollHeight > element.clientHeight)).toBe(true);
  await expect(dialog.getByLabel('目标助手')).toHaveCSS('font-size', '16px');
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();
});

test('教学方法字段遵循各自限制，探究表单隐藏无意义的常驻字数', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/create/frontend-field-limits');
  await page.getByRole('checkbox', { name: '标签 错因辅导', exact: true }).check();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.getByRole('button', { name: '编辑教学方法名称', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '教学方法名称', exact: true })).toHaveAttribute(
    'maxlength',
    '80',
  );
  await page.getByRole('textbox', { name: '教学方法名称', exact: true }).fill('课堂反思');
  await page.getByRole('button', { name: '编辑希望学生达到' }).click();
  await expect(page.getByRole('textbox', { name: '希望学生达到', exact: true })).toHaveAttribute(
    'maxlength',
    '800',
  );
  await page.getByRole('button', { name: '补充一种情况和做法', exact: true }).click();
  await page.getByRole('button', { name: '编辑做法 1', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '做法 1', exact: true })).toHaveAttribute(
    'maxlength',
    '500',
  );
  await page.goto('/#/inquiry');
  await expect(page.locator('.design-field-count')).toHaveCount(0);
  await page.getByLabel('设计名称').fill('题'.repeat(140));
  await expect(page.locator('.design-field-count')).toHaveText('还可输入 10 字');
});

test('离开长列表进入新页面回到顶部，键盘焦点到内容，返回保留列表筛选', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 1440, height: 700 });
  await page.goto('/#/workshop');
  await page.getByLabel('搜索我的教学方法').fill('反思');
  const last = page.locator('.workshop-item').last();
  await last.getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.locator('main')).toBeFocused();
  expect(await page.evaluate(() => scrollY)).toBe(0);
  await expect(page).toHaveTitle(/反思.*师说/);
  await page.getByRole('button', { name: '返回我的教学方法', exact: true }).click();
  await expect(page.getByLabel('搜索我的教学方法')).toHaveValue('反思');
  await page.getByRole('link', { name: '跳到页面内容' }).focus();
  await page.getByRole('link', { name: '跳到页面内容' }).press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await expect(page).toHaveURL(/#\/workshop/);
});

test('学生对话显示最新回应，点发送或示例后可直接继续输入', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/assistant/assistant-demo-active/student-preview?from=report');
  const input = page.getByLabel('以学生身份输入', { exact: true });
  await page.getByRole('button', { name: '我还是不知道下一步怎么做。', exact: true }).click();
  await expect(input).toBeFocused();
  for (let index = 0; index < 8; index++) {
    await input.fill(`第 ${index + 1} 次尝试：我不知道下一步怎么做。`);
    await page.getByRole('button', { name: '发送学生问题', exact: true }).click();
    await expect(input).toBeFocused();
  }
  const scroll = await page.getByRole('log', { name: '学生视角对话' }).evaluate((element) => ({
    top: element.scrollTop,
    remaining: element.scrollHeight - element.clientHeight - element.scrollTop,
  }));
  expect(scroll.top).toBeGreaterThan(0);
  expect(scroll.remaining).toBeLessThan(2);
  await page.getByRole('button', { name: '重新开始', exact: true }).click();
  await expect(page.locator('.student-message')).toHaveCount(3);
});
