import { expect, test } from './workspace-fixture';

// 同一会话内删除方法草稿后，浏览器返回到旧的创建地址不得自动复活空草稿。
test('删除方法草稿后浏览器返回旧创建地址不复活空草稿', async ({ page }) => {
  await page.goto('/#/create/return-delete-draft');
  await page.getByLabel('教学想法').fill('学生阅读时缺少依据，我希望先追问原文证据。');
  await page.getByRole('button', { name: '保存并退出', exact: true }).click();
  await expect(page).toHaveURL(/#\/workshop\?tab=skills$/);

  const item = page.locator('[data-work-id="method-draft:return-delete-draft"]');
  await expect(item).toBeVisible();
  await item.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: /^删除/ }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(item).toHaveCount(0);

  const storedIds = () =>
    page.evaluate(() =>
      JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]').map(
        (assistant: { id: string }) => assistant.id,
      ),
    );
  expect(await storedIds()).not.toContain('return-delete-draft');

  await page.goBack();
  await expect(page).toHaveURL(/#\/create\/return-delete-draft$/);
  expect(await storedIds()).not.toContain('return-delete-draft');
});
