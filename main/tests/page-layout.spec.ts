import { test, expect } from './workspace-fixture';

test('主要页面共用标题、背景与顶部尺寸，桌面和手机导航保持可用', async ({ page }, info) => {
  const routes = [['首页', '/#/home'], ['教学 SKILL 集市', '/#/market'], ['我的 SKILL', '/#/workshop'], ['我的学伴', '/#/companions']] as const;
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    let baseline: { x: number; y: number; font: string; header: number; background: string } | undefined;
    for (const [name, route] of routes) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      const metrics = await page.evaluate(() => {
        const title = document.querySelector('main h1')!;
        const rect = title.getBoundingClientRect();
        return { x: rect.x, y: rect.y, font: getComputedStyle(title).fontSize,
          header: document.querySelector('.app-header')!.getBoundingClientRect().height,
          background: getComputedStyle(document.querySelector('.application')!).backgroundImage };
      });
      baseline ||= metrics;
      expect(metrics.font).toBe(baseline.font);
      expect(metrics.x).toBe(baseline.x);
      expect(metrics.y).toBe(baseline.y);
      expect(metrics.header).toBe(baseline.header);
      expect(metrics.background).toBe(baseline.background);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const hero = await page.locator('main .page-heading').boundingBox();
      expect(hero!.height).toBeGreaterThanOrEqual(width > 760 ? 176 : 144);
      await expect(page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page');
      await page.screenshot({ path: info.outputPath(`${route.split('/#/')[1]}-${width}.png`), fullPage: true });
    }
    for (const route of ['/#/create/layout', '/#/companions/layout/edit']) {
      await page.goto(route);
      await expect(page.locator('main h1')).toHaveCSS('font-size', baseline!.font);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
