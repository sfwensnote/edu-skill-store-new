import { test, expect } from './workspace-fixture';

test('教学想法输入卡片靠面板底部，桌面手机均保留输入、草稿和继续行为', async ({ page }, info) => {
  const idea = '学生回答错误时，我先请他说明思路，再引导他检查不确定的一步。';
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await page.goto(`/#/create/composer-${width}`);
    const input = page.getByRole('textbox', { name: '教学想法', exact: true });
    await expect(page.getByRole('button', { name: '继续', exact: true })).toBeDisabled();
    await input.fill(idea);
    await page.getByRole('combobox', { name: '教学分类', exact: true }).selectOption('错因辅导');
    await page.getByRole('checkbox', { name: '标签 错因辅导', exact: true }).check();
    await expect(page.locator('.idea-count')).toHaveText(`${idea.length} / 500`);
    const geometry = await page.locator('.idea-thought').evaluate(element => {
      const panel = element.getBoundingClientRect();
      const card = element.querySelector('.idea-input')!.getBoundingClientRect();
      const input = element.querySelector('textarea')!.getBoundingClientRect();
      return { bottomGap: panel.bottom - card.bottom, inputHeight: input.height, fits: card.left >= panel.left && card.right <= panel.right };
    });
    expect(geometry.bottomGap).toBeGreaterThanOrEqual(12);
    expect(geometry.bottomGap).toBeLessThanOrEqual(28);
    expect(geometry.inputHeight).toBeGreaterThanOrEqual(140);
    expect(geometry.fits).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`composer-${width}.png`), fullPage: true, animations: 'disabled' });
    await page.reload();
    await expect(input).toHaveValue(idea);
    await page.getByRole('button', { name: '继续', exact: true }).click();
    await expect(page.getByRole('heading', { name: '梳理我的教学方法', exact: true })).toBeVisible();
  }
});
