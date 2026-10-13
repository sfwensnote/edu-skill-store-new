import { test, expect, type Page } from './workspace-fixture';
import { initialMine } from '../src/data/platform';
import { completeTeachingMethod } from './fixtures/teaching-method';

async function fill(page: Page) {
  await page.getByRole('textbox', { name: '教学方法名称', exact: true }).fill('分步解释方法');
  await page.getByRole('textbox', { name: '教学方法简介', exact: true }).fill('引导学生逐步说明自己的思路');
  await page.getByRole('combobox', { name: '学段', exact: true }).selectOption('初中');
  await page.getByRole('combobox', { name: '学科', exact: true }).selectOption('任意学科');
  await page.getByRole('combobox', { name: '教学分类', exact: true }).selectOption('知识讲解');
  await page.getByRole('checkbox', { name: '标签 知识讲解', exact: true }).check();
  await page.getByRole('textbox', { name: '想解决的问题', exact: true }).fill('学生不能完整说明推理过程');
  await page.getByRole('textbox', { name: '希望学生达到', exact: true }).fill('独立解释推理过程');
  await page.getByRole('textbox', { name: '什么时候开始', exact: true }).fill('学生只给出结论时');
  await page.getByRole('textbox', { name: '步骤 1', exact: true }).fill('请学生先说明自己的第一步');
  await page.getByRole('textbox', { name: '结束条件', exact: true }).fill('学生能够独立解释完整过程时结束');
}

test('创建直接进入双栏填写，只有第一步必填，刷新与预览后完成封装', async ({ page }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/#/home');
  await page.getByRole('banner').getByRole('button', { name: '整理教学方法', exact: true }).click();
  await expect(page.getByRole('heading', { name: '创建教学方法', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: '教学方法的自然语言表达', exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '引导对话' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '说说你的教学想法', exact: true })).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '想解决的问题', exact: true })).toHaveValue('');
  await expect(page.getByRole('button', { name: '完成整理', exact: true })).toBeDisabled();
  await fill(page);
  await page.getByRole('button', { name: '添加步骤', exact: true }).click();
  await page.getByRole('button', { name: '添加步骤', exact: true }).click();
  await page.getByRole('textbox', { name: '步骤 3', exact: true }).fill('请学生说明相邻步骤之间的联系');
  await expect(page.getByRole('textbox', { name: '步骤 1', exact: true })).toHaveAttribute('required', '');
  await expect(page.getByRole('textbox', { name: '步骤 2', exact: true })).not.toHaveAttribute('required', '');
  await expect(page.getByRole('button', { name: '完成整理', exact: true })).toBeEnabled();
  await page.reload();
  await expect(page.getByRole('textbox', { name: '步骤 3', exact: true })).toHaveValue('请学生说明相邻步骤之间的联系');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('direct-method-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.getByRole('button', { name: '预览教学方法', exact: true }).click();
  await expect(page.getByRole('dialog').locator('.preview-method-step')).toHaveCount(2);
  await expect(page.getByRole('dialog')).toContainText('步骤 2：请学生说明相邻步骤之间的联系');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: '预览教学方法', exact: true })).toBeFocused();
  await page.getByRole('button', { name: '完成整理', exact: true }).click();
  await expect(page).toHaveURL(/\/test/);
  await expect(page.getByRole('button', { name: '开始验证', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});

test('旧想法阶段草稿直接恢复填写内容，写入失败保留输入并可保存退出', async ({ page }) => {
  const owner = { ...initialMine[0], id: 'old-direct', skills: [], status: 'DRAFT', revision: 1, goal: '已有教学想法' };
  const draft = { originalIdea: '已有教学想法', grade: '初中', subject: '数学', teachingScene: '错因辅导', stage: 'idea', method: completeTeachingMethod(), conversation: [], questionIndex: 2, manualEdits: [], sourceRevision: 1 };
  await page.addInitScript(({ owner, draft }) => {
    if (localStorage.getItem('old-direct-seeded')) return;
    localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([owner]));
    localStorage.setItem('teaching-assistant.method-draft.v1:old-direct', JSON.stringify(draft));
    localStorage.setItem('old-direct-seeded', 'true');
  }, { owner, draft });
  await page.goto('/#/create/old-direct');
  await expect(page.getByRole('textbox', { name: '教学方法名称', exact: true })).toHaveValue(draft.method.name!);
  await expect(page.getByRole('textbox', { name: '步骤 1', exact: true })).toHaveValue(draft.method.teachingSteps[0].action);
  await page.evaluate(() => { const original = Storage.prototype.setItem;
    (window as unknown as { restoreDirectWrite: () => void }).restoreDirectWrite = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(key, value) { if (key.startsWith('teaching-assistant.method-draft.v1:')) throw new DOMException('full', 'QuotaExceededError'); original.call(this, key, value); };
  });
  await page.getByRole('textbox', { name: '步骤 1', exact: true }).fill('保留这条教师自行填写的做法');
  await page.getByRole('button', { name: '保存并退出', exact: true }).click();
  await expect(page).toHaveURL(/create\/old-direct/);
  await expect(page.getByRole('textbox', { name: '步骤 1', exact: true })).toHaveValue('保留这条教师自行填写的做法');
  await page.evaluate(() => (window as unknown as { restoreDirectWrite: () => void }).restoreDirectWrite());
  await page.getByRole('button', { name: '保存并退出', exact: true }).click();
  await expect(page).toHaveURL(/workshop/);
  await page.goto('/#/create/old-direct');
  await expect(page.getByRole('textbox', { name: '步骤 1', exact: true })).toHaveValue('保留这条教师自行填写的做法');
});
