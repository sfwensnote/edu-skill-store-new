import { test, expect, type Page } from '@playwright/test';
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
  const stats = page.locator('.workshop-overview');
  await expect(stats.getByRole('button', { name: '查看我的 SKILL', exact: true })).toContainText('6');
  await expect(stats.getByRole('button', { name: '查看我的情境题目' })).toContainText('1');
  await expect(stats.getByRole('button', { name: '查看我的任务链' })).toContainText('2');
  await expect(stats.getByRole('button', { name: '查看我的 PBL 项目' })).toContainText('1');
  await page.getByLabel('搜索我的作品').fill('反思');
  await page.getByLabel('作品学段').selectOption('高中');
  await page.getByLabel('作品学科').selectOption('英语');
  await page.getByLabel('作品排序').selectOption('name');
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await page.reload();
  await page.getByRole('button', { name: '返回我的作品', exact: true }).click();
  await expect(page.getByLabel('搜索我的作品')).toHaveValue('反思');
  await expect(page.getByLabel('作品学段')).toHaveValue('高中');
  await expect(page.getByLabel('作品学科')).toHaveValue('英语');
  await expect(page.getByLabel('作品排序')).toHaveValue('name');
  await page.reload();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  await stats.getByRole('button', { name: '查看我的任务链' }).click();
  await expect(page).toHaveURL(/tab=chains$/);
  await expect(page.getByRole('heading', { name: '我的任务链', exact: true })).toBeVisible();
  await expect(page.locator('.workshop-item').first()).toHaveAttribute(
    'data-work-id',
    'design:workshop-draft:2',
  );
  await expect(
    page.locator('[data-work-id="design:workshop-draft:2"]').getByRole('button', { name: '布置任务' }),
  ).toHaveCount(0);
  await page.getByLabel('搜索我的作品').fill('活动设备');
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await expect(stats.getByRole('button', { name: '查看我的任务链' })).toContainText('2');
  await page.getByRole('button', { name: '布置任务', exact: true }).click();
  await expect(page.locator('.activity-resource-option[aria-pressed="true"]')).toContainText('任务链');
  await page.getByRole('button', { name: '返回任务列表', exact: true }).click();
  await page.getByRole('button', { name: '放弃修改', exact: true }).click();
  await page.getByRole('button', { name: '返回我的作品', exact: true }).click();
  await expect(page).toHaveURL(/tab=chains$/);
  await expect(page.getByLabel('搜索我的作品')).toHaveValue('活动设备');
});

test('收藏和展示跨分类同步，更多菜单支持键盘关闭及独立复制', async ({ page }) => {
  await seedWorks(page);
  const source = page.locator('[data-work-id="personal:assistant-demo-active:reflect"]');
  const more = source.getByRole('button', { name: /更多操作/ });
  await more.press('Enter');
  await expect(page.getByRole('menu')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('menu')).toHaveCount(0);
  await expect(more).toBeFocused();
  await more.click();
  await page.getByRole('menuitem', { name: '收藏', exact: true }).click();
  await more.click();
  await page.getByRole('menuitem', { name: '分享展示', exact: true }).click();
  await page.getByRole('button', { name: '作品展示', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await expect(page.getByText('展示仅在当前工作区可见')).toBeVisible();
  await page.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '取消展示', exact: true }).click();
  await expect(page.getByRole('heading', { name: '还没有展示的作品' })).toBeVisible();
  await page.getByRole('button', { name: '我的收藏', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '取消收藏', exact: true }).click();
  await expect(page.getByRole('heading', { name: '还没有收藏任何作品' })).toBeVisible();
  await page.getByRole('button', { name: '前往教学 SKILL 集市', exact: true }).click();
  await expect(page).toHaveURL(/#\/market$/);
  await page.goto('/#/workshop?tab=skills');
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

test('PBL 查看进入预览、复制名称可区分，设计删除说明范围且保留任务快照', async ({ page }) => {
  await seedWorks(page);
  await page.getByRole('button', { name: '查看我的 PBL 项目' }).click();
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await expect(page).toHaveURL(/\/3\?view=preview/);
  await page.locator('.back-link').getByText('返回我的作品', { exact: true }).click();
  await page.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '复制', exact: true }).click();
  await expect(page.getByLabel('项目名称', { exact: true })).toHaveValue(/（副本）$/);
  await page.locator('.back-link').getByText('返回我的作品', { exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(2);
  const original = page.locator('[data-work-id="design:workshop-lesson:3"]');
  await original.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: /^删除/ }).click();
  await expect(page.getByRole('dialog')).toContainText('情境题目、任务链和项目也会删除');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(2);
  await original.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: /^删除/ }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  const workspace = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1') || '{}'),
  );
  expect(workspace.designs.some((d: { id: string }) => d.id === 'workshop-lesson')).toBe(false);
  expect(workspace.tasks[0].design.id).toBe('workshop-lesson');
});

test('作品页在桌面、平板和手机无溢出，手机分类及白色菜单可操作', async ({ page }) => {
  await seedWorks(page);
  for (const width of [1440, 1280, 768, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    await page.getByRole('heading', { name: '我的作品', exact: true }).scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({
      path: `docs/assets/我的作品-${width}.png`,
      fullPage: true,
      animations: 'disabled',
    });
  }
  await expect(page.getByRole('combobox', { name: '作品分类', exact: true })).toBeVisible();
  await page.getByRole('combobox', { name: '作品分类', exact: true }).selectOption('chains');
  await expect(page.locator('.workshop-item')).toHaveCount(2);
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
  await page.getByRole('combobox', { name: '作品分类', exact: true }).selectOption('pbl');
  await page.screenshot({ path: 'docs/assets/我的作品-PBL手机.png', fullPage: true, animations: 'disabled' });
});
