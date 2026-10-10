import { test, expect, type Page } from '@playwright/test';
import { initialMine } from '../src/data/platform';
import { assistantSkillEntries, addMarketSkill } from '../shared/marketplace';

const workspaceKey = 'teaching-method.market-workspace.v1';
const ownersKey = 'teaching-assistant.frontend-demo.v2';
const firstRow = (page: Page) => page.locator('.market-resource-card').first();
async function stored(page: Page) {
  return page.evaluate(({ workspaceKey, ownersKey }) => ({
    workspace: JSON.parse(localStorage.getItem(workspaceKey) || '{}'),
    owners: JSON.parse(localStorage.getItem(ownersKey) || 'null'),
  }), { workspaceKey, ownersKey });
}
async function blockStorage(page: Page, key: string) {
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    (window as any).restoreSkillStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('测试存储已满', 'QuotaExceededError');
      original.call(this, name, value);
    };
  }, key);
}

test('集市添加不创建可编辑副本；分类、刷新、试用与移除保留原版边界', async ({ page }) => {
  await page.goto('/#/market');
  const before = (await stored(page)).owners;
  const title = await firstRow(page).locator('h2').innerText();
  await firstRow(page).getByRole('button', { name: '添加到我的 SKILL', exact: true }).click();
  await expect(page).toHaveURL(/#\/market$/);
  await expect(firstRow(page).getByRole('button', { name: '已添加', exact: true })).toBeDisabled();
  expect((await stored(page)).owners).toEqual(before);
  await page.reload();
  await expect(firstRow(page).getByRole('button', { name: '已添加', exact: true })).toBeDisabled();
  expect((await stored(page)).workspace.addedSkills).toHaveLength(1);
  await page.goto('/#/workshop');
  await expect(page.locator('.workshop-item')).toHaveCount(7);
  await page.getByRole('button', { name: '我创建的', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(6);
  await page.getByRole('button', { name: '从集市添加', exact: true }).click();
  const card = page.locator('.workshop-item');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(title);
  await expect(card.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0);
  await card.getByRole('button', { name: '试用 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: title, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '编辑我的方法' })).toHaveCount(0);
  await expect(page.getByText('方法示例', { exact: true })).toHaveCount(0);
  await page.getByLabel('学生的回应').fill('我不知道下一步怎么做');
  await page.getByRole('button', { name: '查看引导示例', exact: true }).click();
  await expect(page.locator('.experience-turn')).toHaveCount(1);
  expect((await stored(page)).owners).toEqual(before);
  await page.reload();
  await page.getByRole('button', { name: '返回我的 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: '从集市添加', exact: true })).toBeVisible();
  await card.getByRole('button', { name: /更多操作/ }).click();
  await expect(page.getByRole('menuitem', { name: '改编 SKILL', exact: true })).toBeVisible();
  await expect(page.getByRole('menuitem', { name: /编辑|分享展示|加入助手配置/ })).toHaveCount(0);
  await page.getByRole('menuitem', { name: '从我的 SKILL 移除', exact: true }).click();
  await page.getByRole('button', { name: '确认移除', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.goto('/#/market');
  await expect(firstRow(page)).toContainText(title);
  await expect(firstRow(page).getByRole('button', { name: '添加到我的 SKILL', exact: true })).toBeEnabled();
});

test('添加保存失败时不假报成功，恢复存储后只添加一次', async ({ page }) => {
  await page.goto('/#/market');
  await blockStorage(page, workspaceKey);
  await firstRow(page).getByRole('button', { name: '添加到我的 SKILL', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('添加未保存');
  await expect(firstRow(page).getByRole('button', { name: '添加到我的 SKILL', exact: true })).toBeEnabled();
  expect((await stored(page)).workspace.addedSkills || []).toHaveLength(0);
  await page.evaluate(() => (window as any).restoreSkillStorage());
  await firstRow(page).getByRole('button', { name: '添加到我的 SKILL', exact: true }).click();
  expect((await stored(page)).workspace.addedSkills).toHaveLength(1);
  await expect(page.getByRole('alert')).toHaveCount(0);
});

test('改编先填写新需求；取消及保存失败不建副本，成功后独立梳理并重新检测', async ({ page }) => {
  await page.goto('/#/market');
  await firstRow(page).getByRole('button', { name: '添加到我的 SKILL', exact: true }).click();
  const before = (await stored(page)).owners;
  const original = (await stored(page)).workspace.addedSkills[0];
  await firstRow(page).getByRole('button', { name: '查看与试用', exact: true }).click();
  await page.getByRole('button', { name: '改编 SKILL', exact: true }).click();
  await expect(page.getByRole('button', { name: '开始改编', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('main')).toHaveCount(1);
  expect((await stored(page)).owners).toEqual(before);
  await page.getByRole('button', { name: '改编 SKILL', exact: true }).click();
  const requirements = '用于高中物理，先要求学生解释依据，再给出检查提示。';
  await page.getByLabel('新需求', { exact: true }).fill(requirements);
  await blockStorage(page, ownersKey);
  await page.getByRole('button', { name: '开始改编', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('草稿未保存');
  await expect(page.getByLabel('新需求', { exact: true })).toHaveValue(requirements);
  expect((await stored(page)).owners).toEqual(before);
  await page.evaluate(() => (window as any).restoreSkillStorage());
  await page.getByRole('button', { name: '开始改编', exact: true }).click();
  await expect(page).toHaveURL(/#\/create\//);
  await expect(page.getByRole('heading', { name: '说说你的教学想法', exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: '教学想法', exact: true })).toHaveValue(requirements);
  let data = await stored(page);
  expect(data.owners).toHaveLength(3);
  const draft = data.owners[0];
  expect(draft.status).toBe('DRAFT');
  expect(draft.isPublic).toBe(false);
  expect(draft.revision).toBe(1);
  expect(draft.skills[0].id).not.toBe(original.skill.id);
  expect(draft.adaptation.requirements).toBe(requirements);
  expect(data.workspace.addedSkills[0]).toEqual(original);
  expect(data.workspace.sharedSkillIds).toEqual([]);
  await page.reload();
  await expect(page.getByRole('textbox', { name: '教学想法', exact: true })).toHaveValue(requirements);
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect(page.locator('.question-top small')).toHaveText('1 / 6');
  await expect(page.getByRole('button', { name: '形成 SKILL', exact: true })).toBeDisabled();
  await page.goto('/#/workshop?tab=created');
  await expect(page.locator('.workshop-item')).toHaveCount(7);
  await page.getByRole('button', { name: '从集市添加', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
});

test('从已发布个人来源添加也不会取得所有权，来源移除后保留固定版本', async ({ page }) => {
  const source = assistantSkillEntries(initialMine)[0];
  const added = addMarketSkill([], source, '2026-10-10T08:00:00Z');
  await page.addInitScript(({ key, added }) => {
    if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ version: 1, addedSkills: added }));
  }, { key: workspaceKey, added });
  await page.goto('/#/workshop?tab=added');
  await expect(page.locator('.workshop-item').getByRole('button', { name: '编辑', exact: true })).toHaveCount(0);
  await page.evaluate(({ key, owners }) => localStorage.setItem(key, JSON.stringify(owners)), {
    key: ownersKey, owners: initialMine.filter((owner) => owner.id !== source.assistantId),
  });
  await page.reload();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.locator('.workshop-item').getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.getByRole('heading', { name: source.skill.name, exact: true })).toBeVisible();
  await expect(page.locator('.detail-heading')).toContainText(source.version);
  await expect(page.getByRole('button', { name: '编辑我的方法' })).toHaveCount(0);
});

test('集市两个操作与我的三类在桌面、平板和手机可见且不溢出', async ({ page }) => {
  await page.goto('/#/market');
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    await expect(firstRow(page).getByRole('button', { name: '查看与试用', exact: true })).toBeVisible();
    await expect(firstRow(page).getByRole('button', { name: '添加到我的 SKILL', exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await firstRow(page).getByRole('button', { name: '添加到我的 SKILL', exact: true }).click();
  await page.goto('/#/workshop?tab=added');
  await expect(page.getByRole('combobox', { name: 'SKILL 分类', exact: true })).toHaveValue('added');
  await expect(page.getByRole('combobox', { name: 'SKILL 分类', exact: true }).locator('option')).toHaveText([
    '全部（7）', '我创建的（6）', '从集市添加（1）',
  ]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
