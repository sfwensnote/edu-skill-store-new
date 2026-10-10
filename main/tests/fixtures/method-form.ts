import type { Page, Locator } from '@playwright/test';

export async function editMethodField(page: Page | Locator, label: string, value: string) {
  await page.getByRole('button', { name: `编辑${label}`, exact: true }).click();
  await page.getByRole('textbox', { name: label, exact: true }).fill(value);
}

export async function fillMethodDetails(page: Page, name: string, description: string, boundary: string) {
  await editMethodField(page, 'SKILL 名称', name);
  await editMethodField(page, 'SKILL 简介', description);
  await editMethodField(page, '结束条件', boundary);
}
