import { test, expect } from './workspace-fixture';

// 创建教学方法页头的几何与交互核验：返回/标题/保存不相交、可触达、有焦点与减少动画行为。
type Rect = { x: number; y: number; width: number; height: number };
const overlaps = (a: Rect, b: Rect) =>
  a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

const creationRoute = '/#/create/navigation-polish';
const creationTitle = '创建教学方法';

test('创建页头返回、标题、保存互不重叠且完整可触达', async ({ page }) => {
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(creationRoute);

    const heading = page.locator('.creation-heading');
    const back = heading.locator('.back-link');
    const name = heading.getByRole('heading', { name: creationTitle, exact: true });
    const save = heading.getByRole('button', { name: '保存并退出', exact: true });

    await expect(back).toBeVisible();
    await expect(name).toBeVisible();
    await expect(save).toBeVisible();
    await expect(back).toBeEnabled();
    await expect(save).toBeEnabled();

    const headingBox = (await heading.boundingBox())!;
    const backBox = (await back.boundingBox())!;
    const nameBox = (await name.boundingBox())!;
    const saveBox = (await save.boundingBox())!;

    // 三个实际矩形互不相交：返回不压标题，保存不与标题或返回堆叠。
    expect(overlaps(backBox, nameBox)).toBe(false);
    expect(overlaps(backBox, saveBox)).toBe(false);
    expect(overlaps(nameBox, saveBox)).toBe(false);

    // 返回按钮满足 44×44 触达下限，保存按钮不低于控件最小高度。
    expect(backBox.width).toBeGreaterThanOrEqual(44);
    expect(backBox.height).toBeGreaterThanOrEqual(44);
    expect(saveBox.height).toBeGreaterThanOrEqual(40);

    // 控件完整落在页头横向范围内，页面不横向溢出。
    for (const box of [backBox, nameBox, saveBox]) {
      expect(box.x).toBeGreaterThanOrEqual(headingBox.x - 0.5);
      expect(box.x + box.width).toBeLessThanOrEqual(headingBox.x + headingBox.width + 0.5);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);

    // 悬停返回只改变视觉状态，不推动标题或保存的实际位置。
    await back.hover();
    const hoverName = (await name.boundingBox())!;
    const hoverSave = (await save.boundingBox())!;
    expect(hoverName.x).toBeCloseTo(nameBox.x, 1);
    expect(hoverName.y).toBeCloseTo(nameBox.y, 1);
    expect(hoverSave.x).toBeCloseTo(saveBox.x, 1);
    expect(hoverSave.y).toBeCloseTo(saveBox.y, 1);
  }
});

test('创建页返回与保存可按键盘到达，返回显示焦点环并在减少动画偏好下取消过渡', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 960 });
  await page.goto(creationRoute);

  const back = page.locator('.creation-heading .back-link');
  const save = page.locator('.creation-heading').getByRole('button', { name: '保存并退出', exact: true });
  await expect(back).toBeVisible();

  // 默认状态保留轻量过渡，说明 hover/pressed 反馈真实存在。
  expect(await back.evaluate((el) => getComputedStyle(el).transitionDuration)).not.toBe('0s');

  let reachedBack = false;
  for (let attempt = 0; attempt < 15 && !reachedBack; attempt++) {
    await page.keyboard.press('Tab');
    reachedBack = await back.evaluate((el) => el === document.activeElement);
  }
  expect(reachedBack).toBe(true);

  const outline = await back.evaluate((el) => {
    const style = getComputedStyle(el);
    return { style: style.outlineStyle, width: style.outlineWidth };
  });
  expect(outline.style).not.toBe('none');
  expect(parseFloat(outline.width)).toBeGreaterThanOrEqual(2);

  // 标题用 tabIndex=-1 不进入 Tab 顺序，返回之后的下一站即保存并退出。
  await page.keyboard.press('Tab');
  expect(await save.evaluate((el) => el === document.activeElement)).toBe(true);

  await page.emulateMedia({ reducedMotion: 'reduce' });
  const reduced = await back.evaluate((el) => getComputedStyle(el).transitionDuration);
  expect(reduced.split(',').every((value) => parseFloat(value) === 0)).toBe(true);
});
