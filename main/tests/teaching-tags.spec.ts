import { fillMethodDetails } from './fixtures/method-form';
import { test, expect } from './demo-workspace-fixture';
import { mockQuestions } from '../shared/teaching-method';
import { teachingCategories } from '../shared/teaching-tags';
import { marketSkills } from './fixtures/marketplace';
import { addMarketSkill } from '../shared/marketplace';

test('教学分类必选并与集市一致，标签可恢复；SKILL 核对和预览不产生学生任务', async ({ page }) => {
  await page.goto('/#/create/tag-metadata');
  const idea = page.getByLabel('教学想法');
  await expect(idea).not.toHaveValue('');
  await expect(page.getByText('示例想法', { exact: true })).toHaveCount(0);
  await idea.focus();
  await expect(idea).toHaveValue('');
  await idea.fill('学生求解一元一次方程时，希望他先独立检查自己的步骤。');
  await page.getByLabel('教学分类').selectOption('');
  await expect(page.getByRole('button', { name: '继续', exact: true })).toBeDisabled();
  await expect(page.getByRole('heading', { name: '说说你的教学想法' })).toBeVisible();
  expect(await page.getByLabel('教学分类').locator('option').allTextContents()).toEqual(['请选择教学分类', ...teachingCategories]);
  await expect(page.getByRole('group', { name: '常用标签' })).not.toContainText(/PBL|情境|任务链/);
  await page.getByLabel('教学分类').selectOption('智能练习');
  await page.getByLabel('自定义标签').fill('一元一次方程');
  await page.getByLabel('自定义标签').press('Enter');
  await idea.focus();
  await expect(idea).toHaveValue('学生求解一元一次方程时，希望他先独立检查自己的步骤。');
  await page.reload();
  await expect(page.getByLabel('教学分类')).toHaveValue('智能练习');
  await expect(page.getByRole('button', { name: '移除标签 一元一次方程' })).toBeVisible();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  for (const question of mockQuestions) {
    await page.getByLabel('你的回答').fill(question.example);
    await page.getByRole('button', { name: '提交', exact: true }).click();
  }
  await fillMethodDetails(page, '一元一次方程自查', '引导学生独立检查变形步骤', '学生能说明每一步变形后结束');
  await page.getByRole('button', { name: '这就是我的教学方法' }).click();
  await expect(page).toHaveURL(/tag-metadata\/test/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]').find((assistant: { id: string }) => assistant.id === 'tag-metadata'));
  expect(saved.skills[0].category).toBe('智能练习');
  expect(saved.skills[0].tags).toContain('一元一次方程');
    await page.getByRole('button', { name: '确认并继续' }).click();
  await page.getByRole('button', { name: '确认并完成' }).click();
  await page.getByRole('button', { name: '学生视角预览', exact: true }).click();
  const tasks = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1') || '{}').tasks || []);
  expect(tasks).toHaveLength(0);
});

