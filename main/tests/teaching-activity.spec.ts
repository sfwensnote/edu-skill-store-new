import { test, expect, type Page } from '@playwright/test';
import { initialMine } from '../src/data/platform';
import { buildContextualProblem, createTaskChain, rentalSampleDesign } from '../shared/contextual-design';

async function seed(page: Page) {
  const design = rentalSampleDesign('activity-ready');
  design.contextualProblem = { ...buildContextualProblem(design), confirmed: true };
  design.taskChain = { ...createTaskChain(design), needsReview: false };
  design.savedLevels = [1, 2];
  design.status = 'SAVED';
  const unconfirmed = rentalSampleDesign('activity-unconfirmed');
  unconfirmed.title = '未确认作品';
  unconfirmed.savedLevels = [1];
  unconfirmed.contextualProblem = buildContextualProblem(unconfirmed);
  const confirmed = {
    ...structuredClone(initialMine[0]),
    id: 'activity-confirmed',
    revision: 2,
    status: 'TESTED' as const,
  };
  confirmed.skills = [confirmed.skills[0]];
  confirmed.skills[0].name = '测试教师的反思方法';
  const incompatible = {
    ...structuredClone(confirmed),
    id: 'activity-incompatible',
    grade: '高中',
    subject: '英语',
  };
  incompatible.skills[0].name = '不兼容的阅读方法';
  await page.addInitScript(
    ({ design, unconfirmed, confirmed, incompatible, initialMine }) => {
      if (!localStorage.getItem('teaching-method.market-workspace.v1'))
        localStorage.setItem(
          'teaching-method.market-workspace.v1',
          JSON.stringify({
            version: 1,
            designs: [design, unconfirmed],
            favorites: [],
            sharedSkillIds: [],
            activityDrafts: [],
            tasks: [
              {
                id: 'saved-activity',
                title: '已有数学学习活动',
                kind: 'design',
                level: 1,
                design,
                instructions: '记录过程',
                feedback: '检查依据',
                submissions: [],
                createdAt: design.createdAt,
              },
            ],
          }),
        );
      if (!localStorage.getItem('teaching-assistant.frontend-demo.v2'))
        localStorage.setItem(
          'teaching-assistant.frontend-demo.v2',
          JSON.stringify([confirmed, incompatible, ...initialMine]),
        );
    },
    { design, unconfirmed, confirmed, incompatible, initialMine },
  );
  await page.goto('/#/space');
}
const next = (page: Page) =>
  page.locator('.activity-bottom-actions').getByRole('button', { name: '下一步', exact: true }).click();
const save = (page: Page) =>
  page.locator('.activity-bottom-actions').getByRole('button', { name: /^(保存草稿|保存配置)$/ }).click();

