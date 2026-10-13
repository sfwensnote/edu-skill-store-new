import { test, expect } from './market-catalog-fixture';
import { initialMine } from '../src/data/platform';

const fixture = {
  ...initialMine[0], id: 'review-flow', revision: 2, status: 'GENERATED' as const, isPublic: false,
  skills: [{ ...initialMine[0].skills[0], id: 'review-method', tags: ['一元一次方程'], steps: [
    { condition: '学生第一次答错', action: '先让学生回顾思路' },
    { condition: '回顾以后还是没有发现问题', action: '提醒他检查可能出错的那一步' },
  ], behaviorSteps: ['先让学生回顾思路', '提醒他检查可能出错的那一步'],
    constraints: [...initialMine[0].skills[0].constraints, '结束条件：学生能独立检查思路并解释错误原因后结束引导'] }],
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
  await page.getByRole('button', { name: '开始验证' }).click();
  await expect(page.locator('.execution-case-heading').first()).toContainText('情况 1');
  await page.getByRole('button', { name: '确认并继续' }).click();
  const secondCase = page.locator('.execution-case').filter({ hasText: '情况 2' });
  await expect(secondCase.locator('.execution-transcript')).toContainText('我已经回顾了自己的思路，但还是没有找到哪里出了问题。');
  await expect(secondCase.locator('.execution-transcript')).toContainText('你已经回顾过思路');
  await page.getByRole('button', { name: '修改描述' }).click();
  const editor = page.locator('.execution-case-editor');
  await editor.getByLabel('教师做法', { exact: true }).fill('请学生标出不确定的一步，再提供一个针对性提示。');
  await editor.getByRole('button', { name: '保存并重新核对' }).click();
  await expect(editor).toBeHidden();
  await expect(page.getByRole('heading', { name: /教学方法验证/, level: 1 })).toBeVisible();
  await expect(page.locator('.execution-progress progress')).toHaveAttribute('value', '1');
  await expect(page.locator('main')).not.toContainText(/v\d+\.\d+/);
  await page.reload();
  await expect(page.locator('.execution-progress progress')).toHaveAttribute('value', '1');
  await expect(page.locator('.execution-case-heading').first()).toContainText('情况 2');
  await expect(page.locator('.execution-case').filter({ hasText: '情况 2' })).toContainText('请学生标出不确定的一步');
  await page.getByRole('button', { name: '确认并继续' }).click();
  await page.getByRole('button', { name: '修改描述' }).click();
  const endingEditor = page.locator('.execution-case-editor');
  await endingEditor.getByLabel('结束条件', { exact: true }).fill('学生能独立解释正确解题思路后结束');
  await endingEditor.getByRole('button', { name: '保存并重新核对' }).click();
  await expect(endingEditor).toBeHidden();
  await expect(page.locator('.execution-progress progress')).toHaveAttribute('value', '0');
  await page.getByRole('button', { name: '确认并继续' }).click();
  await page.getByRole('button', { name: '确认并继续' }).click();
  await page.getByRole('button', { name: '确认并完成验证' }).click();
  await expect(page.locator('.execution-complete')).toBeVisible();
  await page.goto('/#/assistant/review-flow/student-preview?from=test');
  await expect(page).toHaveURL(/student-preview\?from=test/);
  await page.getByRole('tab', { name: '方法步骤', exact: true }).click();
  await expect(page.getByText('回顾以后还是没有发现问题', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '预览这一步' }).nth(1).click();
  await expect(page.getByRole('tab', { name: '体验引导' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByLabel('预览教学情况')).toHaveValue('review-method:1');
  await expect(page.locator('.student-message').first()).toContainText('我已经回顾了自己的思路，但还是没有找到哪里出了问题。');
  await expect(page.locator('.student-message').last()).toContainText('先标出你不确定的一步');
  await page.screenshot({ path: 'docs/assets/简化后-方法预览.png', fullPage: true });
  await page.getByLabel('以学生身份输入').fill('我回顾了，还是找不到问题。');
  await page.getByRole('button', { name: '发送学生问题' }).click();
  await expect(page.locator('.student-message').last()).toContainText('先标出你不确定的一步');
  await expect(page.getByLabel('预览教学情况')).toHaveValue('review-method:1');
  await expect(page.getByRole('button', { name: '完成，返回我的教学方法' })).toBeVisible();
  await page.getByText('核对记录', { exact: true }).click();
  await expect(page.locator('.preview-review-record')).toContainText('教师已核对方法内容');
  await expect(page.locator('main')).not.toContainText(/v\d+\.\d+/);
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toBeVisible();
  // 新版已取消检测完成区到学生视角预览的入口：预览改用直链兼容验证，发布从完成区弹窗确认。
  await page.goto('/#/assistant/review-flow/test');
  await expect(page.locator('.execution-complete')).toBeVisible();
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  const publishDialog = page.getByRole('dialog');
  await publishDialog.getByRole('button', { name: /发布/ }).click();
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
  await expect(page.locator('.student-message').last()).toContainText('你的判断依据是什么');
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
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
  await page.goto('/#/workshop?tab=created');
  await page.locator('.workshop-item').filter({ hasText: '第二项方法' }).getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.getByRole('button', { name: '试用 教学方法', exact: true })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '试用 教学方法', exact: true })).toHaveCount(0);
  await page.goto('/#/assistant/multi-review/student-preview?from=method&case=method-two:0');
  await expect(page.getByLabel('预览教学情况')).toHaveValue('method-two:0');
  await expect(page.getByRole('button', { name: '我的教学方法', exact: true })).toHaveAttribute('aria-current', 'page');
  await page.getByRole('button', { name: '完成，返回我的教学方法' }).click();
  await expect(page).toHaveURL(/workshop\?tab=skills$/);
  await page.goto('/#/assistant/multi-review/student-preview?from=method&case=missing:0');
  await expect(page.getByRole('heading', { name: '没有找到这项方法' })).toBeVisible();
  await expect(page.locator('.student-chat')).toHaveCount(0);
});

