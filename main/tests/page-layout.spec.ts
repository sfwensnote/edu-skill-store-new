import { test, expect } from './workspace-fixture';

type Rect = { x: number; y: number; width: number; height: number };
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

test('主要页面共用标题、背景与顶部尺寸，桌面和手机导航保持可用', async ({ page }, info) => {
  const routes = [['教学方法集市', '/#/market'], ['我的教学方法', '/#/workshop'], ['我的学伴', '/#/companions']] as const;
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
      if (route === '/#/workshop' && width <= 760) {
        /* 手机端“创建教学 SKILL”换到标题下方，页头按内容自适应：校验容纳该按钮，并约束在标题行 34 + 间距 8 + 控件行 44 + 内边距 24 的合理上限内。 */
        const action = await page.locator('main .page-heading .page-heading-actions').getByRole('button').first().boundingBox();
        expect(hero!.y + hero!.height).toBeGreaterThanOrEqual(action!.y + action!.height);
        expect(hero!.height).toBeLessThanOrEqual(116);
      } else {
        expect(hero!.height).toBe(width > 760 ? 132 : 100);
      }
      if (width > 760) {
        const illustration = await page.locator('main .page-heading > img').boundingBox();
        expect(illustration!.y - hero!.y).toBe(4);
        expect(illustration!.x + illustration!.width / 2).toBeCloseTo(hero!.x + hero!.width * .8, 0);
        expect(hero!.y + hero!.height - illustration!.y - illustration!.height).toBe(4);
        const actionLocator = page.locator('main .page-heading .page-heading-actions');
        if (await actionLocator.count()) {
          const actions = (await actionLocator.boundingBox())!;
          expect(overlaps(illustration!, actions)).toBe(false);
          expect(actions.x + actions.width).toBeCloseTo(hero!.x + hero!.width, 0);
        }
      } else if (route === '/#/companions') {
        const title = await page.locator('main h1').boundingBox();
        const action = await page.getByRole('button', { name: '创建学伴', exact: true }).boundingBox();
        expect(action!.x).toBeGreaterThanOrEqual(title!.x + title!.width - 132);
      }
      await expect(page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name, exact: true })).toHaveAttribute('aria-current', 'page');
      if (route === '/#/market') {
        await expect(page.locator('.catalog-result-count')).toHaveCount(1);
        await expect(page.getByLabel('排序方式')).toHaveCount(1);
        if (width > 1100) {
          const controlCenters = await page.locator('.catalog-selects > label, .catalog-result-count').evaluateAll(elements =>
            elements.map(element => { const box = element.getBoundingClientRect(); return box.y + box.height / 2; }));
          expect(Math.max(...controlCenters) - Math.min(...controlCenters)).toBeLessThanOrEqual(2);
        }
      }
      await page.screenshot({ path: info.outputPath(`${route.split('/#/')[1]}-${width}.png`), fullPage: true, animations: 'disabled' });
    }
    /* 首页使用独立展示标题角色：桌面 56px、移动 28–36px，不再与内容页 h1 同字号；首页顶部无旧 .page-heading 112 高度约定。 */
    await page.goto('/#/home');
    await expect(page.locator('main h1')).toBeVisible();
    const homeMetrics = await page.evaluate(() => {
      const title = document.querySelector('main h1')!;
      return { font: getComputedStyle(title).fontSize,
        header: document.querySelector('.app-header')!.getBoundingClientRect().height,
        background: getComputedStyle(document.querySelector('.application')!).backgroundImage };
    });
    expect(homeMetrics.header).toBe(baseline!.header);
    expect(homeMetrics.background).toBe(baseline!.background);
    const homeFont = Number.parseFloat(homeMetrics.font);
    if (width > 760) {
      expect(homeFont).toBeCloseTo(56, 0);
    } else {
      expect(homeFont).toBeGreaterThanOrEqual(28);
      expect(homeFont).toBeLessThanOrEqual(36);
    }
    await expect(page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: '首页', exact: true })).toHaveAttribute('aria-current', 'page');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`home-${width}.png`), fullPage: true, animations: 'disabled' });
    for (const route of ['/#/create/layout', '/#/companions/layout/edit']) {
      await page.goto(route);
      await expect(page.locator('main h1')).toHaveCSS('font-size', baseline!.font);
      if (route.startsWith('/#/create/')) {
        await expect(page.locator('.creation-position')).toHaveCount(0);
        const creationHeading = page.locator('.creation-heading');
        const headingBox = (await creationHeading.boundingBox())!;
        const backBox = (await creationHeading.locator('.back-link').boundingBox())!;
        const titleBox = (await creationHeading.locator('h1').boundingBox())!;
        const actionBox = (await creationHeading.locator('.page-heading-actions').boundingBox())!;
        /* 返回、标题、保存的实际矩形互不相交，且都完整落在页头横向范围内。 */
        expect(overlaps(backBox, titleBox)).toBe(false);
        expect(overlaps(backBox, actionBox)).toBe(false);
        expect(overlaps(titleBox, actionBox)).toBe(false);
        for (const box of [backBox, titleBox, actionBox]) {
          expect(box.x).toBeGreaterThanOrEqual(headingBox.x - 0.5);
          expect(box.x + box.width).toBeLessThanOrEqual(headingBox.x + headingBox.width + 0.5);
        }
        expect(backBox.width).toBeGreaterThanOrEqual(44);
        expect(backBox.height).toBeGreaterThanOrEqual(44);
        /* 手机端保存按钮换行时页头按内容自然增高：返回行 44 + 间距 12 + 控件行 40 + 内边距 36 的合理上限。 */
        expect(headingBox.height).toBeLessThanOrEqual(width > 760 ? 112 : 140);
        const formBox = (await page.locator('.idea-form').boundingBox())!;
        const thought = (await page.locator('.idea-thought').boundingBox())!;
        const settings = (await page.locator('.idea-settings').boundingBox())!;
        expect(formBox.width).toBeCloseTo(headingBox.width, 0);
        if (width > 900) {
          expect(settings.x).toBeGreaterThanOrEqual(thought.x + thought.width);
          expect(settings.y).toBeCloseTo(thought.y, 0);
        } else expect(settings.y).toBeGreaterThanOrEqual(thought.y + thought.height);
        await expect(page.locator('.idea-form .creation-footer')).toHaveCSS('position', 'static');
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (route.startsWith('/#/create/'))
        await page.screenshot({ path: info.outputPath(`creation-${width}.png`), fullPage: true, animations: 'disabled' });
    }
  }
});

test('宽工作台与资源页的页头按同一可用宽度和间距对齐', async ({ page }) => {
  const routes = ['/#/home', '/#/create/layout', '/#/companions/layout/edit'];
  for (const width of [2560, 1920, 900, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    for (const route of routes) {
      await page.goto(route);
      await expect(page.locator('main h1')).toBeVisible();
      const header = await page.locator('.app-header .header-inner').boundingBox();
      const frame = await page.locator('main.page-frame').boundingBox();
      expect(header!.x).toBe(frame!.x);
      expect(header!.width).toBe(frame!.width);
      const gutter = width > 1100 ? 24 : width > 760 ? 20 : 16;
      expect(header!.x).toBe(gutter);
      expect(header!.width).toBe(width - gutter * 2);
      const brand = page.locator('.brand-logo');
      await expect(brand).toBeVisible();
      expect((await brand.boundingBox())!.x).toBe(header!.x + (width > 900 ? 12 : 8));
      const brandBox = (await brand.boundingBox())!;
      const brandButton = (await page.locator('.brand').boundingBox())!;
      expect(brandBox.height).toBeLessThanOrEqual(brandButton.height);
      expect(await brand.locator('img').evaluate(image => (image as HTMLImageElement).naturalWidth > 0)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    }
  }
});
