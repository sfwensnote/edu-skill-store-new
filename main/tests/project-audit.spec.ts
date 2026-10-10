import { test, expect, type Page } from './demo-workspace-fixture';
import { initialMine } from '../src/data/platform';
import { buildContextualProblem, rentalSampleDesign } from '../shared/contextual-design';
import { assistantSkillEntries } from '../shared/marketplace';
import {
  learningResources,
  learningTaskSnapshot,
  newActivityDraft,
  type LearningActivityDraft,
} from '../shared/teaching-activity';

async function seed(page: Page) {
  const design = rentalSampleDesign('audit-design');
  design.contextualProblem = { ...buildContextualProblem(design), confirmed: true };
  design.savedLevels = [1];
  design.status = 'SAVED';
  const assistant = {
    ...structuredClone(initialMine[0]),
    id: 'audit-teacher',
    revision: 2,
    status: 'TRIAL' as const,
    isPublic: false,
  };
  assistant.skills[0].name = '我的证据追问方法';
  assistant.skills[0].behaviorSteps = ['请学生指出支持结论的证据', '追问证据和观点之间的联系'];
  const entry = assistantSkillEntries([assistant])[0];
  const draft = newActivityDraft('learning', 'audit-activity') as LearningActivityDraft;
  draft.step = 3;
  draft.resourceKey = 'design:audit-design:1';
  draft.settings.title = '我的学习活动';
  draft.settings.instructions = '请记录自己的依据';
  draft.settings.allowRetry = false;
  const task = learningTaskSnapshot(draft, learningResources([design])[0], undefined);
  await page.addInitScript(
    ({ design, assistant, draft, task }) => {
      if (!localStorage.getItem('teaching-method.market-workspace.v1'))
        localStorage.setItem(
          'teaching-method.market-workspace.v1',
          JSON.stringify({
            version: 1,
            designs: [design],
            tasks: [task],
            activityDrafts: [draft],
            favorites: [],
            sharedSkillIds: [],
          }),
        );
      if (!JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]').some((item: { id: string }) => item.id === assistant.id))
        localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([assistant]));
    },
    { design, assistant, draft, task },
  );
  return { assistant, entry };
}

test('学生提交保存失败不显示成功，重试成功后才锁定一次提交', async ({ page }) => {
  await seed(page);
  await page.goto('/#/task/audit-activity');
  await page.getByLabel('我的回答', { exact: true }).fill('我的依据仍保留在当前页面');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, 'restoreAuditStorage', {
      configurable: true,
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function (key, value) {
      if (
        key === 'teaching-method.market-workspace.v1' &&
        JSON.parse(value).tasks.some((task: { submissions: unknown[] }) => task.submissions.length)
      )
        throw new DOMException('full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page.getByRole('button', { name: '提交学习记录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '学习记录已提交' })).toHaveCount(0);
  await expect(page.getByLabel('我的回答', { exact: true })).toHaveValue('我的依据仍保留在当前页面');
  await expect(page.locator('.student-task').getByRole('status')).toContainText('保存失败');
  expect(
    await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!).tasks[0].submissions.length,
    ),
  ).toBe(0);
  await page.evaluate(() => (window as unknown as { restoreAuditStorage: () => void }).restoreAuditStorage());
  await page.getByRole('button', { name: '提交学习记录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '学习记录已提交' })).toBeVisible();
  await page.getByRole('button', { name: '继续查看我的回答' }).click();
  await expect(page.getByLabel('我的回答', { exact: true })).toBeDisabled();
});

