import { test, expect } from './demo-workspace-fixture';
import { campusBrief } from '../shared/inquiry-examples';
import { finishLearningActivity } from './activity-helpers';
import { editMethodField } from './fixtures/method-form';

test('教师可以直接设计生物项目，独立保存并布置任务，不隐藏生成数学题和任务链', async ({ page }) => {
  await page.goto('/#/inquiry');
  await expect(page.getByLabel('教学内容', { exact: true })).toHaveValue('');
  await page.getByRole('button', { name: '策划一个探究项目' }).click();
  await page.getByRole('button', { name: '填入校园观察案例' }).click();
  await page.getByRole('button', { name: '开始设计', exact: true }).click();
  await page.getByRole('button', { name: '开始填写项目草案' }).click();
  await expect(page.getByLabel('项目名称', { exact: true })).toHaveValue(campusBrief.title);
  await expect(page.getByLabel('所需资源', { exact: true })).toHaveValue(/校园花坛/);
  await page.getByRole('button', { name: '保存并布置任务' }).click();
  await expect(page.getByRole('status')).toContainText('五项实施条件');
  for (const field of [
    '存在值得持续探究的实际问题',
    '需要多阶段调查或实践',
    '学生有自主决策空间',
    '有明确的项目成果',
    '时间、资源和安全条件允许实施',
  ])
    await page.getByLabel(field, { exact: true }).check();
  await page.getByLabel('我已核对项目目标、活动安排、成果与评价').check();
  await page.getByRole('button', { name: '保存并布置任务' }).click();
  await expect(page.locator('.activity-resource-option[aria-pressed="true"]')).toContainText(
    campusBrief.title,
  );
  const works = await page.evaluate(
    () => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1') || '{}').designs,
  );
  expect(works).toHaveLength(1);
  expect(works[0].contextualProblem).toBeNull();
  expect(works[0].taskChain).toBeNull();
  expect(works[0].savedLevels).toEqual([3]);
  expect(JSON.stringify(works[0])).not.toContain('8x');
  await finishLearningActivity(page, { title: '校园观察周', instructions: '带上观察表，记录证据。' });
  await page.getByRole('button', { name: '打开学生预览', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '返回教学任务' }).click();
  await expect(page.getByRole('heading', { name: '校园观察周', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await expect(page.getByLabel('任务名称', { exact: true })).toHaveValue('校园观察周');
  await expect(page.getByLabel('任务说明', { exact: true })).toHaveValue('带上观察表，记录证据。');
  await page.locator('.activity-workbench-heading').getByRole('button', { name: '保存草稿' }).click();
  await page.reload();
  await expect(page.getByLabel('任务名称', { exact: true })).toHaveValue('校园观察周');
});

test('方法详情返回原分类，集市返回保留搜索，失效链接有恢复入口', async ({ page }) => {
  await page.goto('/#/workshop?tab=skills');
  await page.locator('.workshop-item').first().getByRole('button', { name: '查看', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '返回我的 SKILL', exact: true }).click();
  await expect(page).toHaveURL(/workshop\?tab=skills$/);
  await page.getByRole('button', { name: '教学 SKILL 集市', exact: true }).click();
  await page.getByLabel('搜索 SKILL').fill('反思');
  await page.getByRole('button', { name: '错误后反思引导', exact: true }).click();
  await page.getByRole('button', { name: '返回集市', exact: true }).click();
  await expect(page.getByLabel('搜索 SKILL')).toHaveValue('反思');
  await page.goto('/#/inquiry/deleted-design/3');
  await expect(page.getByRole('heading', { name: '没有找到这项内容' })).toBeVisible();
  await page.getByRole('button', { name: '返回我的 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: '我的 SKILL', exact: true })).toBeVisible();
});

test('客户展示页面使用统一配色，没有开发说明，桌面与手机导航均可用', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: '教学工坊', exact: true })).toBeVisible();
  const color = await page.evaluate(
    () => getComputedStyle(document.querySelector('.app-header')!).backgroundColor,
  );
  expect(color).toBe('rgb(255, 255, 255)');
  await page.screenshot({ path: 'docs/assets/客户演示首页.png', fullPage: true });
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await expect(page).toHaveURL(/#\/create\//);
  await expect(page.getByRole('heading', { name: '创建教学方法' })).toBeVisible();
  for (const path of [
    'home',
    'daily',
    'inquiry',
    'market',
    'workshop',
    'space',
    'assistant/assistant-demo-active/logs',
    'assistant/assistant-demo-active/report',
  ]) {
    await page.goto(`/#/${path}`);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toContainText(/前端演示|不调用.*模型|未调用.*LLM/);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of ['home', 'inquiry', 'workshop', 'market', 'space']) {
    await page.goto(`/#/${path}`);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    if (path === 'home') await page.screenshot({ path: 'docs/assets/客户演示首页手机.png', fullPage: true });
  }
  await page.goto('/#/inquiry');
  await page.screenshot({ path: 'docs/assets/客户演示情境探究手机.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('检测返回保留正在编辑的单项 SKILL，记录不存在时不会显示别人的对话', async ({ page }) => {
  await page.goto('/#/create/assistant-demo-active?skill=progressive-hint');
  await expect(page.getByRole('button', { name: '编辑SKILL 名称' })).toContainText('渐进式提示');
  await editMethodField(page, '结束条件', '学生能独立完成下一步后结束');
  await page.getByRole('button', { name: '这就是我的教学方法' }).click();
  await expect(page).toHaveURL(/assistant-demo-active\/test/);
  await page.reload();
  await page.getByRole('button', { name: '返回上一步', exact: true }).click();
  await expect(page).toHaveURL(/skill=progressive-hint/);
  await expect(page.getByRole('button', { name: '编辑SKILL 名称' })).toContainText('渐进式提示');
  await page.goto('/#/assistant/assistant-demo-active/logs/missing-record');
  await expect(page.getByRole('heading', { name: '没有找到这项方法' })).toBeVisible();
  await page.getByRole('button', { name: '返回教学预览', exact: true }).click();
  await expect(page.getByRole('heading', { name: '七年级数学教学助手', exact: true })).toBeVisible();
});