test('旧 PBL 标签不出现在我的教学方法 和试用详情，来源资料与有效标签保留', async ({ page }) => {
  const oldEntry = {
    ...marketSkills[4], area: 'inquiry' as const, scene: 'PBL 项目反思',
    skill: { ...marketSkills[4].skill, category: '项目式学习' as const, tags: ['PBL 项目反思', '任务链设计', '证据追问'] },
  };
  const workspace = JSON.stringify({ version: 1, addedSkills: addMarketSkill([], oldEntry, '2026-10-10T08:00:00Z') });
  await page.addInitScript((raw) => {
    const key = 'teaching-method.market-workspace.v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
    if (!sessionStorage.getItem('teaching-method.market-filters')) sessionStorage.setItem('teaching-method.market-filters', JSON.stringify({ category: '项目式学习', tag: 'PBL 项目反思', area: 'inquiry' }));
    if (!sessionStorage.getItem('teaching-method.workshop-filters.v1')) sessionStorage.setItem('teaching-method.workshop-filters.v1', JSON.stringify({ panels: { added: { area: 'daily' } } }));
  }, workspace);
  await page.goto('/#/market');
  await expect(page.locator('.market-resource-card')).toHaveCount(5);
  await expect(page.locator('main')).not.toContainText(/PBL|情境探究|任务链设计|项目式学习/);
  await page.goto('/#/workshop?tab=added');
  const card = page.locator('.workshop-item');
  await expect(page.getByLabel('作品板块')).toHaveCount(0);
  await expect(page.locator('main')).not.toContainText(/PBL|情境探究|任务链设计|项目式学习/);
  await expect(card).toContainText('证据追问');
  await expect(card).not.toContainText(/PBL|任务链设计|项目式学习/);
  await card.getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.locator('main')).not.toContainText(/PBL|情境探究|任务链设计|项目式学习/);
  await expect(page.locator('.detail-heading')).toContainText('未分类');
  await expect(page.locator('.detail-heading')).not.toContainText(/PBL|任务链设计|项目式学习/);
  await page.getByRole('button', { name: '查看模型回复', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('模型回复');
  expect(await page.evaluate(() => localStorage.getItem('teaching-method.market-workspace.v1'))).toBe(workspace);
});

test('创建页不再接受 PBL 类自定义标签，普通知识点仍可添加和恢复', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/create/no-pbl-tags');
  await page.getByLabel('自定义标签').fill('pbl 项目');
  await page.getByLabel('自定义标签').press('Enter');
  await expect(page.getByRole('alert')).toContainText('不再使用');
  await expect(page.getByRole('button', { name: '移除标签 pbl 项目' })).toHaveCount(0);
  await page.getByLabel('自定义标签').fill('阅读理解');
  await page.getByLabel('自定义标签').press('Enter');
  await expect(page.getByRole('button', { name: '移除标签 阅读理解' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '移除标签 阅读理解' })).toBeVisible();
  await expect(page.getByRole('group', { name: '常用标签' })).not.toContainText(/PBL|情境|任务链/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('情境探究的分类和标签可恢复，手机表单不横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/inquiry');
  await page.getByRole('button', { name: '填入数学租赁案例' }).click();
  await page.getByLabel('教学分类').selectOption('');
  await page.getByRole('button', { name: '开始设计' }).click();
  await expect(page.getByRole('alert')).toContainText('教学分类');
  await page.getByLabel('教学分类').selectOption('知识讲解');
  await page.getByLabel('自定义标签').fill('一次函数应用');
  await page.getByLabel('自定义标签').press('Enter');
  await page.reload();
  await expect(page.getByLabel('教学分类')).toHaveValue('知识讲解');
  await expect(page.getByRole('button', { name: '移除标签 一次函数应用' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '开始设计' }).click();
  await page.reload();
  await page.getByText('教学背景', { exact: true }).click();
  await expect(page.getByLabel('教学分类')).toHaveValue('知识讲解');
  await expect(page.getByRole('button', { name: '移除标签 一次函数应用' })).toBeVisible();
});

test('旧方法体验保留资料，不混入我的教学方法 或教学任务', async ({ page }) => {
  const trial = { id: 'old-method-trial', title: '旧方法体验', kind: 'skill', level: 1, skill: marketSkills[0], instructions: '体验方法', feedback: '旧提示',
    submissions: [{ answers: { 回答: '我还没有发现错误' }, submittedAt: '2026-10-09T00:00:00.000Z', feedback: '旧提示' }], createdAt: '2026-10-09T00:00:00.000Z' };
  await page.addInitScript((task) => {
    if (!localStorage.getItem('teaching-method.market-workspace.v1')) localStorage.setItem('teaching-method.market-workspace.v1', JSON.stringify({ version: 1, tasks: [task] }));
  }, trial);
  await page.goto('/#/space');
  await expect(page.getByRole('heading', { name: '还没有教学任务' })).toBeVisible();
  await expect(page.getByText('旧方法体验', { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '我的教学方法', exact: true }).click();
  await expect(page.getByText('历史方法试用', { exact: true })).toHaveCount(0);
  await page.goto('/#/task/old-method-trial');
  await expect(page.getByText('我还没有发现错误', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '提交学习记录' })).toHaveCount(0);
  await page.getByRole('button', { name: '返回我的教学方法', exact: true }).click();
  await expect(page).toHaveURL(/#\/workshop/);
});
