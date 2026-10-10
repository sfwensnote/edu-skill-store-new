import { test, expect, type Page } from '@playwright/test';
import { accountSessionKey, accountsKey } from '../shared/local-accounts';
import { skillResetKey } from '../shared/skill-reset';
import { initialMine } from '../src/data/platform';

async function login(page: Page, account = 'teacher', password = 'teacher123') {
  await page.getByLabel('账号', { exact: true }).fill(account);
  await page.getByLabel('密码', { exact: true }).fill(password);
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('button', { name: '正在处理…', exact: true })).toHaveCount(0);
}
async function logout(page: Page) {
  await page.getByRole('button', { name: '打开账号菜单' }).click();
  await page.getByRole('menuitem', { name: '退出登录' }).click();
  await expect(page.getByRole('heading', { name: '登录教学工坊' })).toBeVisible();
}
async function createAndPublish(page: Page) {
  await page.getByRole('button', { name: '创建', exact: true }).click();
  await page.getByLabel('教学想法').fill('学生阅读时只有判断，没有引用原文。');
  await page.getByLabel('教学分类', { exact: true }).selectOption('课堂提问');
  await page.getByRole('checkbox', { name: '标签 证据追问', exact: true }).check();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  for (const [label, value] of [['SKILL 名称', '阅读证据追问'], ['SKILL 简介', '引导学生引用原文支持观点'], ['结束条件', '学生能说明证据如何支持判断后结束'], ['希望学生达到', '用原文支持判断'], ['什么时候开始', '学生只表达观点']]) {
    await page.getByRole('button', { name: `编辑${label}`, exact: true }).click();
    await page.getByRole('textbox', { name: label, exact: true }).fill(value);
  }
  await page.getByRole('button', { name: '补充一种情况和做法', exact: true }).click();
  for (const [label, value] of [['情况 1', '学生只有观点没有依据'], ['做法 1', '追问原文依据']]) {
    await page.getByRole('button', { name: `编辑${label}`, exact: true }).click();
    await page.getByRole('textbox', { name: label, exact: true }).fill(value);
  }
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await page.getByRole('button', { name: '学生视角预览', exact: true }).click();
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  await expect(page.locator('.market-resource-card')).toHaveCount(1);
}
test('教师登录校验密码，刷新后身份保留，菜单没有管理员入口', async ({ page }, info) => {
  await page.goto('/#/home');
  await expect(page.getByRole('heading', { name: '登录教学工坊' })).toBeVisible();
  await login(page, 'teacher', 'wrong123');
  await expect(page.getByRole('alert')).toContainText('账号或密码不正确');
  await login(page);
  await expect(page.getByRole('heading', { name: '教学工坊', exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: '打开账号菜单' })).toHaveAttribute('title', '教师（教师）');
  await page.getByRole('button', { name: '打开账号菜单' }).click();
  await expect(page.getByRole('menuitem', { name: '账号管理' })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('teacher-home.png'), fullPage: true });
  await logout(page);
  expect(await page.evaluate(key => sessionStorage.getItem(key), accountSessionKey)).toBeNull();
});
test('教师完整创建并发布，另一教师只读添加；退出和刷新保留各自资料', async ({ page }) => {
  await page.goto('/#/home'); await login(page); await createAndPublish(page);
  await logout(page);
  await page.getByRole('button', { name: '注册教师账号', exact: true }).click();
  await page.getByLabel('姓名', { exact: true }).fill('李老师');
  await page.getByLabel('账号', { exact: true }).fill('teacher2');
  await page.getByLabel('密码', { exact: true }).fill('teacher234');
  await page.getByRole('button', { name: '注册并登录', exact: true }).click();
  await expect(page.getByRole('button', { name: '打开账号菜单' })).toHaveAttribute('title', '李老师（教师）');
  await page.getByRole('button', { name: '我的 SKILL', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(0);
  await page.getByRole('button', { name: '教学 SKILL 集市', exact: true }).click();
  await expect(page.locator('.market-resource-card')).toHaveCount(1);
  await page.getByRole('button', { name: '查看与试用', exact: true }).click();
  await expect(page.getByRole('button', { name: /编辑|复制|发布到集市/ })).toHaveCount(0);
  await page.getByRole('button', { name: '添加到我的 SKILL', exact: true }).click();
  await page.goto('/#/workshop?tab=added');
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.reload(); await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.goto('/#/workshop?tab=created'); await expect(page.locator('.workshop-item')).toHaveCount(0);
  await logout(page); await login(page);
  await page.goto('/#/workshop?tab=created'); await expect(page.locator('.workshop-item')).toHaveCount(1);
  await page.goto('/#/workshop?tab=added'); await expect(page.locator('.workshop-item')).toHaveCount(0);
  await page.reload(); await expect(page.locator('.workshop-item')).toHaveCount(0);
});
test('管理员停用使已登录教师退出，启用后原有 SKILL 保留', async ({ page, context }, info) => {
  await page.goto('/#/home'); await login(page); await createAndPublish(page);
  const adminPage = await context.newPage(); await adminPage.goto('/#/home');
  await login(adminPage, 'admin', 'admin123');
  await adminPage.getByRole('button', { name: '打开账号菜单' }).click();
  await adminPage.getByRole('menuitem', { name: '账号管理' }).click();
  await expect(adminPage.getByRole('dialog')).toContainText('teacher');
  await adminPage.getByRole('button', { name: '停用', exact: true }).click();
  await expect(adminPage.getByRole('dialog')).toContainText('已停用');
  await expect(page.getByRole('heading', { name: '登录教学工坊' })).toBeVisible();
  await login(page); await expect(page.getByRole('alert')).toContainText('已停用');
  await adminPage.setViewportSize({ width: 1440, height: 1000 });
  await adminPage.screenshot({ path: info.outputPath('admin-accounts.png'), fullPage: true });
  await adminPage.getByRole('button', { name: '启用', exact: true }).click();
  await login(page); await page.goto('/#/workshop?tab=created');
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await expect(page.locator('.workshop-item')).toContainText('阅读证据追问');
});
test('登录状态写入失败时保留输入，不假报成功，恢复存储后可重试', async ({ page }) => {
  await page.addInitScript(key => {
    const setItem = Storage.prototype.setItem;
    (window as any).restoreLoginStorage = () => { Storage.prototype.setItem = setItem; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('存储写入被阻止', 'QuotaExceededError');
      return setItem.call(this, name, value);
    };
  }, accountSessionKey);
  await page.goto('/#/home'); await login(page);
  await expect(page.getByRole('heading', { name: '登录教学工坊' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('存储写入被阻止');
  await expect(page.getByLabel('账号', { exact: true })).toHaveValue('teacher');
  expect(await page.evaluate(key => sessionStorage.getItem(key), accountSessionKey)).toBeNull();
  await page.evaluate(() => (window as any).restoreLoginStorage());
  await page.getByRole('button', { name: '登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教学工坊', exact: true })).toBeVisible();
});
test('首个教师保留上一版清理后已有方法，注册账号没有继承这些内容', async ({ page }) => {
  await page.addInitScript(({ marker, owners }) => {
    if (localStorage.getItem('legacy-account-fixture')) return;
    localStorage.setItem(marker, 'done');
    localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify(owners));
    localStorage.setItem('legacy-account-fixture', 'done');
  }, { marker: skillResetKey, owners: initialMine.slice(0, 1) });
  await page.goto('/#/workshop'); await login(page);
  await expect(page.locator('.workshop-item')).not.toHaveCount(0);
  await logout(page); await page.getByRole('button', { name: '注册教师账号', exact: true }).click();
  await page.getByLabel('姓名', { exact: true }).fill('新教师');
  await page.getByLabel('账号', { exact: true }).fill('newteacher');
  await page.getByLabel('密码', { exact: true }).fill('newteacher123');
  await page.getByRole('button', { name: '注册并登录', exact: true }).click();
  await expect(page.getByRole('button', { name: '打开账号菜单' })).toHaveAttribute('title', '新教师（教师）');
  await page.goto('/#/workshop'); await expect(page.locator('.workshop-item')).toHaveCount(0);
  const accounts = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!).accounts, accountsKey);
  expect(accounts.find((a: any) => a.login === 'newteacher').role).toBe('teacher');
});
test('登录、注册和管理员菜单在手机可操作且无横向溢出', async ({ page }, info) => {
  await page.setViewportSize({ width: 390, height: 844 }); await page.goto('/#/home');
  await page.screenshot({ path: info.outputPath('login-mobile.png'), fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: '注册教师账号', exact: true }).click();
  await page.getByLabel('姓名', { exact: true }).fill('王老师');
  await page.getByLabel('账号', { exact: true }).fill('teacher');
  await page.getByLabel('密码', { exact: true }).fill('different123');
  await page.getByRole('button', { name: '注册并登录', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('已注册');
  await page.getByRole('button', { name: '返回登录', exact: true }).click();
  await login(page, 'admin', 'admin123');
  await page.getByRole('button', { name: '打开账号菜单' }).click();
  await page.getByRole('menuitem', { name: '账号管理' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
