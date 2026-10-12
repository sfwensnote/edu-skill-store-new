import { test, expect } from './demo-workspace-fixture';

// 入口跳转会带上来源页 return 参数，用于返回与刷新兼容。
function returnTarget(url: string) {
  return new URLSearchParams(url.slice(url.indexOf('?') + 1)).get('return');
}

test('首页提供教学方法与创建学伴两条主入口，工作区入口可达，导航保持统一', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/#/home');
  const main = page.locator('main');
  await expect(main.getByRole('heading', { name: '教学工坊', exact: true })).toBeVisible();
  await expect(main).not.toContainText(/作品概览|\d+\s*(个|项)|完成率|使用次数/);
  await expect(main.getByRole('heading', { name: '日常教学', exact: true })).toHaveCount(0);
  await expect(main).not.toContainText(/PBL|情境探究|设计探究|教学任务|教学活动/);
  const primary = page.locator('.home-primary-card');
  await expect(primary).toHaveCount(2);
  await expect(primary.nth(0)).toContainText('整理教学方法');
  await expect(primary.nth(1)).toContainText('创建学伴');
  await expect(page.locator('.home-workspace')).toHaveCount(3);
  await expect(main.getByRole('list')).toHaveCount(1);
  const nav = page.getByRole('navigation', { name: '主要导航' });
  await expect(nav.getByRole('button')).toHaveText(['首页', '教学 SKILL 集市', '我的 SKILL', '我的学伴']);

  await main.getByRole('button', { name: '进入教学方法工坊', exact: true }).press('Enter');
  await expect(page).toHaveURL(/#\/create\/[^?]+/);
  await expect(page.getByRole('heading', { name: '创建教学方法', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '说说你的教学想法', exact: true })).toBeVisible();

  await page.goto('/#/home');
  await main.getByRole('button', { name: '创建学伴', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/[0-9a-f-]+\/edit\?return=/);
  expect(returnTarget(page.url())).toBe('#/home');
  await expect(page.getByRole('heading', { name: '创建我的学伴', exact: true })).toBeVisible();

  for (const [name, route, heading] of [
    ['浏览集市', /#\/market(?:\?|$)/, '教学 SKILL 集市'],
    ['查看 SKILL', /#\/workshop\?tab=skills$/, '我的 SKILL'],
    ['管理学伴', /#\/companions$/, '我的学伴'],
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
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page).toHaveURL(/#\/create\//);
  await expect(page.getByRole('heading', { name: '说说你的教学想法' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('首页两条主入口与三个工作区入口在宽屏、平板和手机自适应且无横向溢出', async ({ page }) => {
  await page.goto('/#/home');
  for (const width of [1672, 1440, 1024, 768, 390, 320]) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 940 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const primary = await page.locator('.home-primary-card').all();
    expect(primary).toHaveLength(2);
    const firstPrimary = (await primary[0].boundingBox())!;
    const secondPrimary = (await primary[1].boundingBox())!;
    if (width > 820) expect(Math.abs(firstPrimary.y - secondPrimary.y)).toBeLessThan(1);
    else expect(secondPrimary.y).toBeGreaterThanOrEqual(firstPrimary.y + firstPrimary.height);
    const workspaces = await page.locator('.home-workspace').all();
    expect(workspaces).toHaveLength(3);
    const firstWorkspace = (await workspaces[0].boundingBox())!;
    const secondWorkspace = (await workspaces[1].boundingBox())!;
    if (width > 900) expect(Math.abs(firstWorkspace.y - secondWorkspace.y)).toBeLessThan(1);
    else expect(secondWorkspace.y).toBeGreaterThanOrEqual(firstWorkspace.y + firstWorkspace.height - 1);
    for (const button of await page.locator('.home-primary-action').all())
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(40);
    if (width === 1440 || width === 390)
      await page.screenshot({
        path: `docs/assets/新版首页-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
  }
  await page.getByRole('button', { name: '创建学伴', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/[0-9a-f-]+\/edit\?return=/);
  expect(returnTarget(page.url())).toBe('#/home');
});
