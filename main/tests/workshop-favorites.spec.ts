import { test, expect } from './market-catalog-fixture';
import { initialMine } from '../src/data/platform';
import { assistantSkillEntries } from '../shared/marketplace';
import { marketSkills } from './fixtures/marketplace';
import { marketWorkspaceKey, ownersStorageKey } from '../shared/workspace-keys';

test('集市收藏在我的收藏中显示，查看返回与刷新保留，取消收藏不新增或删除方法', async ({ page }) => {
  const source = marketSkills[0];
  await page.goto('/#/market');
  await page.getByRole('button', { name: `收藏${source.skill.name}`, exact: true }).click();
  await page.getByRole('button', { name: '我的教学方法', exact: true }).click();
  await page.getByRole('button', { name: '我的收藏', exact: true }).click();
  const card = page.locator('.workshop-item');
  await expect(card).toHaveCount(1);
  await expect(card).toContainText(source.skill.name);
  await card.getByRole('button', { name: /更多操作/ }).click();
  await expect(page.getByRole('menuitem', { name: /挂载|删除|复制/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await card.getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.getByRole('heading', { name: source.skill.name, exact: true })).toBeVisible();
  await expect(page.getByRole('region', { name: '试用教学方法', exact: true })).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: '返回我的教学方法', exact: true }).click();
  await expect(page).toHaveURL(/workshop\?tab=favorites$/);
  await expect(card).toHaveCount(1);
  await page.reload();
  await card.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '取消收藏', exact: true }).click();
  await expect(card).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '还没有收藏教学方法', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '全部', exact: true }).click();
  await expect(card).toHaveCount(0);
  await page.goto('/#/market');
  await expect(page.getByRole('button', { name: `收藏${source.skill.name}`, exact: true })).toHaveAttribute('aria-pressed', 'false');
});

test('自己的方法与集市收藏共用列表，只读快照保留来源，未验证时不能挂载', async ({ page }) => {
  const own = assistantSkillEntries(initialMine)[0];
  const source = marketSkills[0];
  await page.addInitScript(({ owners, favorites, keys }) => {
    if (localStorage.getItem('favorites-seeded')) return;
    localStorage.setItem(keys.owners, JSON.stringify(owners));
    localStorage.setItem(keys.market, JSON.stringify({ version: 1, favorites }));
    localStorage.setItem('favorites-seeded', 'true');
  }, { owners: initialMine, favorites: [own.id, source.id], keys: { owners: ownersStorageKey, market: marketWorkspaceKey } });
  await page.goto('/#/workshop?tab=favorites');
  await expect(page.locator('.workshop-item')).toHaveCount(2);
  const card = page.locator(`[data-work-id="${source.id}"]`);
  await card.getByRole('button', { name: '添加到我的教学方法', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已添加到我的教学方法');
  await expect(card.getByRole('button', { name: '添加到我的教学方法', exact: true })).toHaveCount(0);
  await page.reload();
  await card.getByRole('button', { name: '查看', exact: true }).click();
  await page.getByRole('button', { name: '添加教学方法', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText(source.skill.name);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: '返回我的教学方法', exact: true }).click();
  await card.getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '添加教学方法', exact: true }).click();
  await expect(page.getByRole('button', { name: '创建新学伴', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: '前往教学方法验证', exact: true }).click();
  await expect(page).toHaveURL(/skill-check\//);
  await expect(page.getByRole('heading', { level: 1 })).toContainText('教学方法验证');
  const stored = await page.evaluate(({ market, owners }) => ({
    workspace: JSON.parse(localStorage.getItem(market)!), owners: JSON.parse(localStorage.getItem(owners)!),
  }), { market: marketWorkspaceKey, owners: ownersStorageKey });
  expect(stored.workspace.addedSkills).toHaveLength(1);
  expect(stored.workspace.addedSkills[0].addedFrom.id).toBe(source.id);
  expect(stored.owners).toEqual(initialMine);
  expect(decodeURIComponent(page.url())).toContain(stored.workspace.addedSkills[0].id);
});

test('取消收藏保存失败时保留列表，恢复写入后可重试，手机分类可用', async ({ page }) => {
  const source = marketSkills[0];
  await page.goto('/#/market');
  await page.getByRole('button', { name: `收藏${source.skill.name}`, exact: true }).click();
  await page.goto('/#/workshop?tab=favorites');
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('full', 'QuotaExceededError');
      write.call(this, name, value);
    };
  }, marketWorkspaceKey);
  await page.locator('.workshop-item').getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '取消收藏', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.evaluate(() => (window as unknown as { restoreWrite: () => void }).restoreWrite());
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('combobox', { name: '教学方法分类', exact: true })).toHaveValue('favorites');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.locator('.workshop-item').getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '取消收藏', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(0);
  await page.reload();
  await expect(page.locator('.workshop-item')).toHaveCount(0);
});