test('作品搜索只有一层边框，输入筛选可用，宽屏和窄屏不挤压图标及类型', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByRole('button', { name: '返回任务列表', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  const search = page.getByLabel('搜索教学作品', { exact: true });
  const options = page.locator('.activity-resource-option');
  await search.fill('设备租赁');
  await expect(options).toHaveCount(2);
  await page.getByLabel('教学作品类型').selectOption('2');
  await expect(options).toHaveCount(1);
  await search.fill('没有这份作品');
  await expect(options).toHaveCount(0);
  await expect(page.getByText('没有找到匹配作品，请调整搜索或类型。')).toBeVisible();
  await search.fill('一次函数');
  await expect(options).toHaveCount(1);
  for (const width of [1440, 1120, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await search.focus();
    await expect(search).toHaveCSS('border-top-width', '0px');
    await expect(page.locator('.activity-search')).toHaveCSS('border-top-width', '1px');
    await expect(page.locator('.activity-filter > span')).toHaveCSS('white-space', 'nowrap');
    const input = (await search.boundingBox())!;
    const icon = (await page.locator('.activity-search svg').boundingBox())!;
    expect(input.x).toBeGreaterThan(icon.x + icon.width);
    expect(input.width).toBeGreaterThan(180);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    if (width === 1440 || width === 390) await page.screenshot({ path: `docs/assets/教学作品搜索-${width}.png`, fullPage: true });
  }
});

test('学习活动四步、可选支持、独立快照、学生预览与一次提交可完成', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seed(page);
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await expect(page.getByRole('button', { name: /未确认作品/ })).toHaveCount(0);
  await expect(page.locator('.activity-resource-list').getByRole('button', { name: /反思方法/ })).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: /选择合适的设备租赁方案.*情境题目/ }).click();
  await next(page);
  await page.getByLabel('任务名称', { exact: true }).fill('本周租赁方案探究');
  await page.getByLabel('任务说明', { exact: true }).fill('比较费用，写清依据。');
  await page.getByLabel('学习对象方式').selectOption('class');
  await page.getByLabel('学习对象', { exact: true }).fill('七年级一班');
  await page.getByLabel('开始时间', { exact: true }).fill('2026-10-12T09:00');
  await page.getByLabel('截止时间', { exact: true }).fill('2026-10-11T09:00');
  await next(page);
  await expect(page.getByRole('alert')).toContainText('截止时间');
  await page.getByLabel('截止时间', { exact: true }).fill('2026-10-19T09:00');
  await page.getByLabel('允许多次尝试', { exact: true }).uncheck();
  await next(page);
  await expect(page.getByRole('radio', { name: /不兼容的阅读方法/ })).toBeDisabled();
  for (const radio of await page.getByRole('radio', { name: /错误后反思引导/ }).all())
    await expect(radio).toBeDisabled();
  await page.getByRole('radio', { name: /测试教师的反思方法/ }).check();
  await next(page);
  await expect(page.getByRole('button', { name: '发布教学任务', exact: true })).toHaveCount(0);
  await save(page);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/assets/新建学习活动-1440.png' });
  await page.getByRole('button', { name: '打开学生预览', exact: true }).click();
  await expect(page.getByRole('heading', { name: '本周租赁方案探究' })).toBeVisible();
  await page
    .getByLabel('我的回答', { exact: true })
    .fill('5 小时费用相同；短于 5 小时选 A，长于 5 小时选 B。');
  await page.getByRole('button', { name: '提交学习记录', exact: true }).click();
  await page.getByRole('button', { name: '继续查看我的回答' }).click();
  await expect(page.getByLabel('我的回答', { exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '提交学习记录', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '返回教学任务', exact: true }).click();
  await expect(page.locator('.activity-stepper li[aria-current="step"]')).toContainText('预览保存');
  await page.getByRole('button', { name: '返回任务列表', exact: true }).click();
  await expect(page.getByText(/1 次提交/)).toBeVisible();
  const workspace = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!),
  );
  expect(workspace.designs[0].contextualProblem.question).not.toBe('比较费用，写清依据。');
  expect(workspace.tasks[0].status).toBe('draft');
  expect(workspace.tasks[0].submissions).toHaveLength(1);
  expect(workspace.tasks[0].supportSkill.version).toBe('v2.0');
  expect(errors).toEqual([]);
});

