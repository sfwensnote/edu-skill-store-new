import { test, expect } from '@playwright/test';
import {
  rentalSampleDesign,
  buildContextualProblem,
  createTaskChain,
  createPblProject,
} from '../shared/contextual-design';
import {
  defaultCreationDraft,
  demoIdea,
  prepareMethod,
  recordAnswer,
  mockQuestions,
  type CreationDraft,
} from '../shared/teaching-method';
import { initialMine } from '../src/data/platform';

test('工作区可预览、折叠并恢复手动修改与结束条件，形成 SKILL 前仍需完成梳理', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/create/workbench-review');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect(page.getByRole('button', { name: '形成 SKILL', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '编辑希望学生达到' }).click();
  await page.getByRole('textbox', { name: '希望学生达到', exact: true }).fill('教师手动确认的学习目标');
  await page.getByRole('button', { name: '编辑结束条件', exact: true }).click();
  await page.getByRole('textbox', { name: '结束条件', exact: true }).fill('两次提示后仍停滞时，转交教师。');
  await page.getByRole('button', { name: '提交', exact: true }).click();
  await expect(page.getByRole('button', { name: '编辑希望学生达到' })).toContainText(
    '教师手动确认的学习目标',
  );
  const group = page.getByRole('button', { name: '1 基础概况', exact: true });
  await group.click();
  await expect(page.getByRole('button', { name: '编辑SKILL 名称' })).toBeHidden();
  await group.click();
  await page.getByRole('button', { name: '预览 SKILL', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('教师手动确认的学习目标');
  await expect(page.getByRole('dialog')).toContainText('两次提示后仍停滞时，转交教师。');
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toBeHidden();
  await page.reload();
  await expect(page.getByRole('button', { name: '编辑结束条件' })).toContainText(
    '两次提示后仍停滞时，转交教师。',
  );
  for (let index = 1; index < 6; index++)
    await page.getByRole('button', { name: '提交', exact: true }).click();
  await expect(page.getByRole('button', { name: '形成 SKILL', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page.locator('.creation-preview')).toContainText('结束条件：两次提示后仍停滞时，转交教师。');
});

test('主要页面在四种屏宽无横向溢出，工作区操作与学习内容可见', async ({ page }) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const design = rentalSampleDesign('ui-inquiry');
  design.contextualProblem = { ...buildContextualProblem(design), confirmed: true };
  design.taskChain = { ...createTaskChain(design), needsReview: false };
  design.pblProject = { ...createPblProject(design), needsReview: false };
  design.readiness = design.readiness.map(() => true);
  design.savedLevels = [1, 2, 3];
  let draft: CreationDraft = { ...defaultCreationDraft(), originalIdea: demoIdea, stage: 'method' };
  draft.method = {
    ...prepareMethod(demoIdea, draft.method),
    name: '错题反思引导',
    description: '帮助学生回顾思路，发现问题并尝试自主修正。',
  };
  for (const question of mockQuestions.slice(0, 4)) draft = recordAnswer(draft, question.example);
  await page.addInitScript(
    ({ design, draft, assistants }) => {
      localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify(assistants));
      localStorage.setItem(
        'teaching-assistant.method-draft.v1:assistant-demo-active:reflect',
        JSON.stringify(draft),
      );
      localStorage.setItem(
        'teaching-method.market-workspace.v1',
        JSON.stringify({
          version: 1,
          designs: [design],
          favorites: [],
          sharedSkillIds: [],
          tasks: [
            {
              id: 'ui-task',
              title: '活动设备租赁学习',
              kind: 'design',
              level: 2,
              design,
              instructions: '记录比较过程，并说明你的选择。',
              feedback: '请检查证据。',
              submissions: [],
              createdAt: design.createdAt,
            },
          ],
        }),
      );
    },
    { design, draft, assistants: initialMine },
  );
  const routes = [
    ['home', '首页'],
    ['daily', '日常教学'],
    ['inquiry', '探究入口'],
    ['create/assistant-demo-active?skill=reflect', '教学方法工作区'],
    ['inquiry/ui-inquiry/1', '情境题目工作区'],
    ['inquiry/ui-inquiry/2', '任务链工作区'],
    ['inquiry/ui-inquiry/3', 'PBL项目工作区'],
    ['market', 'SKILL集市'],
    ['skill/sample-reflect', 'SKILL详情'],
    ['workshop', '我的作品'],
    ['assistant/assistant-demo-active/test', '检测与试用'],
    ['space', '教学任务'],
    ['task/ui-task', '学生学习预览'],
    ['assistant/assistant-demo-active/student-preview?from=report', '学生对话预览'],
    ['library', '教学助手库'],
    ['assistant/assistant-demo-active/logs', '试用记录'],
    ['assistant/assistant-demo-active/report', '试用报告'],
  ];
  for (const width of [390, 768, 1280, 1440]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    for (const [route, name] of routes) {
      await page.goto(`/#/${route}`);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('heading', { name: '没有找到这项内容', exact: true })).toBeHidden();
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        `${name} ${width}px`,
      ).toBe(true);
      if (route === 'market' && width >= 1280) {
        const row = await page.locator('.skill-card').first().boundingBox();
        expect(row && row.height < 230, '资源列表保持紧凑横向排列').toBe(true);
        await expect(page.getByLabel('搜索 SKILL')).toHaveCSS('border-top-width', '0px');
      }
      if (width === 1440 || (width === 390 && name === '教学方法工作区')) {
        await page.screenshot({
          path: `docs/assets/统一重构-${name}-${width}.png`,
          fullPage: true,
          animations: 'disabled',
        });
      }
      if (route.startsWith('create/') && width >= 1280) {
        const footer = await page.locator('.method-outline .sticky-actions').boundingBox();
        expect(footer && footer.y + footer.height <= 1000, '底部操作区可见').toBe(true);
      }
      if (route.startsWith('create/') && width === 390) {
        await expect(page.locator('.method-outline .sticky-actions')).toHaveCSS('position', 'static');
      }
    }
  }
  expect(errors).toEqual([]);
});
