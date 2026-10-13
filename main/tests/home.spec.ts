import { test, expect } from './demo-workspace-fixture';
import { accountSessionKey, primaryTeacherId } from '../shared/local-accounts';
import { skillResetKey } from '../shared/skill-reset';

test('首页展示核心创建入口、四个工作入口与推荐教学方法', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  await page.goto('/#/home');
  await expect(page.locator('.home-hero-title span')).toHaveText(['让每一份教学智慧，', '都被看见。']);
  await expect(page.getByRole('button', { name: '开始创建教学方法', exact: true })).toBeVisible();
  const cards = page.locator('.home-shortcut-card');
  await expect(cards).toHaveCount(4);
  await expect(cards.locator('h2')).toHaveText(['创建教学方法', '教学方法集市', '我的教学方法', '我的学伴']);
  await expect(page.getByRole('heading', { name: '推荐的教学方法', exact: true })).toBeVisible();
  const nav = page.getByRole('navigation', { name: '主要导航' });
  await expect(nav.getByRole('button')).toHaveText(['首页', '教学方法集市', '我的教学方法', '我的学伴']);
  await expect(nav.getByRole('button', { name: '首页', exact: true })).toHaveClass(/active/);

  const coreAction = page.getByRole('button', { name: '开始创建教学方法', exact: true });
  await coreAction.focus();
  await coreAction.press('Enter');
  await expect(page).toHaveURL(/#\/create\/[^?]+/);
  await expect(page.getByRole('heading', { name: '创建教学方法', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '说说你的教学想法', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('首页四个工作入口支持键盘进入对应页面', async ({ page }) => {
  const targets = [
    { route: /#\/create\/[^?]+/, heading: '创建教学方法' },
    { route: /#\/market(?:\?|$)/, heading: '教学方法集市' },
    { route: /#\/workshop\?tab=skills$/, heading: '我的教学方法' },
    { route: /#\/companions$/, heading: '我的学伴' },
  ] as const;
  for (let index = 0; index < targets.length; index += 1) {
    await page.goto('/#/home');
    const card = page.locator('.home-shortcut-card').nth(index);
    await card.focus();
    await expect(card).toBeFocused();
    await card.press('Enter');
    await expect(page).toHaveURL(targets[index].route);
    await expect(page.getByRole('heading', { name: targets[index].heading, exact: true })).toBeVisible();
  }
});

test('首页推荐教学方法 来自真实集市数据并支持进入详情，空集市显示空态', async ({ page, browser }) => {
  await page.goto('/#/home');
  const featured = page.locator('.home-featured-card');
  const count = await featured.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(4);
  const firstName = (await featured.first().locator('h3').innerText()).trim();
  expect(firstName.length).toBeGreaterThan(0);
  await featured.first().click();
  await expect(page).toHaveURL(/#\/skill\/[^?]+/);
  await expect(page.getByRole('heading', { name: firstName, exact: true })).toBeVisible();

  const origin = new URL(page.url()).origin;
  const context = await browser.newContext();
  await context.addInitScript(
    ({ sessionKey, accountId, resetKey }) => {
      sessionStorage.setItem(sessionKey, JSON.stringify({ accountId, expires: Date.now() + 8 * 3600000 }));
      localStorage.setItem(resetKey, 'done');
    },
    { sessionKey: accountSessionKey, accountId: primaryTeacherId, resetKey: skillResetKey },
  );
  const fresh = await context.newPage();
  await fresh.goto(`${origin}/#/home`);
  await expect(fresh.locator('.home-featured-card')).toHaveCount(0);
  await expect(fresh.locator('.home-featured-empty')).toBeVisible();
  await expect(fresh.locator('.home-featured-empty')).toContainText('还没有可推荐');
  await context.close();
});

test('首页在桌面、平板和手机自适应且无横向溢出，主入口保留触控尺寸', async ({ page }, testInfo) => {
  await page.goto('/#/home');
  const cases = [
    { width: 1440, columns: 4 },
    { width: 1101, columns: 4 },
    { width: 1024, columns: 2 },
    { width: 761, columns: 2 },
    { width: 760, columns: 1 },
    { width: 390, columns: 1 },
    { width: 320, columns: 1 },
  ] as const;
  for (const { width, columns } of cases) {
    await page.setViewportSize({ width, height: width < 600 ? 844 : 940 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    const rects = await page
      .locator('.home-shortcut-card')
      .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().top));
    const rows = rects.filter((top, index) => rects.findIndex((other) => Math.abs(other - top) < 1) === index);
    expect(rects.length / rows.length).toBe(columns);
    const cta = await page.locator('.home-primary-action').boundingBox();
    expect(cta!.height).toBeGreaterThanOrEqual(44);
    if (width === 1440 || width === 390 || width === 320)
      await page.screenshot({ path: testInfo.outputPath(`home-${width}.png`), fullPage: true, animations: 'disabled' });
  }
  await page.setViewportSize({ width: 1440, height: 940 });
  const desktopSize = await page
    .locator('.home-hero-title')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(Math.round(desktopSize)).toBe(56);
  await page.setViewportSize({ width: 320, height: 844 });
  const mobileSize = await page
    .locator('.home-hero-title')
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize));
  expect(mobileSize).toBeGreaterThanOrEqual(28);
  expect(mobileSize).toBeLessThanOrEqual(36);
});
