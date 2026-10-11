import { test, expect } from './workspace-fixture';
import { initialMine } from '../src/data/platform';
import { methodPreviewCases } from '../shared/method-preview';
import { demoSkillReply } from '../shared/skill-preview';

test('学生视角沿用当前教学方法的情况与回复，可输入、重置并返回来源页', async ({ page }) => {
  const assistant = {
    ...initialMine[0],
    id: 'trial-preview-fixture',
    status: 'TRIAL' as const,
    isPublic: false,
    activity: '一元一次方程练习',
  };
  await page.addInitScript((seed) => {
    localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([seed]));
  }, assistant);
  const apiRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) apiRequests.push(request.url());
  });

  await page.goto('/#/assistant/trial-preview-fixture/logs');
  await page.getByRole('button', { name: '学生视角预览', exact: true }).click();
  await expect(page).toHaveURL(/student-preview\?from=logs&return=/);
  await expect(page.getByText('学生视角预览')).toBeVisible();
  await expect(page.locator('main')).not.toContainText(/Demo|演示|预置|示例/);
  const example = methodPreviewCases(assistant.skills)[0];
  const reply = demoSkillReply({ skill: assistant.skills[0], caseId: example.id,
    messages: [{ role: 'user', content: example.studentInput }] });
  await expect(page.locator('.student-message').first()).toContainText(example.studentInput);
  await expect(page.locator('.student-message').last()).toContainText(reply);
  await page.getByRole('button', { name: example.studentInput, exact: true }).click();
  await expect(page.getByLabel('以学生身份输入')).toHaveValue(example.studentInput);
  await page.getByRole('button', { name: '发送学生问题' }).click();
  await expect(page.locator('.student-message')).toHaveCount(4);
  await expect(page.locator('.student-message').last()).toContainText(reply);
  await page.getByRole('button', { name: '重新开始' }).click();
  await expect(page.locator('.student-message')).toHaveCount(2);
  await expect(page.locator('.student-message').first()).toContainText(example.studentInput);
  await expect(page.locator('.student-message').last()).toContainText(reply);
  const composer = page.getByLabel('以学生身份输入');
  const initialHeight = (await composer.boundingBox())!.height;
  await composer.fill('第一步\n第二步\n第三步\n第四步');
  expect((await composer.boundingBox())!.height).toBeGreaterThan(initialHeight);
  await expect(composer).toHaveCSS('resize', 'none');
  await expect(composer).toHaveCSS('border-top-width', '0px');
  await composer.press('Shift+Enter');
  await expect(composer).toHaveValue('第一步\n第二步\n第三步\n第四步\n');
  const messages = await page.locator('.student-message').count();
  await composer.dispatchEvent('keydown', { key: 'Enter', code: 'Enter', isComposing: true });
  await expect(page.locator('.student-message')).toHaveCount(messages);
  await composer.press('Enter');
  await expect(page.locator('.student-message')).toHaveCount(messages + 2);
  await expect(composer).toHaveValue('');
  await page.getByRole('button', { name: '返回教学预览' }).first().click();
  await expect(page).toHaveURL(/\/logs$/);

  await page.getByRole('button', { name: '查看核对摘要' }).first().click();
  await page.getByRole('button', { name: '学生视角预览', exact: true }).click();
  await expect(page).toHaveURL(/student-preview\?from=report&return=/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: '返回核对摘要' }).first().click();
  await expect(page).toHaveURL(/\/report(?:\?|$)/);
  expect(apiRequests).toEqual([]);
});
