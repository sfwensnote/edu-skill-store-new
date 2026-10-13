import { test, expect } from './account-session-fixture';
import { skillResetKey } from '../shared/skill-reset';
import { initialMine } from '../src/data/platform';
import { addMarketSkill } from '../shared/marketplace';
import { marketSkills } from './fixtures/marketplace';

const ownersKey = 'teaching-assistant.frontend-demo.v2';
const workspaceKey = 'teaching-method.market-workspace.v1';

test('旧 SKILL、集市添加与创建草稿一次清空，桌面和手机均显示空列表', async ({ page }, info) => {
  await page.addInitScript(({ ownersKey, workspaceKey, owners, added }) => {
    if (localStorage.getItem('old-data-seeded')) return;
    localStorage.setItem(ownersKey, JSON.stringify(owners));
    localStorage.setItem(workspaceKey, JSON.stringify({ version: 1, addedSkills: added, sharedSkillIds: ['personal:assistant-demo-active:reflect'], favorites: ['sample-reflect'] }));
    localStorage.setItem('teaching-assistant.method-draft.v1:old-draft', '{"stage":"method"}');
    localStorage.setItem('teaching-assistant.check-progress:assistant-demo-active', '{"completed":true}');
    localStorage.setItem('unrelated-preference', '保留');
    localStorage.setItem('old-data-seeded', '1');
  }, { ownersKey, workspaceKey, owners: initialMine, added: addMarketSkill([], marketSkills[0], '2026-10-10T08:00:00Z') });
  await page.goto('/#/market');
  await expect(page.getByRole('heading', { name: '集市暂无 SKILL', exact: true })).toBeVisible();
  await expect(page.locator('.market-resource-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '清除筛选', exact: true })).toHaveCount(0);
  const saved = await page.evaluate(({ ownersKey, workspaceKey, skillResetKey }) => ({
    owners: localStorage.getItem(ownersKey), workspace: JSON.parse(localStorage.getItem(workspaceKey)!),
    draft: localStorage.getItem('teaching-assistant.method-draft.v1:old-draft'),
    progress: localStorage.getItem('teaching-assistant.check-progress:assistant-demo-active'),
    marker: localStorage.getItem(skillResetKey), unrelated: localStorage.getItem('unrelated-preference'),
  }), { ownersKey, workspaceKey, skillResetKey });
  expect(saved.owners).toBeNull(); expect(saved.draft).toBeNull(); expect(saved.progress).toBeNull();
  expect(saved.workspace.addedSkills).toEqual([]); expect(saved.workspace.sharedSkillIds).toEqual([]);
  expect(saved.marker).toBe('done'); expect(saved.unrelated).toBe('保留');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('empty-market-desktop.png'), fullPage: true });
  for (const tab of ['all', 'created', 'added']) {
    await page.goto(`/#/workshop?tab=${tab}`);
    await expect(page.locator('.workshop-item')).toHaveCount(0);
  }
  await page.screenshot({ path: info.outputPath('empty-workshop-desktop.png'), fullPage: true });
  await page.reload();
  await expect(page.locator('.workshop-item')).toHaveCount(0);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/market');
  await expect(page.getByRole('heading', { name: '集市暂无 SKILL', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('empty-market-mobile.png'), fullPage: true });
});

test('清空后新建方法、完成核对与发布，刷新后保留新方法', async ({ page }) => {
  await page.goto('/#/market');
  await expect(page.locator('.market-resource-card')).toHaveCount(0);
  await page.goto('/#/create/new-after-reset');
  await page.getByLabel('教学想法').fill('学生阅读时只有判断，没有引用原文。');
  await page.getByLabel('教学分类', { exact: true }).selectOption('课堂提问');
  await page.getByRole('checkbox', { name: '标签 证据追问', exact: true }).check();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  for (const [label, value] of [['教学方法名称', '清空后新建的证据追问'], ['教学方法简介', '引导学生引用原文支持观点'], ['结束条件', '学生能说明证据如何支持判断后结束'], ['希望学生达到', '用原文支持判断'], ['什么时候开始', '学生只表达观点']]) {
    await page.getByRole('button', { name: `编辑${label}`, exact: true }).click();
    await page.getByRole('textbox', { name: label, exact: true }).fill(value);
  }
  await page.getByRole('button', { name: '补充一种情况和做法', exact: true }).click();
  for (const [label, value] of [['情况 1', '学生只有观点没有依据'], ['做法 1', '追问原文依据']]) {
    await page.getByRole('button', { name: `编辑${label}`, exact: true }).click();
    await page.getByRole('textbox', { name: label, exact: true }).fill(value);
  }
  await page.getByRole('button', { name: '完成整理', exact: true }).click();
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await page.getByRole('button', { name: '学生视角预览', exact: true }).click();
  await page.getByRole('button', { name: '分享到集市', exact: true }).click();
  await expect(page.locator('.market-resource-card')).toHaveCount(1);
  await page.reload();
  await expect(page.locator('.market-resource-card')).toHaveCount(1);
  await page.goto('/#/workshop?tab=created');
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await expect(page.locator('.workshop-item')).toContainText('清空后新建的证据追问');
  await page.reload();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
});

test('清理未保存时不启动应用或假报成功，恢复权限后重试完成清空', async ({ page }) => {
  await page.addInitScript(({ ownersKey, owners, skillResetKey }) => {
    localStorage.setItem(ownersKey, JSON.stringify(owners));
    const set = Storage.prototype.setItem;
    (window as any).restoreResetStorage = () => { Storage.prototype.setItem = set; };
    Storage.prototype.setItem = function (key, value) {
      if (key === skillResetKey) throw new DOMException('存储写入被阻止', 'QuotaExceededError');
      set.call(this, key, value);
    };
  }, { ownersKey, owners: initialMine, skillResetKey });
  await page.goto('/#/workshop');
  await expect(page.getByRole('alert')).toContainText('SKILL 未清空');
  expect(await page.evaluate((key) => localStorage.getItem(key), skillResetKey)).toBeNull();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!).length, ownersKey)).toBe(2);
  await page.evaluate(() => (window as any).restoreResetStorage());
  await page.getByRole('button', { name: '重新清空', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '我的教学方法', exact: true })).toBeVisible();
  expect(await page.evaluate((key) => localStorage.getItem(key), skillResetKey)).toBe('done');
});
