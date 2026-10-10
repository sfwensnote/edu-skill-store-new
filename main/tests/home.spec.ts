import { test, expect } from '@playwright/test';

test('首页五个入口连接原有流程，说明标签不冒充按钮，导航保持统一', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/#/home');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { name: '教学工坊', exact: true })).toBeVisible();
  await expect(main).not.toContainText(/作品概览|\d+\s*(个|项)|完成率|使用次数/);
  await expect(page.locator('.home-core-card')).toHaveCount(2);
  await expect(page.locator('.home-shortcut')).toHaveCount(3);
  await expect(main.getByRole('list')).toHaveCount(2);
  await expect(main.getByRole('list').getByRole('button')).toHaveCount(0);
  await main.getByRole('button', { name: '进入教学方法工坊', exact: true }).press('Enter');
  await expect(page).toHaveURL(/#\/create\/[^?]+/);
  await expect(page.getByRole('heading', { name: '创建教学方法', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '说说你的教学想法', exact: true })).toBeVisible();
  await page.goto('/#/home');
  await main.getByRole('button', { name: '开始设计探究作品', exact: true }).click();
  await expect(page).toHaveURL(/#\/inquiry(?:\?|$)/);
  await expect(page.getByRole('heading', { name: '设计探究作品', exact: true })).toBeVisible();
  for (const [name, route, heading] of [
    ['浏览集市', /#\/market(?:\?|$)/, '教学 SKILL 集市'],
    ['查看作品', /#\/workshop\?tab=skills$/, '我的作品'],
    ['查看任务', /#\/space(?:\?|$)/, '教学任务'],
  ] as const) {
    await page.goto('/#/home');
    await main.getByRole('button', { name: new RegExp(name) }).click();
    await expect(page).toHaveURL(route);
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }
  await page.goto('/#/home');
  await expect(
    page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: '首页', exact: true }),
  ).toHaveClass(/active/);
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.getByRole('button', { name: '整理日常教学方法' }).click();
  await expect(page).toHaveURL(/#\/create\//);
  await expect(page.getByRole('heading', { name: '说说你的教学想法' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('首页宽屏入口对齐，平板手机可点击且无横向溢出', async ({ page }) => {
  await page.goto('/#/home');
  for (const width of [1672, 1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 940 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const core = await page.locator('.home-core-card').all();
    const first = (await core[0].boundingBox())!;
    const second = (await core[1].boundingBox())!;
    if (width > 820) {
      expect(Math.abs(first.y - second.y)).toBeLessThan(1);
      expect(Math.abs(first.height - second.height)).toBeLessThan(1);
      const buttons = await page.locator('.home-primary-action').all();
      expect(
        Math.abs((await buttons[0].boundingBox())!.y - (await buttons[1].boundingBox())!.y),
      ).toBeLessThan(1);
    } else {
      expect(second.y).toBeGreaterThanOrEqual(first.y + first.height);
    }
    for (const button of await page.locator('.home-primary-action').all())
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `docs/assets/新版首页-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
  }
  await page.getByRole('button', { name: '开始设计探究作品', exact: true }).click();
  await expect(page).toHaveURL(/#\/inquiry(?:\?|$)/);
});
