import { test, expect } from './workspace-fixture';
import { editMethodField, fillMethodDetails } from './fixtures/method-form';
import { mockQuestions } from '../shared/teaching-method';

test('教学想法与标签必填，未完成的创建草稿可刷新恢复', async ({ page }) => {
  await page.goto('/#/create/required-idea');
  const next = page.getByRole('button', { name: '继续', exact: true });
  await expect(next).toBeDisabled();
  await page.getByLabel('教学想法').fill('  ');
  await page.getByRole('checkbox', { name: '标签 错因辅导', exact: true }).check();
  await expect(next).toBeDisabled();
  await page.getByLabel('教学想法').fill('学生答错后，我想让他先自己回顾思路。');
  await expect(next).toBeEnabled();
  await page.getByRole('button', { name: '移除标签 错因辅导', exact: true }).click();
  await expect(next).toBeDisabled();
  await page.getByLabel('自定义标签').fill('解题思路');
  await expect(next).toBeDisabled();
  await page.getByLabel('自定义标签').press('Enter');
  await expect(next).toBeEnabled();
  await page.getByLabel('教学分类', { exact: true }).selectOption('');
  await expect(next).toBeDisabled();
  await page.reload();
  await expect(page.getByLabel('教学想法')).toHaveValue('学生答错后，我想让他先自己回顾思路。');
  await expect(page.getByRole('button', { name: '移除标签 解题思路', exact: true })).toBeVisible();
  await expect(next).toBeDisabled();
});

test('名称、简介与结束条件缺失不能形成，原则可跳过；手机保存并完成核对', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/create/required-method');
  await page.getByLabel('教学想法').fill('学生答错后，我想让他先自己回顾思路。');
  await page.getByRole('checkbox', { name: '标签 错因辅导', exact: true }).check();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  const form = page.getByRole('button', { name: '形成 SKILL', exact: true });
  for (const question of mockQuestions.slice(0, 5)) {
    await page.getByLabel('你的回答').fill(question.example);
    await page.getByRole('button', { name: '提交', exact: true }).click();
  }
  await page.getByRole('button', { name: '跳过', exact: true }).click();
  await expect(page.getByRole('button', { name: '编辑原则 1', exact: true })).toHaveCount(0);
  await expect(form).toBeDisabled();
  await page.getByRole('button', { name: '这就是我的教学方法', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('请填写 SKILL 名称');
  await editMethodField(page, 'SKILL 名称', '解题思路追问');
  await expect(form).toBeDisabled();
  await editMethodField(page, 'SKILL 简介', '让学生先回顾自己的解题步骤');
  await expect(form).toBeDisabled();
  await expect(page.locator('.sticky-actions')).toContainText('请填写结束条件');
  await editMethodField(page, '结束条件', '学生能独立说明正确思路时结束');
  await expect(form).toBeEnabled();
  await editMethodField(page, 'SKILL 简介', '  ');
  await expect(form).toBeDisabled();
  await page.reload();
  await expect(form).toBeDisabled();
  await fillMethodDetails(page, '解题思路追问', '让学生先回顾自己的解题步骤', '学生能独立说明正确思路时结束');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('required-method-mobile.png'), fullPage: true });
  await form.click();
  await expect(page).toHaveURL(/required-method\/test/);
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教学方法核对完成' })).toBeVisible();
  const skill = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2')!)[0].skills[0]);
  expect(skill.constraints).toEqual(['结束条件：学生能独立说明正确思路时结束']);
});
