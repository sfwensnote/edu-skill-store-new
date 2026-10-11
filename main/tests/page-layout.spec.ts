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
      const navigationText = await page.getByRole('navigation', { name: '主要导航' }).locator('button').evaluateAll(buttons =>
        buttons.map(button => {
          const range = document.createRange(); range.selectNodeContents(button);
          const rect = range.getBoundingClientRect();
          return { left: rect.left, right: rect.right };
        }));
      for (let index = 1; index < navigationText.length; index++)
        expect(navigationText[index].left - navigationText[index - 1].right).toBeGreaterThanOrEqual(6);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      const hero = await page.locator('main .page-heading').boundingBox();
      expect(hero!.height).toBe(width > 760 ? 140 : 124);
      if (width > 760) {
        const illustration = await page.locator('main .page-heading > img').boundingBox();
        expect(illustration!.y - hero!.y).toBe(4);
        expect(hero!.y + hero!.height - illustration!.y - illustration!.height).toBe(4);
      } else if (route === '/#/companions') {
        const title = await page.locator('main h1').boundingBox();
        const action = await page.getByRole('button', { name: '创建学伴', exact: true }).boundingBox();
        expect(action!.x).toBeGreaterThanOrEqual(title!.x + title!.width - 132);
      }
      await expect(page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page');
      await page.screenshot({ path: info.outputPath(`${route.split('/#/')[1]}-${width}.png`), fullPage: true });
    }
    for (const route of ['/#/create/layout', '/#/companions/layout/edit']) {
      await page.goto(route);
      await expect(page.locator('main h1')).toHaveCSS('font-size', baseline!.font);
      if (route.startsWith('/#/create/')) {
        await expect(page.locator('.creation-position')).toHaveCount(0);
        expect((await page.locator('.creation-heading').boundingBox())!.height).toBeLessThan(width > 760 ? 176 : 144);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
