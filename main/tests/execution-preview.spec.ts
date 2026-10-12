import { test, expect, type Page } from './workspace-fixture';
import { editMethodField, fillMethodDetails } from './fixtures/method-form';
import { previewStorageKey } from '../src/features/execution/preview-runtime';
import { primaryTeacherId } from '../shared/local-accounts';

async function createMethod(page: Page) {
  await page.goto('/#/create/preview-reflect');
  await page.getByLabel('教学想法').fill('学生第一次答错时，先回顾思路，再检查不确定的一步。');
  await page.getByRole('combobox', { name: '学科', exact: true }).selectOption('任意学科');
  await page.getByRole('checkbox', { name: '标签 错因辅导', exact: true }).check();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await fillMethodDetails(page, '错因反思', '引导学生检查并改正错误', '学生能解释错误原因并独立改正');
  await editMethodField(page, '希望学生达到', '能解释错误原因并独立改正');
  await editMethodField(page, '什么时候开始', '学生第一次答错时');
  for (const [condition, action] of [['学生第一次答错', '请学生回顾解题思路'], ['学生回顾后仍没有找到问题', '提醒学生检查不确定的一步']]) {
    await page.getByRole('button', { name: '补充一种情况和做法', exact: true }).click();
    const index = await page.locator('.outline-step').count();
    await editMethodField(page, `情况 ${index}`, condition); await editMethodField(page, `做法 ${index}`, action);
  }
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page).toHaveURL(/preview-reflect\/test/);
}
async function confirm(page: Page) {
  await page.getByRole('button', { name: '开始检测', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教师确认', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '确认检测结果' })).toBeDisabled();
  await page.getByRole('checkbox', { name: '我已核对情境和回复，确认符合我的教学方法。' }).check();
  await page.getByRole('button', { name: '确认检测结果' }).click();
  await expect(page.getByRole('status').filter({ hasText: '可将这项方法挂载到学伴' })).toBeVisible();
}
test('纯前端创建 → 检测核对 → 发布 → 创建学伴 → 试运行，刷新与手机显示可用', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await createMethod(page);
  await expect(page.getByRole('button', { name: '开始检测', exact: true })).toBeEnabled();
  await confirm(page);
  await expect(page.locator('.execution-case')).toHaveCount(3);
  await expect(page.locator('.execution-case').nth(1)).toContainText('已经回顾过思路');
  await expect(page.locator('main')).not.toContainText(/服务尚未连接|Demo|演示|调用模型/);
  await page.goto('/#/workshop');
  await page.locator('.workshop-item').getByRole('button', { name: '发布到集市', exact: true }).click();
  await page.getByRole('button', { name: '确认发布', exact: true }).click();
  await expect(page.locator('.market-resource-card')).toContainText('错因反思');
  await page.goto('/#/companions/practice-buddy/edit');
  await page.getByRole('textbox', { name: '学伴名称', exact: true }).fill('反思学伴');
  await page.getByRole('textbox', { name: '学伴简介', exact: true }).fill('一起检查解题思路');
  await page.getByRole('button', { name: '下一步：选择 SKILL', exact: true }).click();
  await page.getByRole('checkbox', { name: /错因反思/ }).check();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await page.getByRole('combobox', { name: '学习对象', exact: true }).selectOption('个别学生');
  await page.getByRole('combobox', { name: '学习情境', exact: true }).selectOption('课后练习');
  await page.getByRole('textbox', { name: '学习任务与目标', exact: true }).fill('解释错误原因，独立完成修改');
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await page.getByRole('button', { name: '创建学伴', exact: true }).click();
  await expect(page).toHaveURL(/companions\/practice-buddy$/);
  await expect(page.getByRole('heading', { name: '学伴试运行', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '开始试运行', exact: true }).click();
  const field = page.getByRole('textbox', { name: '以学生身份输入', exact: true });
  await field.fill('我不知道哪里错了'); await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.execution-chat')).toContainText('请把你目前的做法和理由写出来');
  await page.getByRole('combobox', { name: '教学情境', exact: true }).selectOption({ label: '错因反思 · 情况 2' });
  await page.getByRole('button', { name: '填入当前情境的学生输入', exact: true }).click();
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.execution-chat')).toContainText('你已经回顾过思路');
  await page.reload();
  await expect(page.locator('.execution-chat')).toContainText('你已经回顾过思路');
  await expect(page.getByRole('combobox', { name: '教学情境', exact: true })).toHaveValue(/:step:1$/);
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: info.outputPath('practice-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: '结束试运行', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '以学生身份输入', exact: true })).toHaveCount(0);
  await expect(page.locator('.execution-chat')).toContainText('本次对话已结束');
  await page.getByRole('button', { name: '开始新的试运行', exact: true }).click();
  await expect(page.locator('.execution-chat .execution-transcript > li')).toHaveCount(0);
  await page.getByRole('combobox', { name: '试运行记录', exact: true }).selectOption({ index: 1 });
  await expect(page.locator('.execution-chat')).toContainText('你已经回顾过思路');
  await page.getByRole('button', { name: '我的 SKILL', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});
test('核对保存失败保留原记录和确认操作，恢复存储后可以重试', async ({ page }) => {
  await createMethod(page);
  await page.getByRole('button', { name: '开始检测', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教师确认', exact: true })).toBeVisible();
  await page.getByRole('checkbox', { name: '我已核对情境和回复，确认符合我的教学方法。' }).check();
  const key = previewStorageKey(primaryTeacherId);
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('full', 'QuotaExceededError'); write.call(this, name, value); };
  }, key);
  await page.getByRole('button', { name: '确认检测结果' }).click();
  await expect(page.getByRole('alert')).toContainText('记录未保存');
  await expect(page.getByRole('heading', { name: '教师确认', exact: true })).toBeVisible();
  await page.evaluate(() => (window as unknown as { restoreWrite: () => void }).restoreWrite());
  await page.getByRole('button', { name: '确认检测结果' }).click();
  await expect(page.getByRole('status').filter({ hasText: '可将这项方法挂载到学伴' })).toBeVisible();
});
