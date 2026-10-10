import { test, expect } from '@playwright/test';
import { finishLearningActivity } from './activity-helpers';
import { initialMine } from '../src/data/platform';
import { rentalSampleDesign, buildContextualProblem, createTaskChain } from '../shared/contextual-design';

async function prepareProblem(page: import('@playwright/test').Page) {
  await page.goto('/#/inquiry');
  await page.getByRole('button', { name: '填入数学租赁示例' }).click();
  await page.getByRole('button', { name: '开始设计', exact: true }).click();
  await page.getByLabel('情境标题', { exact: true }).fill('我的校园租赁题');
  await page.getByLabel('我已核对数据、知识要求、单位、范围和可解性').check();
  await page.getByRole('button', { name: '保存情境题目', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存情境题目');
  return new URL(page.url()).hash.split('/')[2];
}

test('首页入口、SKILL 体验收藏复用与保留旧数据，编辑单项不覆盖其他能力', async ({ page }) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) api.push(r.url());
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: '教学工坊', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '浏览集市' }).click();
  await page.getByRole('button', { name: '错误后反思引导', exact: true }).click();
  await page.getByLabel('学生的回应').fill('我算错了，不知道检查哪里');
  await page.getByRole('button', { name: '查看引导示例' }).click();
  await expect(page.getByText(/【引导示例】若符合/)).toBeVisible();
  await page.getByRole('button', { name: '收藏', exact: true }).click();
  await page.getByRole('button', { name: '复用到我的 SKILL' }).click();
  await expect(page.getByRole('button', { name: '编辑SKILL 名称' })).toContainText('错误后反思引导');
  await page.getByRole('button', { name: '编辑SKILL 名称' }).click();
  await page.getByRole('textbox', { name: 'SKILL 名称', exact: true }).fill('我复用的方法');
  await page.getByRole('button', { name: '这就是我的教学方法' }).click();
    while (await page.getByRole('button', { name: /确认并(继续|完成)/ }).count())
    await page.getByRole('button', { name: /确认并(继续|完成)/ }).click();
  await expect(page.getByRole('heading', { name: '教学方法核对完成' })).toBeVisible();
  await page.getByRole('button', { name: '进入我的 SKILL' }).click();
  await expect(page.getByRole('button', { name: '我复用的方法', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '我的助手', exact: true }).click();
  await expect(page.getByText('七年级数学教学助手', { exact: true })).toBeVisible();
  await page.goto('/#/create/assistant-demo-active?skill=reflect');
  await page.getByRole('button', { name: '编辑SKILL 名称' }).click();
  await page.getByRole('textbox', { name: 'SKILL 名称', exact: true }).fill('编辑原有第一项');
  await page.getByRole('button', { name: '这就是我的教学方法' }).click();
  const old = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]').find(
      (a: { id: string }) => a.id === 'assistant-demo-active',
    ),
  );
  expect(old.skills).toHaveLength(3);
  expect(old.skills[1].name).toBe(initialMine[0].skills[1].name);
  expect(api).toEqual([]);
});

