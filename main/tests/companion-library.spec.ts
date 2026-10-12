import { test, expect, type Page } from './workspace-fixture';
import { companionsKey, newCompanion } from '../shared/learning-companion';
import { initialMine } from '../src/data/platform';
import { packageTeachingMethod } from '../shared/teaching-method';
import { completeTeachingMethod } from './fixtures/teaching-method';

const method = packageTeachingMethod(completeTeachingMethod(), 'library-method');
const owner = { ...initialMine[0], id: 'library-owner', name: method.name, skills: [method], status: 'DRAFT' as const, isPublic: false };
const skillId = 'personal:library-owner:library-method';
const customImage = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=';
const material = { id: 'notes', name: '课堂记录.txt', type: 'text/plain', size: 1, text: '课堂记录', data: 'data:text/plain;base64,QQ==' };
const items = [
  { ...newCompanion('math'), name: '数学学伴', introduction: '帮助学生检查解题思路', avatar: 'simple' as const, subject: '数学',
    status: 'ready' as const, step: 4 as const, skillIds: [skillId], materials: [material], updatedAt: '2026-10-11T08:00:00Z',
    task: { audience: '全班学生', scenario: '课堂学习', taskAndGoals: '检查解题步骤，说明理由' } },
  { ...newCompanion('reading'), name: '阅读学伴', introduction: '引导学生回到文本寻找依据', avatar: 'lively' as const, subject: '语文',
    status: 'ready' as const, step: 4 as const, skillIds: [skillId], updatedAt: '2026-10-10T08:00:00Z',
    task: { audience: '学习小组', scenario: '课后练习', taskAndGoals: '比较人物的不同选择' } },
  { ...newCompanion('custom'), name: '自选形象学伴', introduction: '根据我的教学方法提问', avatar: 'custom' as const, avatarImage: customImage,
    subject: '英语', skillIds: [skillId, 'missing'], updatedAt: '2026-10-09T08:00:00Z' },
];
async function seed(page: Page) {
  await page.addInitScript(({ owner, items, key }) => {
    if (localStorage.getItem('library-test-seeded')) return;
    localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([owner]));
    localStorage.setItem(key, JSON.stringify(items));
    localStorage.setItem('library-test-seeded', 'true');
  }, { owner, items, key: companionsKey });
  await page.goto('/#/companions');
}
async function blockWrites(page: Page) {
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function(k, value) {
      if (k === key) throw new DOMException('full', 'QuotaExceededError');
      write.call(this, k, value);
    };
  }, companionsKey);
}
async function restoreWrites(page: Page) {
  await page.evaluate(() => (window as unknown as { restoreWrite: () => void }).restoreWrite());
}

test('空账号显示空列表，不创建样例或上传材料入口', async ({ page }, info) => {
  await page.goto('/#/companions');
  await expect(page.getByRole('heading', { name: '还没有学伴', exact: true })).toBeVisible();
  await expect(page.locator('.companion-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /上传材料/ })).toHaveCount(0);
  const raw = await page.evaluate(key => localStorage.getItem(key), companionsKey);
  expect(raw === null || JSON.parse(raw).length === 0).toBe(true);
  await page.reload();
  await expect(page.locator('.companion-card')).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('library-empty.png'), fullPage: true });
  await page.getByRole('button', { name: '创建学伴', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '学伴名称', exact: true })).toHaveValue('');
});

test('列表使用所选头像与真实资料，搜索筛选和排序可用，桌面手机不溢出', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await seed(page);
  await page.setViewportSize({ width: 1672, height: 1000 });
  await expect(page.locator('.companion-card')).toHaveCount(3);
  await expect(page.locator('[data-companion-id="math"] .companion-avatar')).toHaveAttribute('data-style', 'simple');
  await expect(page.locator('[data-companion-id="reading"] .companion-avatar')).toHaveAttribute('data-style', 'lively');
  await expect(page.locator('[data-companion-id="custom"] .companion-avatar img')).toHaveAttribute('src', customImage);
  await expect(page.locator('[data-companion-id="custom"]')).toContainText('SKILL 已移除');
  await expect(page.locator('[data-companion-id="math"]')).toContainText('已挂载 1 个 SKILL');
  await expect(page.locator('[data-companion-id="math"]')).toContainText('材料 1 份');
  await expect(page.getByRole('button', { name: /上传材料/ })).toHaveCount(0);
  await expect.poll(() => page.locator('.companion-library img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.screenshot({ path: info.outputPath('library-desktop.png'), fullPage: true });
  await page.getByRole('searchbox', { name: '搜索学伴', exact: true }).fill('课堂记录');
  await expect(page.locator('.companion-card')).toHaveCount(1);
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '课堂记录.txt', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('课堂记录.txt');
  await page.getByRole('searchbox', { name: '搜索学伴', exact: true }).fill('错因追问');
  await expect(page.locator('.companion-card')).toHaveCount(3);
  await page.getByRole('searchbox', { name: '搜索学伴', exact: true }).fill('');
  await page.getByRole('combobox', { name: '学伴状态', exact: true }).selectOption('ready');
  await expect(page.locator('.companion-card')).toHaveCount(2);
  await page.getByRole('combobox', { name: '学伴学科', exact: true }).selectOption('英语');
  await expect(page.getByRole('heading', { name: '没有找到符合条件的学伴' })).toBeVisible();
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();
  await expect(page.locator('.companion-card')).toHaveCount(3);
  await page.getByRole('combobox', { name: '学伴排序', exact: true }).selectOption('name');
  expect(await page.locator('.companion-card h2').allTextContents()).toEqual([...items].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')).map(item => item.name));
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`library-mobile-${width}.png`), fullPage: true });
  }
  expect(errors).toEqual([]);
});

