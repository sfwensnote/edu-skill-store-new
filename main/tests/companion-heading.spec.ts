import { test, expect } from './workspace-fixture';

test('创建学伴的返回与标题分行显示，桌面手机均可键盘返回', async ({ page }) => {
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/#/companions/heading-check/edit');
    const heading = page.locator('.companion-creation-heading');
    const back = heading.getByRole('button', { name: '返回我的学伴', exact: true });
    await expect(back).toBeVisible();
    const backBox = (await back.boundingBox())!;
    const titleBox = (await heading.locator('h1').boundingBox())!;
    expect(titleBox.y - backBox.y - backBox.height).toBeGreaterThanOrEqual(8);
    expect(backBox.height).toBeGreaterThanOrEqual(44);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await back.press('Enter');
    await expect(page).toHaveURL(/#\/companions$/);
    await expect(page.getByRole('heading', { name: '我的学伴', exact: true })).toBeVisible();
  }
});

test('页头创建按钮悬停只轻微上浮，点击仍进入对应创建页', async ({ page }) => {
  for (const width of [1440, 900]) {
    await page.setViewportSize({ width, height: 900 });
    for (const [route, label, title] of [
      ['/#/companions', '创建学伴', '创建我的学伴'],
      ['/#/workshop', '创建教学方法', '创建教学方法'],
    ] as const) {
      await page.mouse.move(0, 0);
      await page.goto(route);
      const button = page.locator('main .page-heading').getByRole('button', { name: label, exact: true });
      const before = (await button.boundingBox())!;
      await button.hover();
      await expect(button).toHaveCSS('transform', 'matrix(1, 0, 0, 1, 0, -2)');
      const after = (await button.boundingBox())!;
      expect(after.y - before.y).toBeCloseTo(-2, 0);
      expect(after.x).toBeCloseTo(before.x, 0);
      expect(after.width).toBeCloseTo(before.width, 0);
      await button.click();
      await expect(page.getByRole('heading', { name: title, level: 1, exact: true })).toBeVisible();
    }
  }
});
