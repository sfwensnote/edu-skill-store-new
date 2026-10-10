import { expect, type Page } from '@playwright/test';

export async function finishLearningActivity(
  page: Page,
  options: { title?: string; instructions?: string; feedback?: string } = {},
) {
  await page.locator('.activity-bottom-actions').getByRole('button', { name: '下一步', exact: true }).click();
  if (options.title) await page.getByLabel('任务名称', { exact: true }).fill(options.title);
  if (options.instructions) await page.getByLabel('任务说明', { exact: true }).fill(options.instructions);
  if (options.feedback) await page.getByLabel('提交后的教师预设提示').fill(options.feedback);
  await page.locator('.activity-bottom-actions').getByRole('button', { name: '下一步', exact: true }).click();
  await expect(page.getByRole('radio', { name: '不使用教学 SKILL', exact: true })).toBeChecked();
  await page.locator('.activity-bottom-actions').getByRole('button', { name: '下一步', exact: true }).click();
  await page
    .locator('.activity-bottom-actions')
    .getByRole('button', { name: '保存草稿', exact: true })
    .click();
}