test('未采用方法直接进入检验，加入失败时保留预览与原状态', async ({ page }) => {
  await page.addInitScript(() => {
    if (!localStorage.getItem('exclusion-seeded')) {
      localStorage.setItem('teaching-assistant.excluded-skills.v1', JSON.stringify({ 'review-flow': ['review-method'] }));
      localStorage.setItem('exclusion-seeded', 'true');
    }
  });
  await page.goto('/#/assistant/review-flow/student-preview?from=method&case=review-method:1');
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toHaveCount(0);
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function (key, value) {
      if (key === 'teaching-assistant.excluded-skills.v1') throw new DOMException('quota', 'QuotaExceededError');
      write.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '先核对教学方法', exact: true }).click();
  await expect(page).toHaveURL(/student-preview/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-assistant.excluded-skills.v1')!)['review-flow'])).toEqual(['review-method']);
  await page.evaluate(() => (window as unknown as { restoreWrite: () => void }).restoreWrite());
  await page.getByRole('button', { name: '先核对教学方法', exact: true }).click();
  await expect(page).toHaveURL(/assistant\/review-flow\/test/);
  await page.getByRole('button', { name: '开始验证' }).click();
  await expect(page.locator('.execution-case-heading').first()).toContainText('情况 1');
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-assistant.excluded-skills.v1')!)['review-flow'])).toEqual([]);
});

test('修改可以放弃，未核对版本不能分享，保存失败不替换原方法', async ({ page }) => {
  await page.goto('/#/assistant/review-flow/report');
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '教学方法验证' }).click();
  await page.getByRole('button', { name: '开始验证' }).click();
  await expect(page.locator('.execution-case-heading').first()).toContainText('情况 1');
  await page.getByRole('button', { name: '修改描述' }).click();
  const editor = page.locator('.execution-case-editor');
  await editor.getByLabel('教师做法', { exact: true }).fill('不保存的修改');
  await editor.getByRole('button', { name: '取消修改' }).click();
  await expect(editor).toBeHidden();
  await expect(page.locator('.execution-case')).toContainText('先让学生回顾思路');
  await page.getByRole('button', { name: '修改描述' }).click();
  await editor.getByLabel('教师做法', { exact: true }).fill('存储失败时的修改');
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('quota', 'QuotaExceededError'); }; });
  await editor.getByRole('button', { name: '保存并重新核对' }).click();
  await expect(page.locator('.execution-error')).toContainText('保存');
  await expect(editor.getByLabel('教师做法', { exact: true })).toHaveValue('存储失败时的修改');
  await expect(page.locator('.execution-progress progress')).toHaveAttribute('value', '0');
  const stored = await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2') || '');
  expect(stored).toContain('先让学生回顾思路');
  expect(stored).not.toContain('存储失败时的修改');
  await expect(page.locator('main')).not.toContainText(/v\d+\.\d+/);
});
