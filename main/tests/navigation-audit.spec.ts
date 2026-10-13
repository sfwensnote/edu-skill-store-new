import { test, expect, type Page } from './workspace-fixture';
import { initialMine } from '../src/data/platform';
import { packageTeachingMethod } from '../shared/teaching-method';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { companionsKey, newCompanion } from '../shared/learning-companion';

const skill = packageTeachingMethod(completeTeachingMethod(), 'audit-method');
const owner = { ...initialMine[0], id: 'audit-owner', name: skill.name, skills: [skill], status: 'TESTED', isPublic: false, revision: 1 };
const entryId = 'personal:audit-owner:audit-method';
const menus = [['首页', 'home'], ['教学方法 集市', 'market'], ['我的教学方法', 'workshop'], ['我的学伴', 'companions']] as const;

test.beforeEach(async ({ page }) => {
  await page.addInitScript(({ owner, draft, ready }) => {
    if (localStorage.getItem('navigation-audit-seeded')) return;
    localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([owner]));
    localStorage.setItem('teaching-method.companions.v1', JSON.stringify([draft, ready]));
    localStorage.setItem('navigation-audit-seeded', 'true');
  }, { owner, draft: { ...newCompanion('draft-buddy', entryId), name: '草稿学伴', introduction: '练习回顾思路' },
    ready: { ...newCompanion('ready-buddy', entryId), name: '已创建学伴', introduction: '检查解题依据', status: 'ready', step: 4,
      task: { audience: '全班学生', scenario: '课堂学习', taskAndGoals: '说明解题理由' } } });
});

function errors(page: Page) {
  const found: string[] = [];
  page.on('pageerror', error => found.push(error.message));
  page.on('console', message => { if (message.type() === 'error') found.push(message.text()); });
  return found;
}
async function topMenus(page: Page) {
  for (const [name, hash] of menus) {
    const button = page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name, exact: true });
    await button.click();
    await expect(page).toHaveURL(new RegExp(`#/${hash}$`));
    await expect(button).toHaveAttribute('aria-current', 'page');
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('pointer-events', 'none');
  }
}
async function ownDetail(page: Page) {
  await page.goto('/#/workshop?tab=created');
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await expect(page.getByRole('region', { name: '试用教学方法', exact: true })).toHaveCount(0);
}

test('详情挂载草稿与正式学伴都打开所选详情，关闭、返回和刷新不残留旧页面', async ({ page }) => {
  const found = errors(page);
  for (const [id, name] of [['draft-buddy', '草稿学伴'], ['ready-buddy', '已创建学伴']]) {
    await ownDetail(page);
    await page.getByRole('button', { name: '挂载到学伴', exact: true }).click();
    await page.getByRole('combobox', { name: '选择学伴', exact: true }).selectOption(id);
    await page.getByRole('button', { name: '已添加，查看学伴', exact: true }).click();
    await expect(page).toHaveURL(new RegExp(`#/${'companions'}/${id}(\\?|$)`));
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await page.goBack();
    await expect(page.getByRole('heading', { name: skill.name, exact: true })).toBeVisible();
    await page.goForward();
    await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    await topMenus(page);
  }
  expect(found).toEqual([]);
});

