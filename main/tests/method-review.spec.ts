import { test, expect } from '@playwright/test';
import { initialMine } from '../src/data/platform';

const fixture = {
  ...initialMine[0], id: 'review-flow', revision: 2, status: 'GENERATED' as const, isPublic: false,
  skills: [{ ...initialMine[0].skills[0], id: 'review-method', tags: ['一元一次方程'], steps: [
    { condition: '学生第一次答错', action: '先让学生回顾思路' },
    { condition: '回顾以后还是没有发现问题', action: '提醒他检查可能出错的那一步' },
  ], behaviorSteps: ['先让学生回顾思路', '提醒他检查可能出错的那一步'] }],
};

test.beforeEach(async ({ page }) => {
  await page.addInitScript((assistant) => {
    if (!localStorage.getItem('review-seeded')) {
      localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([assistant]));
      localStorage.setItem('teaching-method.market-workspace.v1', JSON.stringify({ version: 1, sharedSkillIds: [`personal:${assistant.id}:review-method`] }));
      localStorage.setItem('review-seeded', 'true');
    }
  }, fixture);
});

test('核对就地修改、重新核对、预览第二步、摘要与分享形成完整闭环', async ({ page }) => {
  const errors: string[] = [];
  const requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/assistant/review-flow/test');
  await page.getByRole('button', { name: '确认并继续' }).click();
  await page.getByRole('button', { name: '修改当前方法' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByRole('button', { name: '编辑做法 2' }).click();
  await editor.getByRole('textbox', { name: '做法 2', exact: true }).fill('请学生标出不确定的一步，再提供一个针对性提示。');
  await editor.getByRole('button', { name: '保存并重新核对' }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator('.testing-title')).toContainText('v3.0');
  await expect(page.locator('.test-case-head')).toContainText('情况 1');
  await page.reload();
  await page.getByRole('button', { name: '确认并继续' }).click();
  await expect(page.locator('.simulation-line.assistant')).toContainText('请学生标出不确定的一步');
  await page.getByRole('button', { name: '确认并完成' }).click();
  await page.getByRole('button', { name: '学生视角预览', exact: true }).click();
  await expect(page).toHaveURL(/student-preview\?from=test/);
  await page.getByRole('tab', { name: '方法步骤', exact: true }).click();
  await expect(page.getByText('回顾以后还是没有发现问题', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '预览这一步' }).nth(1).click();
  await expect(page.getByRole('tab', { name: '体验引导' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('预览教学情况')).toHaveValue('review-method:1');
  await page.screenshot({ path: 'docs/assets/简化后-方法预览.png', fullPage: true });
  await page.getByLabel('以学生身份输入').fill('我回顾了，还是找不到问题。');
  await page.getByRole('button', { name: '发送学生问题' }).click();
  await expect(page.locator('.student-message').last()).toContainText('请学生标出不确定的一步');
  await expect(page.getByLabel('预览教学情况')).toHaveValue('review-method:1');
  await expect(page.getByRole('button', { name: '完成，返回我的 SKILL' })).toBeVisible();
  await page.getByText('核对记录', { exact: true }).click();
  await expect(page.getByText('v3.0 · 教师已核对方法内容')).toBeVisible();
  await expect(page.getByRole('button', { name: '分享到集市', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '分享到集市', exact: true }).click();
  await expect(page).toHaveURL(/#\/market/);
  await expect(page.locator('.market-resource-card').filter({ hasText: '错误后反思引导' })).toHaveCount(2);
  await page.goto('/#/assistant/review-flow/logs');
  await page.getByRole('button', { name: /查看方法步骤/ }).click();
  await expect(page.locator('.method-step-list > li')).toHaveCount(2);
  await page.screenshot({ path: 'test-results/方法步骤-桌面.png', fullPage: true });
  await page.getByRole('button', { name: '预览这一步' }).nth(1).click();
  await expect(page.getByLabel('预览教学情况')).toHaveValue('review-method:1');
  await page.getByRole('button', { name: '返回方法步骤' }).first().click();
  await expect(page).toHaveURL(/\/logs\/review-method/);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/方法步骤-手机.png', fullPage: true });
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});

test('多方法预览只分享当前方法，完成直接返回作品，未找到的步骤不冒用其他方法', async ({ page }) => {
  const multi = { ...fixture, id: 'multi-review', status: 'TESTED', skills: [fixture.skills[0], {
    ...fixture.skills[0], id: 'method-two', name: '第二项方法', steps: [{ condition: '学生缺少证据', action: '请学生指出原文依据' }],
    behaviorSteps: ['请学生指出原文依据'],
  }] };
  await page.addInitScript((assistant) => {
    localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([assistant]));
    localStorage.setItem('teaching-method.market-workspace.v1', JSON.stringify({ version: 1, sharedSkillIds: [] }));
  }, multi);
  await page.goto('/#/assistant/multi-review/student-preview?from=logs');
  await page.getByLabel('预览教学情况').selectOption('method-two:0');
  await page.getByLabel('以学生身份输入').fill('我不知道依据在哪里');
  await page.getByRole('button', { name: '发送学生问题' }).click();
  await expect(page.locator('.student-message').last()).toContainText('请学生指出原文依据');
  await page.getByRole('button', { name: '分享到集市', exact: true }).click();
  const workspace = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!));
  expect(workspace.sharedSkillIds).toEqual(['personal:multi-review:method-two']);
  expect(workspace.tasks).toHaveLength(0);
  await page.getByRole('button', { name: '第二项方法', exact: true }).click();
  const step = page.locator('.method-step-list > li').first();
  await expect(step).toHaveCSS('padding-left', '0px');
  expect(await step.evaluate((node) => getComputedStyle(node, '::before').content)).toBe('none');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'docs/assets/简化后-方法详情.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await expect.poll(() => page.locator('.method-context > div').first().evaluate(
    (node) => getComputedStyle(node).gridTemplateColumns.split(' ').length,
  )).toBe(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/assets/简化后-方法详情-手机.png', fullPage: true, animations: 'disabled', scale: 'css' });
  await page.getByRole('button', { name: '预览方法', exact: true }).click();
  await expect(page.getByLabel('预览教学情况')).toHaveValue('method-two:0');
  await expect(page.getByRole('button', { name: '我的 SKILL', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: '完成，返回我的 SKILL' }).click();
  await expect(page).toHaveURL(/workshop\?tab=skills$/);
  await page.goto('/#/assistant/multi-review/student-preview?from=method&case=missing:0');
  await expect(page.getByRole('heading', { name: '没有找到这项方法' })).toBeVisible();
  await expect(page.locator('.student-chat')).toHaveCount(0);
});

test('未采用的方法只能预览，重新形成后加入核对，保存失败不冒充已加入', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('teaching-assistant.excluded-skills.v1', JSON.stringify({ 'review-flow': ['review-method'] }));
  });
  await page.goto('/#/assistant/review-flow/student-preview?from=method&case=review-method:1');
  await expect(page.getByRole('button', { name: '分享到集市', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '先核对教学方法', exact: true }).click();
  await expect(page).toHaveURL(/create\/review-flow\?skill=review-method/);
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page).toHaveURL(/assistant\/review-flow\/test/);
  const excluded = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-assistant.excluded-skills.v1')!));
  expect(excluded['review-flow']).toEqual([]);
  await expect(page.locator('.test-case-head')).toContainText('情况 1');
  await page.goto('/#/create/review-flow?skill=review-method');
  await page.reload();
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key === 'teaching-assistant.excluded-skills.v1')
        throw new DOMException('quota', 'QuotaExceededError');
      write.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page).toHaveURL(/create\/review-flow\?skill=review-method/);
  await expect(page.getByText('方法已整理，核对流程未能保存，请释放存储空间后重试。')).toBeVisible();
  const stored = await page.evaluate(() => ({
    excluded: JSON.parse(localStorage.getItem('teaching-assistant.excluded-skills.v1')!),
    assistant: JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2')!)[0],
  }));
  expect(stored.excluded['review-flow']).toEqual(['review-method']);
  expect(stored.assistant.status).toBe('DRAFT');
});

test('修改可以放弃，未核对版本不能分享，保存失败不替换原方法', async ({ page }) => {
  await page.goto('/#/assistant/review-flow/report');
  await expect(page.getByRole('button', { name: '分享到集市', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '去核对方法' }).click();
  await page.getByRole('button', { name: '修改当前方法' }).click();
  const editor = page.getByRole('dialog');
  await editor.getByRole('button', { name: '编辑做法 1' }).click();
  await editor.getByLabel('做法 1', { exact: true }).fill('不保存的修改');
  await editor.getByRole('button', { name: '取消', exact: true }).click();
  await editor.getByRole('button', { name: '放弃修改' }).click();
  await expect(page.locator('.simulation-line.assistant')).toContainText('先让学生回顾思路');
  await page.getByRole('button', { name: '修改当前方法' }).click();
  await editor.getByRole('button', { name: '编辑做法 1' }).click();
  await editor.getByLabel('做法 1', { exact: true }).fill('存储失败时的修改');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await editor.getByRole('button', { name: '保存并重新核对' }).click();
  await expect(editor.getByRole('alert')).toContainText('修改未保存');
  await expect(page.locator('.testing-title')).toContainText('v2.0');
});
