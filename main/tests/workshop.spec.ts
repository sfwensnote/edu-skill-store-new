import { test, expect, type Page } from './workspace-fixture';
import { initialMine } from '../src/data/platform';
import {
  rentalSampleDesign,
  buildContextualProblem,
  createTaskChain,
  createPblProject,
} from '../shared/contextual-design';

async function seedWorks(page: Page) {
  const ready = rentalSampleDesign('workshop-lesson');
  ready.contextualProblem = { ...buildContextualProblem(ready), confirmed: true };
  ready.taskChain = { ...createTaskChain(ready), needsReview: false };
  ready.pblProject = { ...createPblProject(ready), needsReview: false };
  ready.readiness = ready.readiness.map(() => true);
  ready.savedLevels = [1, 2, 3];
  ready.currentLevel = 1;
  ready.status = 'SAVED';
  ready.createdAt = '2026-10-01T08:00:00Z';
  ready.updatedAt = '2026-10-07T08:00:00Z';
  const draft = rentalSampleDesign('workshop-draft');
  draft.title = '尚未核对的任务链';
  draft.currentLevel = 2;
  draft.taskChain = createTaskChain(draft);
  draft.updatedAt = '2026-10-09T08:00:00Z';
  const assistants = structuredClone(initialMine);
  assistants[0].revision = 2;
  assistants[0].status = 'TESTED';
  assistants[1].subject = '英语';
  assistants[1].grade = '高中';
  await page.addInitScript(
    ({ ready, draft, assistants }) => {
      if (!localStorage.getItem('teaching-assistant.frontend-demo.v2'))
        localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify(assistants));
      if (!localStorage.getItem('teaching-method.market-workspace.v1'))
        localStorage.setItem(
          'teaching-method.market-workspace.v1',
          JSON.stringify({
            version: 1,
            designs: [ready, draft],
            favorites: [],
            sharedSkillIds: [],
            tasks: [
              {
                id: 'preserved-task',
                title: '租赁比较任务',
                kind: 'design',
                level: 2,
                design: ready,
                instructions: '记录比较依据。',
                feedback: '',
                submissions: [],
                createdAt: ready.createdAt,
              },
            ],
          }),
        );
    },
    { ready, draft, assistants },
  );
  await page.goto('/#/workshop?tab=skills');
}

test('数量来自实际作品，组合筛选在详情返回和刷新后保留，草稿不冒充可用任务', async ({ page }) => {
  await seedWorks(page);
  await expect(page.getByRole('region', { name: 'SKILL 概览' })).toHaveCount(0);
  await expect(page.getByRole('navigation', { name: 'SKILL 分类', exact: true }).getByRole('button', { name: '全部', exact: true })).toContainText('6');
  await page.getByLabel('搜索我的 SKILL').fill('反思');
  await page.getByLabel('作品学段').selectOption('高中');
  await page.getByLabel('作品学科').selectOption('英语');
  await page.getByLabel('作品排序').selectOption('name');
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '返回我的 SKILL', exact: true }).click();
  await expect(page.getByLabel('搜索我的 SKILL')).toHaveValue('反思');
  await expect(page.getByLabel('作品学段')).toHaveValue('高中');
  await expect(page.getByLabel('作品学科')).toHaveValue('英语');
  await expect(page.getByLabel('作品排序')).toHaveValue('name');
  await page.reload();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  await expect(page.locator('[data-kind="pbl"], [data-kind="chains"], [data-kind="problems"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '设计情境作品' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '试用 SKILL', exact: true })).toHaveCount(0);
  await page.locator('[data-work-id="personal:assistant-demo-active:reflect"]').getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.getByRole('region', { name: '试用 SKILL', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '返回我的 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: '我的 SKILL', exact: true })).toBeVisible();
});

test('创建分类的发布管理和收藏保留，更多菜单支持键盘关闭及独立复制', async ({ page }) => {
  await seedWorks(page);
  const source = page.locator('[data-work-id="personal:assistant-demo-active:reflect"]');
  const more = source.getByRole('button', { name: /更多操作/ });
  await more.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(more).toBeFocused();
  await more.click();
  await page.getByRole('menuitem', { name: '收藏', exact: true }).click();
  await source.getByRole('button', { name: '发布到集市', exact: true }).click();
  await page.getByRole('button', { name: '确认发布', exact: true }).click();
  await page.getByRole('button', { name: '我的 SKILL', exact: true }).click();
  await page.getByRole('button', { name: '我创建的', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  await expect(source).toContainText('已发布');
  await more.click();
  await expect(page.getByRole('menuitem', { name: '取消收藏', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await source.getByRole('button', { name: '管理发布', exact: true }).click();
  await page.getByRole('button', { name: '从集市撤下', exact: true }).click();
  await expect(source).not.toContainText('已发布');
  await more.click();
  await page.getByRole('menuitem', { name: '复制', exact: true }).click();
  await expect(page).toHaveURL(/#\/create\//);
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]'),
  );
  expect(stored).toHaveLength(3);
  expect(stored.find((a: { id: string }) => a.id === 'assistant-demo-active').skills).toHaveLength(3);
  expect(stored[0].skills[0].id).not.toBe('reflect');
});

test('旧 PBL 分类退回 SKILL，旧任务清空，项目与收藏不进入个人方法列表', async ({ page }) => {
  await seedWorks(page);
  await page.evaluate(() => {
    const key = 'teaching-method.market-workspace.v1';
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    data.favorites = ['design:workshop-lesson:3'];
    data.sharedSkillIds = ['design:workshop-lesson:3'];
    localStorage.setItem(key, JSON.stringify(data));
  });
  await page.goto('/#/workshop?tab=pbl');
  await expect(page.getByRole('heading', { name: '我的 SKILL', exact: true })).toBeVisible();
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  await expect(page.locator('main')).not.toContainText(/PBL|我的情境题目|我的任务链|我的助手|应用配置|历史方法试用/);
  await page.getByRole('button', { name: '从集市添加', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(0);
  await page.getByRole('button', { name: '我创建的', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  const workspace = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1') || '{}'));
  expect(workspace.designs).toHaveLength(2);
  expect(workspace.tasks).toEqual([]);
  expect(workspace.favorites).toEqual(['design:workshop-lesson:3']);
});

test('作品页在桌面、平板和手机无溢出，手机分类及白色菜单可操作', async ({ page }) => {
  await seedWorks(page);
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.getByRole('heading', { name: '我的 SKILL', exact: true }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({
      path: `docs/assets/我的作品-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await expect(page.getByRole('combobox', { name: 'SKILL 分类', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: 'SKILL 分类', exact: true }).selectOption('skills');
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  await page
    .locator('.workshop-item')
    .first()
    .getByRole('button', { name: /更多操作/ })
    .click();
  const menu = page.getByRole('menu');
  await expect(menu).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  const box = await menu.boundingBox();
  expect(box && box.x >= 0 && box.x + box.width <= 390).toBe(true);
  await page.keyboard.press('Escape');
  await page.getByRole('combobox', { name: 'SKILL 分类', exact: true }).selectOption('added');
  await page.screenshot({ path: 'docs/assets/我的SKILL集市添加手机.png', fullPage: true, animations: 'disabled' });
});