test('情境题目、任务链、PBL 保存恢复、复制、导出，学生按阶段提交本机任务', async ({ page }) => {
  const api: string[] = [];
  page.on('request', (r) => {
    if (r.url().includes('/api/')) api.push(r.url());
  });
  const designId = await prepareProblem(page);
  await page.reload();
  await expect(page.getByLabel('情境标题', { exact: true })).toHaveValue('我的校园租赁题');
  await expect(page.getByLabel('参考要点（教师用，可选）')).toHaveValue(/x = 5/);
  await page.getByRole('button', { name: '任务链', exact: true }).click();
  await page.getByLabel('任务标题 1', { exact: true }).fill('我修改的信息提取任务');
  await page.getByRole('button', { name: '下移任务 1' }).click();
  await expect(page.getByLabel('任务标题 2', { exact: true })).toHaveValue('我修改的信息提取任务');
  await page.getByRole('button', { name: '添加任务', exact: true }).click();
  await expect(page.getByLabel('任务标题 5', { exact: true })).toHaveValue('新任务');
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '删除任务 5' }).click();
  await expect(page.getByLabel('任务标题 5', { exact: true })).toHaveCount(0);
  await page.getByLabel('我已核对任务的递进关系、原题条件和学习产出').check();
  await page.getByRole('button', { name: '保存任务链', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('任务标题 2', { exact: true })).toHaveValue('我修改的信息提取任务');
  await page.getByRole('button', { name: 'PBL 项目', exact: true }).click();
  await expect(page.getByText(/实施条件未全部确认/)).toBeVisible();
  await page.getByRole('button', { name: '开始填写项目草案' }).click();
  await page.getByLabel('项目名称', { exact: true }).fill('我的 PBL 方案');
  for (const field of [
    '存在值得持续探究的实际问题',
    '需要多阶段调查或实践',
    '学生有自主决策空间',
    '有明确的项目成果',
    '时间、资源和安全条件允许实施',
  ])
    await page.getByLabel(field, { exact: true }).check();
  await page.getByLabel('我已核对项目目标、活动安排、成果与评价').check();
  await page.getByRole('button', { name: '保存PBL 项目', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已保存PBL 项目');
  await page.goto('/#/workshop?tab=pbl');
  await expect(page.getByRole('heading', { name: '我的 PBL 方案', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '更多操作：我的 PBL 方案', exact: true }).click();
  await page.getByRole('menuitem', { name: '分享展示', exact: true }).click();
  await page.goto('/#/market');
  await expect(page.getByRole('heading', { name: '我的 PBL 方案', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: '我的 SKILL', exact: true }).click();
  await page.getByRole('button', { name: '作品展示', exact: true }).click();
  await expect(page.getByRole('heading', { name: '我的 PBL 方案', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '查看作品', exact: true }).click();
  await page.getByRole('button', { name: '返回编辑', exact: true }).click();
  await expect(page.getByLabel('项目名称', { exact: true })).toHaveValue('我的 PBL 方案');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: '导出方案' }).click();
  expect((await downloadPromise).suggestedFilename()).toContain('.md');
  await page.getByRole('button', { name: '创建副本' }).click();
  expect(new URL(page.url()).hash.split('/')[2]).not.toBe(designId);
  await page.getByLabel('项目名称', { exact: true }).fill('独立副本项目');
  await page.goto(`/#/inquiry/${designId}/3`);
  await expect(page.getByLabel('项目名称', { exact: true })).toHaveValue('我的 PBL 方案');
  await page.goto(`/#/space?selection=${encodeURIComponent(`design:${designId}:3`)}`);
  await finishLearningActivity(page, { feedback: '请检查证据是否支持建议。' });
  await page.getByRole('button', { name: '打开学生预览' }).click();
  await expect(page.getByText(/学生视角预览/)).toBeVisible();
  for (let i = 0; i < 5; i++) {
    await page.getByLabel('阶段学习记录', { exact: true }).fill(`阶段 ${i + 1} 的证据与进展`);
    if (i < 4) await page.getByRole('button', { name: '记录完成，下一步' }).click();
  }
  await page.getByRole('button', { name: '提交学习记录', exact: true }).click();
  await expect(page.getByText('【教师预设提示】请检查证据是否支持建议。')).toBeVisible();
  await page.getByRole('button', { name: '返回教学任务' }).click();
  await page.getByRole('button', { name: '返回任务列表' }).click();
  await expect(page.getByText(/1 次提交/)).toBeVisible();
  expect(api).toEqual([]);
});

test('上游修改不覆盖任务，自定义题目不套用默认数学答案', async ({ page }) => {
  await prepareProblem(page);
  await page.getByRole('button', { name: '任务链', exact: true }).click();
  await page.getByLabel('任务要求 1', { exact: true }).fill('教师保留的独立要求');
  await page.getByRole('button', { name: '情境题目', exact: true }).click();
  await page.locator('.brief-summary > summary').click();
  await page.getByLabel('教学内容', { exact: true }).fill('质量为 2kg，速度为 3m/s，求动能。');
  await page.getByLabel('学科', { exact: true }).fill('物理');
  await page.getByRole('button', { name: '任务链', exact: true }).click();
  await expect(page.getByLabel('任务要求 1', { exact: true })).toHaveValue('教师保留的独立要求');
  await expect(page.getByText(/任务链待核对/)).toBeVisible();
  await page.getByRole('button', { name: '情境题目', exact: true }).click();
  page.once('dialog', (d) => d.accept());
  await page.getByRole('button', { name: '重新整理题目' }).click();
  await expect(page.getByLabel('学生问题', { exact: true })).toHaveValue('质量为 2kg，速度为 3m/s，求动能。');
  await expect(page.getByLabel('参考要点（教师用，可选）')).toHaveValue('');
});

test('工坊复制、收藏、分享、助手配置和确认删除可交互', async ({ page }) => {
  await page.goto('/#/workshop');
  const first = page.locator('[data-work-id="personal:assistant-demo-active:reflect"]');
  await first.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '分享展示', exact: true }).click();
  await first.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '收藏', exact: true }).click();
  await first.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '加入助手配置' }).click();
  await expect(page.getByRole('dialog')).toContainText('不自动启用');
  await page.getByRole('button', { name: '确认加入' }).click();
  await expect(page.getByRole('status')).toContainText('已加入助手配置');
  const stored = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]'),
  );
  expect(stored.find((a: { id: string }) => a.id === 'assistant-demo-draft').skills).toHaveLength(4);
  await first.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '删除错误后反思引导', exact: true }).click();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(first.getByRole('button', { name: '错误后反思引导', exact: true })).toBeVisible();
  await first.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '删除错误后反思引导', exact: true }).click();
  await page.getByRole('button', { name: '确认删除' }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  await page.goto('/#/market');
  await expect(page.getByRole('heading', { name: '教学 SKILL 集市', exact: true })).toBeVisible();
});