test('草稿可查看或继续创建，详情保留头像、场景、方法与材料，编辑和返回有正确入口', async ({ page }, info) => {
  await seed(page);
  await page.locator('[data-companion-id="custom"]').getByRole('button', { name: '查看学伴', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/custom(?:\?|$)/);
  await expect(page.locator('.companion-overview-image img')).toHaveAttribute('src', customImage);
  await expect(page.getByRole('alert').filter({ hasText: '关联的 SKILL 已移除' })).toBeVisible();
  await page.getByRole('button', { name: '返回我的学伴', exact: true }).click();
  await page.locator('[data-companion-id="custom"]').getByRole('button', { name: '继续创建', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/custom\/edit(?:\?|$)/);
  await page.getByRole('button', { name: '返回我的学伴', exact: true }).click();
  await page.locator('[data-companion-id="math"]').getByRole('button', { name: '查看学伴', exact: true }).click();
  await expect(page.locator('.companion-overview-main > section .companion-task-summary')).toContainText('检查解题步骤，说明理由');
  await expect(page.locator('summary').filter({ hasText: '错因追问' })).toBeVisible();
  await expect(page.getByRole('button', { name: '下载材料', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('overview-desktop.png'), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`overview-mobile-${width}.png`), fullPage: true });
  }
  await page.reload();
  await expect(page.getByRole('heading', { name: '数学学伴', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '编辑学伴', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/math\/edit(?:\?|$)/);
  await expect(page.getByRole('textbox', { name: '学伴简介', exact: true })).toHaveValue('帮助学生检查解题思路');
});

test('复制只创建独立学伴草稿，原学伴与我的 SKILL 保持，复制失败可重试', async ({ page }) => {
  await seed(page);
  const before = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)[0], companionsKey);
  const skillsBefore = await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'));
  await blockWrites(page);
  await page.locator('[data-companion-id="math"]').getByRole('button', { name: '复制', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('复制未保存');
  await expect(page.locator('.companion-card')).toHaveCount(3);
  await restoreWrites(page);
  await page.locator('[data-companion-id="math"]').getByRole('button', { name: '复制', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已复制为草稿');
  await expect(page.locator('.companion-card')).toHaveCount(4);
  const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), companionsKey);
  expect(saved.find((item: { id: string }) => item.id === 'math')).toEqual(before);
  expect(saved[0].status).toBe('draft'); expect(saved[0].step).toBe(1);
  expect(saved[0].skillIds).toEqual(before.skillIds); expect(saved[0].materials).toEqual(before.materials);
  await page.locator('.companion-card').filter({ hasText: '数学学伴（副本）' }).getByRole('button', { name: '继续创建', exact: true }).click();
  await page.getByRole('textbox', { name: '学伴名称', exact: true }).fill('独立修改的学伴');
  await page.getByRole('button', { name: '返回我的学伴', exact: true }).click();
  await expect(page.locator('[data-companion-id="math"]')).toContainText('数学学伴');
  expect(await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'))).toBe(skillsBefore);
  await page.reload(); await expect(page.locator('.companion-card')).toHaveCount(4);
});

test('删除需确认，失败保留学伴，重试成功后刷新仍删除并保留 SKILL', async ({ page }) => {
  await seed(page);
  const skillsBefore = await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'));
  const deleteButton = page.getByRole('button', { name: '删除学伴：数学学伴', exact: true });
  await expect(deleteButton).toBeVisible();
  await expect(page.getByRole('button', { name: '删除学伴：自选形象学伴', exact: true })).toBeVisible();
  async function openDelete() {
    await deleteButton.click();
    await expect(page.getByRole('dialog')).toContainText('数学学伴');
  }
  await openDelete();
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.locator('.companion-card')).toHaveCount(3);
  await expect(deleteButton).toBeFocused();
  await openDelete(); await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(deleteButton).toBeFocused();
  await openDelete(); await blockWrites(page);
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('删除未保存');
  await expect(page.locator('.companion-card')).toHaveCount(3);
  await restoreWrites(page);
  await page.getByRole('button', { name: '确认删除', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('.companion-card')).toHaveCount(2);
  await expect(page.locator('body')).not.toHaveCSS('pointer-events', 'none');
  expect(await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'))).toBe(skillsBefore);
  await page.reload(); await expect(page.locator('[data-companion-id="math"]')).toHaveCount(0);
  for (const name of ['阅读学伴', '自选形象学伴']) {
    await page.getByRole('button', { name: `删除学伴：${name}`, exact: true }).click();
    await page.getByRole('button', { name: '确认删除', exact: true }).click();
  }
  await expect(page.getByRole('heading', { name: '还没有学伴', exact: true })).toBeVisible();
  await page.reload(); await expect(page.locator('.companion-card')).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'))).toBe(skillsBefore);
  await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: '首页', exact: true }).click();
  await expect(page).toHaveURL(/#\/home$/);
});
