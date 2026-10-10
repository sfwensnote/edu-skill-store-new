import { expect, test, type Page } from './demo-workspace-fixture';
import { initialMine } from '../src/data/platform';
import { buildContextualProblem, rentalSampleDesign } from '../shared/contextual-design';
import { defaultCreationDraft, mockQuestions, prepareMethod, recordAnswer } from '../shared/teaching-method';

async function blockStorage(page: Page, key: string) {
  await page.evaluate((blockedKey) => {
    const original = Storage.prototype.setItem;
    Object.defineProperty(window, 'restoreFunctionalStorage', {
      configurable: true,
      value: () => {
        Storage.prototype.setItem = original;
      },
    });
    Storage.prototype.setItem = function (key, value) {
      if (key === blockedKey) throw new DOMException('full', 'QuotaExceededError');
      return original.call(this, key, value);
    };
  }, key);
}

async function restoreStorage(page: Page) {
  await page.evaluate(() =>
    (window as unknown as { restoreFunctionalStorage: () => void }).restoreFunctionalStorage(),
  );
}

async function seedMethod(page: Page, id: string, count = 2) {
  let draft = defaultCreationDraft();
  draft.method = prepareMethod(draft.originalIdea, draft.method);
  for (const item of mockQuestions) draft = recordAnswer(draft, item.example);
  draft.stage = 'method';
  draft.method.teachingSteps = Array.from({ length: count }, (_, index) => ({
    condition: `情况 ${index + 1}`,
    action: `做法 ${index + 1}`,
  }));
  await page.addInitScript(
    ({ id, draft }) => {
      const key = `teaching-assistant.method-draft.v1:${id}`;
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify(draft));
    },
    { id, draft },
  );
  await page.goto(`/#/create/${id}`);
}

test('未提交的教师回答刷新和保存退出后仍能继续，不提前写入方法', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/#/create/functional-answer');
  await page.getByLabel('教学想法').fill('学生阅读时没有依据，我希望先追问原文证据。');
  await page.getByRole('combobox', { name: '学科', exact: true }).selectOption('语文');
  await page.getByLabel('教学分类', { exact: true }).selectOption('课堂提问');
  await page.getByLabel('自定义标签').fill('课文阅读');
  await page.getByLabel('自定义标签').press('Enter');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.getByLabel('你的回答', { exact: true }).fill('让学生从原文找到支持观点的证据。');
  await page.reload();
  await expect(page.getByLabel('你的回答', { exact: true })).toHaveValue('让学生从原文找到支持观点的证据。');
  await expect(page.getByRole('button', { name: '编辑希望学生达到' })).toContainText('待补充');
  await page.screenshot({ path: 'docs/assets/功能审查-方法草稿.png', fullPage: true });
  await page.getByRole('button', { name: '保存并退出', exact: true }).click();
  await expect(page).toHaveURL(/#\/workshop\?tab=skills$/);
  await page
    .locator('[data-work-id="method-draft:functional-answer"]')
    .getByRole('button', { name: '继续梳理', exact: true })
    .click();
  await expect(page.getByLabel('你的回答', { exact: true })).toHaveValue('让学生从原文找到支持观点的证据。');
  await page.getByRole('button', { name: '提交', exact: true }).click();
  await expect(page.getByRole('button', { name: '编辑希望学生达到' })).toContainText(
    '让学生从原文找到支持观点的证据。',
  );
  await expect(page.getByLabel('你的回答', { exact: true })).toHaveValue('');
});

test('中途核对进度保存失败保留当前项，恢复后可继续', async ({ page }) => {
  await page.goto('/#/assistant/assistant-demo-active/test');
  const title = await page.locator('.test-case-head h2').textContent();
  await blockStorage(page, 'teaching-assistant.check-progress:assistant-demo-active');
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('核对进度未保存');
  await expect(page.locator('.test-case-head h2')).toHaveText(title!);
  await restoreStorage(page);
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await expect(page.locator('.test-case-head h2')).not.toHaveText(title!);
});