test('弹窗开启时浏览器返回关闭弹窗，前进和刷新后导航恢复', async ({ page }) => {
  const found = errors(page);
  for (const name of ['挂载到学伴', '发布到集市']) {
    await ownDetail(page);
    await page.getByRole('button', { name, exact: true }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL(/#\/workshop\?tab=created$/);
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('main')).toHaveCount(1);
    await page.goForward();
    await expect(page.getByRole('heading', { name: skill.name, exact: true })).toBeVisible();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await page.reload();
    await topMenus(page);
  }
  expect(found).toEqual([]);
});

test('同一详情反复打开发布与挂载弹窗、取消和 Escape，随后发布和撤下仍可跳转', async ({ page }) => {
  const found = errors(page);
  for (const button of ['挂载到学伴', '发布到集市']) {
    await ownDetail(page);
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('main')).toHaveCount(1);
    await page.getByRole('button', { name: button, exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: button === '发布到集市' ? '取消' : '关闭窗口', exact: true }).click();
    await topMenus(page);
  }
  await ownDetail(page);
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  await page.getByRole('button', { name: '确认发布', exact: true }).click();
  await expect(page).toHaveURL(/#\/market$/);
  await expect(page.locator('main')).toHaveCount(1);
  await page.getByRole('button', { name: '查看与试用', exact: true }).click();
  await expect(page.getByRole('region', { name: '试用教学方法', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '管理发布', exact: true }).click();
  await page.getByRole('button', { name: '查看集市', exact: true }).click();
  await expect(page).toHaveURL(/#\/market$/);
  await expect(page.locator('main')).toHaveCount(1);
  await page.getByRole('button', { name: '查看与试用', exact: true }).click();
  await page.getByRole('button', { name: '管理发布', exact: true }).click();
  await page.getByRole('button', { name: '从集市撤下', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('main')).toHaveCount(1);
  await page.getByRole('button', { name: '返回集市', exact: true }).click();
  await expect(page.locator('.market-resource-card')).toHaveCount(0);
  await topMenus(page);
  expect(found).toEqual([]);
});

test('主要页面、详情、创建和检验之间顶栏跳转畅通，失效地址有返回入口', async ({ page }) => {
  const found = errors(page);
  for (const hash of ['home', 'market', 'workshop?tab=created', 'companions', 'companions/ready-buddy', 'companions/draft-buddy/edit',
    `skill/${entryId}?return=${encodeURIComponent('#/workshop?tab=created')}`, 'create/audit-owner', 'assistant/audit-owner/test',
    'assistant/audit-owner/student-preview?from=test', 'skill/missing', 'companions/missing', 'assistant/missing/test', '%E0%A4%A']) {
    await page.goto(`/#/${hash}`);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.locator('main')).toBeVisible();
    await topMenus(page);
  }
  await page.goto('/#/companions/missing');
  await page.getByRole('button', { name: '返回我的学伴', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions$/);
  await page.goto('/#/skill/missing');
  await page.getByRole('button', { name: '返回集市', exact: true }).click();
  await expect(page).toHaveURL(/#\/market$/);
  expect(found).toEqual([]);
});

test('学伴自动保存失败时顶栏和浏览器返回保留输入，保存重试成功后离开', async ({ page }) => {
  const found = errors(page);
  await page.goto('/#/home');
  await page.getByRole('button', { name: '我的学伴', exact: true }).click();
  await page.locator('.companion-card').filter({ hasText: '草稿学伴' }).getByRole('button', { name: '继续创建', exact: true }).click();
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (k, value) { if (k === key) throw new DOMException('quota', 'QuotaExceededError'); original.call(this, k, value); };
  }, companionsKey);
  await page.getByRole('textbox', { name: '学伴简介', exact: true }).fill('保留这次修改');
  await page.getByRole('button', { name: '首页', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('还有未保存的修改');
  await page.getByRole('button', { name: '继续编辑', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '学伴简介', exact: true })).toHaveValue('保留这次修改');
  const traversed = page.evaluate(() => new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true })));
  await page.goBack();
  await traversed;
  await expect(page.getByRole('textbox', { name: '学伴简介', exact: true })).toHaveValue('保留这次修改');
  await page.goBack();
  await expect(page.getByRole('dialog')).toContainText('还有未保存的修改');
  await page.getByRole('button', { name: '保存后离开', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('保存仍未成功');
  await page.evaluate(() => (window as unknown as { restoreWrite: () => void }).restoreWrite());
  await page.getByRole('button', { name: '保存后离开', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions$/);
  await page.locator('.companion-card').filter({ hasText: '草稿学伴' }).getByRole('button', { name: '继续创建', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '学伴简介', exact: true })).toHaveValue('保留这次修改');
  await topMenus(page);
  expect(found).toEqual([]);
});