test('390px 手机布局支持入口、三个编辑层级与使用空间，无横向溢出', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const path of [
    '/#/home',
    '/#/inquiry',
    '/#/market',
    '/#/workshop',
    '/#/inquiry/mobile-inquiry/1',
    '/#/space',
  ]) {
    await page.goto(path);
    await expect(page.locator('main')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await prepareProblem(page);
  await page.getByRole('button', { name: '任务链', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'PBL 项目', exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({
    path: 'test-results/marketplace-mobile.png',
    fullPage: true,
  });
});

test('情境题与任务链学生预览可填写、刷新恢复、逐项完成并提交', async ({ page }) => {
  const design = rentalSampleDesign('student-modes');
  design.contextualProblem = {
    ...buildContextualProblem(design),
    confirmed: true,
  };
  design.taskChain = { ...createTaskChain(design), needsReview: false };
  design.savedLevels = [1, 2];
  design.status = 'SAVED';
  await page.goto('/#/home');
  await page.evaluate(
    (d) =>
      localStorage.setItem(
        'teaching-method.market-workspace.v1',
        JSON.stringify({
          version: 1,
          designs: [d],
          favorites: [],
          sharedSkillIds: [],
          tasks: [],
        }),
      ),
    design,
  );
  for (const level of [1, 2]) {
    await page.goto(`/#/space?selection=${encodeURIComponent(`design:student-modes:${level}`)}`);
    await page.reload();
    await finishLearningActivity(page);
    await page.getByRole('button', { name: '打开学生预览', exact: true }).click();
    const steps = level === 1 ? 1 : 4;
    for (let i = 0; i < steps; i++) {
      await page.getByLabel('我的回答', { exact: true }).fill(`我记录的第 ${i + 1} 步过程`);
      if (i === 0) {
        await page.reload();
        await expect(page.getByLabel('我的回答', { exact: true })).toHaveValue('我记录的第 1 步过程');
      }
      if (i < steps - 1) await page.getByRole('button', { name: '记录完成，下一步' }).click();
    }
    await page.getByRole('button', { name: '提交学习记录', exact: true }).click();
    await expect(page.getByRole('heading', { name: '学习记录已提交' })).toBeVisible();
  }
  await page.getByRole('button', { name: '返回教学任务' }).click();
  await page.getByRole('button', { name: '返回任务列表' }).click();
  await expect(page.getByText(/1 次提交/)).toHaveCount(2);
});