test('旧探究直接地址复制失败不新增幽灵副本，恢复后可创建副本', async ({ page }) => {
  const design = rentalSampleDesign('functional-design');
  design.contextualProblem = { ...buildContextualProblem(design), confirmed: true };
  design.savedLevels = [1];
  await page.addInitScript((design) => {
    if (!localStorage.getItem('teaching-method.market-workspace.v1'))
      localStorage.setItem(
        'teaching-method.market-workspace.v1',
        JSON.stringify({
          version: 1,
          designs: [design],
          favorites: [],
          sharedSkillIds: [],
          tasks: [],
          activityDrafts: [],
        }),
      );
  }, design);
  await page.goto('/#/inquiry/functional-design/1');
  await blockStorage(page, 'teaching-method.market-workspace.v1');
  await page.getByRole('button', { name: '创建副本', exact: true }).click();
  await expect(page).toHaveURL(/#\/inquiry\/functional-design\/1$/);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1') || '{}'));
  expect(stored.designs).toHaveLength(1);
  await restoreStorage(page);
  await page.getByRole('button', { name: '创建副本', exact: true }).click();
  await expect(page).toHaveURL(/#\/inquiry\/.*\/1/);
  await expect(page).not.toHaveURL(/#\/inquiry\/functional-design\/1$/);
});

test('教师回答保存失败时导航会提示，恢复存储后可保存并离开', async ({ page }) => {
  await page.goto('/#/create/functional-leave');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await blockStorage(page, 'teaching-assistant.method-draft.v1:functional-leave');
  await page.getByLabel('你的回答', { exact: true }).fill('需要保留的尚未提交回答');
  await page.getByRole('button', { name: '首页', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('未保存');
  await expect(page).toHaveURL(/#\/create\/functional-leave/);
  await page.getByRole('button', { name: '保存后离开', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('保存仍未成功');
  await restoreStorage(page);
  await page.getByRole('button', { name: '保存后离开', exact: true }).click();
  await expect(page).toHaveURL(/#\/home$/);
  await page.goto('/#/create/functional-leave');
  await expect(page.getByLabel('你的回答', { exact: true })).toHaveValue('需要保留的尚未提交回答');
});

test('未保存的探究修改离开有保护，保存重试不强迫先确认成果', async ({ page }) => {
  const design = rentalSampleDesign('functional-unsaved-design');
  design.contextualProblem = { ...buildContextualProblem(design), confirmed: true };
  design.savedLevels = [1];
  await page.addInitScript((design) => {
    if (!localStorage.getItem('teaching-method.market-workspace.v1'))
      localStorage.setItem(
        'teaching-method.market-workspace.v1',
        JSON.stringify({
          version: 1,
          designs: [design],
          favorites: [],
          sharedSkillIds: [],
          tasks: [],
          activityDrafts: [],
        }),
      );
  }, design);
  await page.goto('/#/inquiry/functional-unsaved-design/1');
  await blockStorage(page, 'teaching-method.market-workspace.v1');
  await page.getByLabel('学生问题', { exact: true }).fill('比较三种使用时长的租赁费用并解释依据');
  await expect(page.getByText('草稿未保存', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: '首页', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('未保存');
  await restoreStorage(page);
  await page.getByRole('button', { name: '保存后离开', exact: true }).click();
  await expect(page).toHaveURL(/#\/home$/);
  await page.goto('/#/inquiry/functional-unsaved-design/1');
  await expect(page.getByLabel('学生问题', { exact: true })).toHaveValue(
    '比较三种使用时长的租赁费用并解释依据',
  );
  await expect(
    page.getByRole('checkbox', { name: '我已核对数据、知识要求、单位、范围和可解性' }),
  ).not.toBeChecked();
});

test('未完成的补充可恢复，确认方法不会悄悄丢弃补充内容', async ({ page }) => {
  await seedMethod(page, 'functional-extra');
  await page.getByRole('button', { name: '还需要补充', exact: true }).click();
  await page.getByLabel('补充情况', { exact: true }).fill('学生已找到证据');
  await page.getByLabel('补充做法', { exact: true }).fill('请学生解释证据如何支持观点');
  await page.reload();
  await expect(page.getByLabel('补充情况', { exact: true })).toHaveValue('学生已找到证据');
  await expect(page.getByLabel('补充做法', { exact: true })).toHaveValue('请学生解释证据如何支持观点');
  await page.getByRole('button', { name: '这就是我的教学方法', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教学 SKILL', exact: true })).toHaveCount(0);
  await expect(page.locator('.method-error')).toContainText('先保存补充');
  await page.getByRole('button', { name: '保存补充', exact: true }).click();
  await page.getByRole('button', { name: '这就是我的教学方法', exact: true }).click();
  await expect(page).toHaveURL(/functional-extra\/test/);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]').find((assistant: { id: string }) => assistant.id === 'functional-extra'));
  expect(saved.skills[0].steps).toContainEqual({ condition: '学生已找到证据', action: '请学生解释证据如何支持观点' });
});

test('达到八种情况后所有补充入口保持一致，不让教师填写无法保存的第九种情况', async ({ page }) => {
  await seedMethod(page, 'functional-capacity', 8);
  await expect(page.getByRole('button', { name: '还需要补充', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: '补充一种情况和做法', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '这就是我的教学方法', exact: true }).click();
  await expect(page).toHaveURL(/functional-capacity\/test/);
  await expect(page.locator('.testing-title')).toBeVisible();
});

test('方法复制失败留在原页面，不生成刷新后消失的副本，恢复存储后可重试', async ({ page }) => {
  await page.goto('/#/workshop?tab=skills');
  const count = await page.locator('.workshop-item').count();
  const source = page.locator('.workshop-item').first();
  await blockStorage(page, 'teaching-assistant.frontend-demo.v2');
  await source.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '复制', exact: true }).click();
  await expect(page).toHaveURL(/#\/workshop\?tab=skills$/);
  await expect(page.locator('.workshop-item')).toHaveCount(count);
  await expect(page.getByRole('alert')).toContainText('保存失败');
  await restoreStorage(page);
  await source.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '复制', exact: true }).click();
  await expect(page).toHaveURL(/#\/create\//);
});

test('加入助手配置失败不报成功，不关闭弹窗，也不改动已有方法', async ({ page }) => {
  await page.goto('/#/workshop?tab=skills');
  const before = await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'));
  await page
    .locator('.workshop-item')
    .first()
    .getByRole('button', { name: /更多操作/ })
    .click();
  await page.getByRole('menuitem', { name: '加入助手配置', exact: true }).click();
  await blockStorage(page, 'teaching-assistant.frontend-demo.v2');
  await page.getByRole('button', { name: '确认加入', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('已加入助手配置，请重新核对。', { exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'))).toBe(before);
  await restoreStorage(page);
  await page.getByRole('button', { name: '确认加入', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeHidden();
});

test('删除和展示保存失败保留作品与确认弹窗，恢复后可以完成操作', async ({ page }) => {
  const reviewed = { ...initialMine[0], revision: 2, status: 'TESTED' };
  await page.addInitScript((assistant) => localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([assistant])), reviewed);
  await page.goto('/#/workshop?tab=skills');
  const count = await page.locator('.workshop-item').count();
  const source = page.locator('.workshop-item').first();
  await blockStorage(page, 'teaching-method.market-workspace.v1');
  await source.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '分享展示', exact: true }).click();
  await expect(page.getByText('已加入当前工作区的作品展示。', { exact: true })).toHaveCount(0);
  await restoreStorage(page);
  await blockStorage(page, 'teaching-assistant.frontend-demo.v2');
  await source.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: /^删除/ }).click();
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.locator('.workshop-item')).toHaveCount(count);
  await expect(page.getByText('已删除', { exact: true })).toHaveCount(0);
  await restoreStorage(page);
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(count - 1);
});

test('核对状态保存失败不能进入完成页或试用流程，恢复后最后一步可重新确认', async ({ page }) => {
  await page.addInitScript((assistant) => {
    if (!JSON.parse(localStorage.getItem('teaching-assistant.frontend-demo.v2') || '[]').some((item: { id: string }) => item.id === 'functional-check'))
      localStorage.setItem(
        'teaching-assistant.frontend-demo.v2',
        JSON.stringify([
          {
            ...assistant,
            id: 'functional-check',
            revision: 1,
            status: 'GENERATED',
            skills: [assistant.skills[0]],
          },
        ]),
      );
  }, initialMine[0]);
  await page.goto('/#/assistant/functional-check/test');
  await blockStorage(page, 'teaching-assistant.frontend-demo.v2');
  while (await page.getByRole('button', { name: '确认并继续', exact: true }).count())
    await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教学方法核对完成', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: '确认并完成', exact: true })).toBeVisible();
  await restoreStorage(page);
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教学方法核对完成', exact: true })).toBeVisible();
});