test('从学习活动查看方法再应用，建立独立 SKILL 配置，不恢复错误的学习草稿', async ({ page }) => {
  await seed(page);
  await page.goto('/#/space?draft=audit-activity');
  await page
    .locator('.activity-resource-list')
    .getByRole('button', { name: '查看方法', exact: true })
    .first()
    .click();
  await expect(page.getByRole('button', { name: '教学任务', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '继续配置', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '更多方法操作', exact: true }).click();
  await page.getByRole('menuitem', { name: '应用 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: '选择教学 SKILL', exact: true }).first()).toBeVisible();
  expect(await page.evaluate(() => new URLSearchParams(location.hash.split('?')[1]).has('draft'))).toBe(
    false,
  );
  await page
    .locator('.activity-workbench-heading')
    .getByRole('button', { name: '保存草稿', exact: true })
    .click();
  const drafts = await page.evaluate(
    () => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!).activityDrafts,
  );
  expect(drafts.find((draft: { id: string }) => draft.id === 'audit-activity').path).toBe('learning');
  expect(drafts[0].path).toBe('skill');
});

test('报告沿用当前方法并移除虚构统计，分享不会激活助手且展示所有方法', async ({ page }) => {
  const { assistant } = await seed(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/#/assistant/audit-teacher/logs');
  await expect(page.getByRole('heading', { name: '教学方法', exact: true })).toBeVisible();
  await expect(page.getByText('128 次', { exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: /我的证据追问方法.*查看方法步骤/ }).click();
  await expect(page.getByText('请学生指出支持结论的证据', { exact: true })).toBeVisible();
  await expect(page.getByText(/x = 9/)).toHaveCount(0);
  await page.getByRole('button', { name: '返回教学预览' }).click();
  await page.getByRole('button', { name: '查看核对摘要' }).first().click();
  await expect(page.getByRole('heading', { name: '我的证据追问方法' })).toBeVisible();
  await expect(page.getByText(/236 次|2026\/09\/03|41%/)).toHaveCount(0);
  await page.screenshot({ path: 'docs/assets/项目审查-方法报告.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/assets/项目审查-方法报告手机.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.getByRole('button', { name: '分享到集市', exact: true }).click();
  await expect(page).toHaveURL(/#\/market$/);
  await expect(page.locator('.market-resource-card').filter({ hasText: '我的证据追问方法' })).toHaveCount(1);
  const saved = await page.evaluate(
    () => JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2')!)[0],
  );
  expect(saved.status).toBe('TRIAL');
  expect(saved.isPublic).toBe(false);
  expect(errors).toEqual([]);
});

test('删除方法递增版本并撤销旧核对，不把旧助手标为仍可使用', async ({ page }) => {
  await seed(page);
  await page.addInitScript(() =>
    localStorage.setItem(
      'teaching-assistant.check-progress:audit-teacher',
      JSON.stringify({ completed: 20 }),
    ),
  );
  await page.goto('/#/workshop?tab=skills');
  const method = page.locator('.workshop-item').filter({ hasText: '我的证据追问方法' });
  await method.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: /^删除/ }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  const state = await page.evaluate(() => ({
    assistant: JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2')!)[0],
    progress: localStorage.getItem('teaching-assistant.check-progress:audit-teacher'),
  }));
  expect(state.assistant.status).toBe('DRAFT');
  expect(state.assistant.revision).toBe(3);
  expect(state.assistant.skills).toHaveLength(2);
  expect(state.progress).toBeNull();
});

test('草稿和学生预览内容同时保存，预览快照写入失败时保留未保存状态', async ({ page }) => {
  await seed(page);
  await page.goto('/#/space');
  await page.getByRole('button', { name: '新建任务', exact: true }).click();
  await page.getByRole('button', { name: /选择合适的设备租赁方案.*情境题目/ }).click();
  const next = page.locator('.activity-bottom-actions').getByRole('button', { name: '下一步', exact: true });
  await next.click();
  await page.getByLabel('任务名称', { exact: true }).fill('需要原子保存的活动');
  await page.getByLabel('任务说明', { exact: true }).fill('完整记录学习过程');
  await next.click();
  await next.click();
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (
        key === 'teaching-method.market-workspace.v1' &&
        JSON.parse(value).tasks.some((task: { title: string }) => task.title === '需要原子保存的活动')
      )
        throw new DOMException('full', 'QuotaExceededError');
      original.call(this, key, value);
    };
  });
  await page
    .locator('.activity-bottom-actions')
    .getByRole('button', { name: '保存草稿', exact: true })
    .click();
  await expect(page.locator('.activity-workbench').getByRole('status')).toContainText('保存失败');
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!),
  );
  expect(saved.activityDrafts).toHaveLength(1);
  expect(saved.tasks).toHaveLength(1);
  await page.getByRole('button', { name: '教学 SKILL 集市', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('未保存');
});

test('预置方法从待核对开始，教师完成确认后才保留核对状态', async ({ page }) => {
  await page.goto('/#/assistant/assistant-demo-active/report');
  await expect(page.getByRole('heading', { name: '方法内容待核对' })).toBeVisible();
  await page.goto('/#/assistant/assistant-demo-active/test');
  await expect(page.getByRole('button', { name: /确认并(继续|完成)/ })).toBeVisible();
  while (await page.getByRole('button', { name: /确认并(继续|完成)/ }).count())
    await page.getByRole('button', { name: /确认并(继续|完成)/ }).click();
  await expect(page.getByRole('heading', { name: '教学方法核对完成' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '教学方法核对完成' })).toBeVisible();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2')!).find(
      (item: { id: string }) => item.id === 'assistant-demo-active',
    ),
  );
  expect(saved.status).toBe('TESTED');
  expect(saved.revision).toBe(1);
});

test('损坏的本机可选记录不会让健康作品和方法编辑页崩溃', async ({ page }) => {
  await seed(page);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    const market = JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!);
    market.designs.push({ id: 'broken', savedLevels: [1], readiness: [] });
    market.tasks.push({ id: 'broken', submissions: [] });
    localStorage.setItem('teaching-method.market-workspace.v1', JSON.stringify(market));
    const assistants = JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2')!);
    assistants.push({ id: 'broken', skills: [{}] });
    localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify(assistants));
    localStorage.setItem(
      'teaching-assistant.method-draft.v1:audit-teacher:reflect',
      JSON.stringify({
        stage: 'method',
        originalIdea: '旧输入',
        method: { teachingSteps: [], principles: [] },
      }),
    );
  });
  await page.goto('/#/space');
  await expect(page.getByRole('heading', { name: '教学任务', exact: true })).toBeVisible();
  await page.goto('/#/create/audit-teacher?skill=reflect');
  await expect(page.getByRole('button', { name: '编辑SKILL 名称' })).toContainText('我的证据追问方法');
  expect(errors).toEqual([]);
});

test('未完成的活动修改撤销旧学生预览，不能把旧快照当成最新配置', async ({ page }) => {
  await seed(page);
  await page.goto('/#/space?draft=audit-activity');
  await page.getByRole('button', { name: '上一步', exact: true }).click();
  await page.getByLabel('任务说明', { exact: true }).fill('');
  await page
    .locator('.activity-workbench-heading')
    .getByRole('button', { name: '保存草稿', exact: true })
    .click();
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!),
  );
  expect(saved.activityDrafts[0].settings.instructions).toBe('');
  expect(saved.tasks.find((task: { id: string }) => task.id === 'audit-activity')).toBeUndefined();
  await page.getByRole('button', { name: '返回任务列表', exact: true }).click();
  await expect(page.getByRole('button', { name: '打开学生预览', exact: true })).toHaveCount(0);
});