test('SKILL 应用独立选择场景，模拟证据不会启用方法或发布学生任务', async ({ page }) => {
  await seed(page);
  await page.goto('/#/space?selection=skill:personal:activity-confirmed:reflect');
  await page.getByRole('button', { name: /测试教师的反思方法/ }).click();
  await next(page);
  await expect(page.getByText('其他应用方式', { exact: true })).toBeVisible();
  await page.getByLabel('选择教学任务').selectOption('saved-activity');
  await page.getByLabel('允许介入的情境').fill('学生第一次答错时仅提示回顾思路');
  await next(page);
  await page.getByLabel('测试情境', { exact: true }).fill('学生答错了，说明自己不清楚哪里出了问题。');
  await page.getByLabel('触发条件判断').selectOption('trigger');
  await page.getByRole('button', { name: '查看执行计划' }).click();
  await expect(page.getByText('未执行，尚无真实响应。')).toBeVisible();
  await expect(page.getByRole('heading', { name: '教学原则', exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'docs/assets/SKILL应用模拟-1440.png' });
  await next(page);
  await page.getByLabel('我已检查执行计划与原方法的对应关系').check();
  await expect(page.getByRole('button', { name: '启用 SKILL', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await page.getByLabel('触发条件判断').selectOption('no-trigger');
  await next(page);
  await expect(page.getByRole('alert')).toContainText('请先生成当前配置的执行计划');
  await page.getByRole('button', { name: '查看执行计划' }).click();
  await expect(page.getByText('教师判断：不符合，计划不介入')).toBeVisible();
  await next(page);
  await save(page);
  await page.reload();
  await expect(page.getByRole('button', { name: '启用 SKILL', exact: true })).toHaveCount(0);
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!),
  );
  expect(data.activityDrafts[0].path).toBe('skill');
  expect(data.activityDrafts[0].settings).toBeUndefined();
  expect(data.tasks).toHaveLength(1);
});

test('旧任务与 SKILL 配置分别保存，离开保护有效且不混入我的 SKILL', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByRole('button', { name: /选择合适的设备租赁方案.*情境题目/ }).click();
  await page.getByRole('button', { name: '返回任务列表' }).click();
  await page.getByRole('button', { name: '保存并继续' }).click();
  await page.goto('/#/space?selection=skill:personal:activity-confirmed:reflect');
  await page.getByRole('button', { name: /测试教师的反思方法/ }).click();
  const beforeExit = page.url();
  await page.getByRole('button', { name: '首页', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page).toHaveURL(beforeExit);
  await page.getByRole('button', { name: '我的 SKILL', exact: true }).click();
  await page.getByRole('button', { name: '保存并继续' }).click();
  await expect(page).toHaveURL(/#\/workshop$/);
  // 主导航已移除教学任务，这里仅复核旧草稿的直接地址兼容。
  await page.goto('/#/space');
  await expect(page.locator('.activity-list-item')).toHaveCount(2);
  await page.getByRole('button', { name: '我的 SKILL', exact: true }).click();
  await expect(page.getByText('SKILL 应用配置', { exact: true })).toHaveCount(0);
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1') || '{}'));
  expect(data.activityDrafts.some((draft: { path: string }) => draft.path === 'skill')).toBe(true);
});

test('任务列表和工作台适配宽屏、平板与手机，底部操作始终可见', async ({ page }) => {
  await seed(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: 'docs/assets/教学活动入口-1440.png', fullPage: true });
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: 'docs/assets/教学活动入口-390.png', fullPage: true });
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  for (const width of [1440, 1024, 768, 390]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const footer = await page.locator('.activity-bottom-bar').boundingBox();
    expect(footer!.y + footer!.height).toBeLessThanOrEqual(901);
    if (width <= 900) {
      await page.getByRole('tab', { name: '实时预览', exact: true }).click();
      await expect(page.locator('.activity-preview-panel')).toBeVisible();
      await expect(page.locator('.activity-configure-panel')).toBeHidden();
      await page.getByRole('tab', { name: '配置任务' }).click();
    }
  }
  await page.screenshot({ path: 'docs/assets/新建学习活动-390.png', fullPage: true });
});

test('保存失败保留未保存表单，不假报成功，也不继续离开页面', async ({ page }) => {
  await seed(page);
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByRole('button', { name: /选择合适的设备租赁方案.*情境题目/ }).click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key: string, value: string) {
      if (key === 'teaching-method.market-workspace.v1' && value.includes('"activityDrafts":[{'))
        throw new DOMException('测试存储配额', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '返回任务列表' }).click();
  await page.getByRole('button', { name: '保存并继续' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('草稿保存失败');
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page.locator('.activity-resource-option[aria-pressed="true"]')).toContainText(
    '选择合适的设备租赁方案',
  );
  await expect(page.locator('.activity-bottom-status')).toContainText('保存失败');
});
