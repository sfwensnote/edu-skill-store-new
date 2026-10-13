import { test, expect } from './demo-workspace-fixture';

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

test('旧我的助手地址进入我的教学方法；删除单项须确认并保留其他方法', async ({ page }) => {
  await page.goto('/#/mine');
  await expect(page.getByRole('heading', { name: '我的教学方法', exact: true })).toBeVisible();
  const first = page.locator('.workshop-item').first();
  const title = await first.locator('h3').innerText();
  await first.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: `删除${title}`, exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  await first.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: `删除${title}`, exact: true }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(5);
  await expect(page).toHaveURL(/#\/mine$/);
});
