import { test, expect } from './workspace-fixture';
import { initialMine } from '../src/data/platform';
import { editMethodField } from './fixtures/method-form';

test('教学方法预览按分组展示，返回编辑恢复焦点，缺少名称时不能完成整理', async ({ page }, info) => {
  const assistant = {
    ...structuredClone(initialMine[0]), id: 'preview-style-owner', status: 'GENERATED' as const,
    skills: [{ ...structuredClone(initialMine[0].skills[0]), id: 'preview-style-method',
      category: '错因辅导' as const, tags: ['错因辅导', '一元一次方程'],
      constraints: [...initialMine[0].skills[0].constraints, '结束条件：学生能独立解释自己的思路后结束。'],
    }],
  };
  await page.addInitScript((value) => {
    if (!localStorage.getItem('preview-style-seeded')) {
      localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([value]));
      localStorage.setItem('preview-style-seeded', 'true');
    }
  }, assistant);
  const failures: string[] = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('/#/create/preview-style-owner?skill=preview-style-method');
  const open = page.getByRole('button', { name: '预览教学方法', exact: true });
  for (const width of [1440, 320]) {
    await page.setViewportSize({ width, height: 960 });
    await open.click();
    const dialog = page.getByRole('dialog', { name: '教学方法预览' });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator('.method-preview-meta').getByText('错因辅导', { exact: true })).toHaveCount(2);
    const category = dialog.locator('.method-preview-category');
    const firstTag = dialog.locator('.method-preview-meta .teaching-tag-list > li').first();
    const { categoryBox, tagBox } = await dialog.locator('.method-preview-meta').evaluate(element => {
      const category = element.querySelector('.method-preview-category')!.getBoundingClientRect();
      const tag = element.querySelector('.teaching-tag-list > li')!.getBoundingClientRect();
      return { categoryBox: { y: category.y, height: category.height }, tagBox: { y: tag.y, height: tag.height } };
    });
    expect(tagBox.height).toBeCloseTo(categoryBox.height, 0);
    if (width > 600) expect(tagBox.y).toBeCloseTo(categoryBox.y, 0);
    await expect(category).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await expect(firstTag).toHaveCSS('background-color', 'rgb(227, 237, 231)');
    await expect(dialog.locator('.method-preview-meta').getByText('一元一次方程', { exact: true })).toBeVisible();
    await expect(dialog.locator('.method-preview-section')).toHaveCount(4);
    await expect(dialog.getByRole('heading', { name: '教学步骤', exact: true })).toBeVisible();
    const box = (await dialog.boundingBox())!;
    expect(box.x).toBeGreaterThanOrEqual(8);
    expect(box.x + box.width).toBeLessThanOrEqual(width - 8);
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    await dialog.screenshot({ path: info.outputPath(`preview-${width}.png`), animations: 'disabled' });
    await dialog.getByRole('button', { name: '返回编辑', exact: true }).click();
    await expect(dialog).toBeHidden();
    await expect(open).toBeFocused();
  }
  await editMethodField(page, '教学方法名称', '');
  await open.click();
  const dialog = page.getByRole('dialog', { name: '教学方法预览' });
  await expect(dialog.getByRole('button', { name: '确认完成整理', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(failures).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]')[0].skills[0].tags))
    .toEqual(['错因辅导', '一元一次方程']);
});
