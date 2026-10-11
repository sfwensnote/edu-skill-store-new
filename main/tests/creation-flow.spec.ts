import { fillMethodDetails } from './fixtures/method-form';
import { test, expect } from './demo-workspace-fixture';

test('教师回答逐步形成方法，修改后封装为相同 SKILL，创建流程不请求 API', async ({ page }) => {
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiRequests.push(request.url());
  });
  await page.goto('/#/create/e2e-guided-flow');
  await expect(page.getByRole('heading', { name: '说说你的教学想法' })).toBeVisible();
  await expect(page.getByLabel('教学想法')).toHaveValue(/学生做错题以后经常等答案/);
  await page.getByRole('checkbox', { name: '标签 错因辅导', exact: true }).check();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect(page.getByRole('heading', { name: '梳理我的教学方法' })).toBeVisible();
  await expect(page.getByRole('button', { name: '编辑希望学生达到' })).toContainText('待补充');
  await expect(page.getByRole('textbox', { name: '你的回答' })).toHaveValue(/我希望他不要马上依赖答案/);
  await page.getByRole('textbox', { name: '你的回答' }).fill('我希望学生先独立检查自己的解题思路。');
  await page.getByRole('button', { name: '提交', exact: true }).click();
  await expect(page.getByRole('button', { name: '编辑希望学生达到' })).toContainText(
    '我希望学生先独立检查自己的解题思路。',
  );

  for (let index = 1; index < 4; index++) {
    await page.getByRole('button', { name: '提交', exact: true }).click();
  }
  await expect(page.getByRole('button', { name: '编辑情况 2' })).toBeVisible();
  await expect(page.getByRole('button', { name: '编辑做法 2' })).toContainText('待补充');
  for (let index = 4; index < 6; index++) {
    await page.getByRole('button', { name: '提交', exact: true }).click();
  }
  await expect(
    page.getByRole('heading', { name: '另一位教师按这套方法去做，能否复现你的做法？' }),
  ).toBeVisible();
  await fillMethodDetails(page, '解题思路追问', '帮助学生找出不确定的解题步骤', '学生能解释正确思路时结束');
  await page.getByRole('button', { name: '编辑做法 1' }).click();
  await page.getByRole('textbox', { name: '做法 1' }).fill('请学生先标出不确定的一步');
  await page.getByRole('button', { name: '这就是我的教学方法' }).click();
  await expect(page).toHaveURL(/#\/assistant\/e2e-guided-flow\/test/);
  await expect(page.locator('.check-list')).toContainText('请学生先标出不确定的一步');
  await expect(page.locator('.simulation-line.assistant')).toContainText('先标出你不确定的一步');
  await page.getByRole('button', { name: '返回上一步', exact: true }).click();
  await page.getByRole('button', { name: '修改', exact: true }).click();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('button', { name: '编辑做法 1' })).toContainText('请学生先标出不确定的一步');
  await expect(
    page.getByRole('heading', { name: '另一位教师按这套方法去做，能否复现你的做法？' }),
  ).toBeVisible();
  await page.getByRole('button', { name: '这就是我的教学方法' }).click();
  await expect(page).toHaveURL(/#\/assistant\/e2e-guided-flow\/test(?:\?|$)/);
  expect(apiRequests).toEqual([]);
});

test('教师可以补充情况和原则；移动端内容不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/create/e2e-guided-mobile');
  await page.getByLabel('教学想法').fill('学生朗读时常在句子中间停顿，我想让他们自己听出语气变化。');
  await page.getByRole('checkbox', { name: '标签 知识讲解', exact: true }).check();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '你的回答' })).toHaveValue('');
  await page.getByRole('button', { name: '补充一种情况和做法' }).click();
  await expect(page.getByRole('button', { name: '编辑情况 1' })).toContainText('待补充');
  await page.getByRole('button', { name: '补充一条原则' }).click();
  await expect(page.getByRole('button', { name: '编辑原则 1' })).toContainText('待补充');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
