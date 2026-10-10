import { test, expect } from '@playwright/test';

test('助手库支持搜索、筛选和详情跳转', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/library');
  await expect(page.getByRole('heading', { name: '教学助手库' })).toBeVisible();
  await expect(page.getByText('12 个助手')).toBeVisible();
  await page.getByLabel('搜索助手').fill('英语');
  await expect(page.getByText('英语写作指导助手')).toBeVisible();
  await expect(page.getByText('1 个助手')).toBeVisible();
  await page.getByLabel('搜索助手').fill('');
  await page.getByRole('button', { name: '初中', exact: true }).click();
  await page.getByRole('button', { name: '数学', exact: true }).click();
  await expect(page.getByText('一元一次方程错因诊断助手')).toBeVisible();
  await page.getByText('一元一次方程错因诊断助手').click();
  await expect(page).toHaveURL(/#\/library\/equation-diagnosis(?:\?|$)/);
  await expect(page.getByRole('button', { name: '开始使用' })).toBeVisible();
  await page.screenshot({ path: 'test-results/library-1440.png', fullPage: true });
});

test('我的助手支持确认删除', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/mine');
  await expect(page.getByText('2 个助手')).toBeVisible();

  const moreButton = page.getByRole('button', { name: '更多操作：课堂提问设计助手' });
  const deleteButton = page.getByRole('menuitem', { name: '删除课堂提问设计助手' });
  await moreButton.click();
  await deleteButton.click();
  await expect(page.getByRole('heading', { name: '删除这项内容？' })).toBeVisible();
  await page.getByRole('button', { name: '取消' }).click();
  await expect(page.getByText('课堂提问设计助手')).toBeVisible();
  await expect(page).toHaveURL(/#\/mine$/);

  await moreButton.click();
  await deleteButton.click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.getByText('课堂提问设计助手')).toHaveCount(0);
  await expect(page.getByText('1 个助手')).toBeVisible();
  await expect(page).toHaveURL(/#\/mine$/);
});
