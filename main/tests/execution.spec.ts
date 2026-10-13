import { test, expect } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { packageTeachingMethod } from '../shared/teaching-method';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { newCompanion } from '../shared/learning-companion';
import { initialMine } from '../src/data/platform';
import { accountWorkspaceKey } from '../src/lib/account-workspace';
import { ownersStorageKey, companionsKey } from '../shared/workspace-keys';

const root = 'http://127.0.0.1:5186';
let server: ChildProcess;
let directory: string;
test.use({ baseURL: root });
test.beforeAll(async () => {
  directory = await mkdtemp(path.join(os.tmpdir(), 'execution-browser-'));
  server = spawn(process.execPath, ['--import', 'tsx', 'tests/execution-browser-server.ts'], {
    cwd: process.cwd(), env: { ...process.env, PORT: '5186', DATABASE_PATH: path.join(directory, 'test.sqlite'), VITE_SERVICE_MODE: 'server', VITE_API_BASE_URL: '', ENABLE_LEGACY_SEED: 'false' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let log = ''; server.stdout?.on('data', chunk => { log += String(chunk); }); server.stderr?.on('data', chunk => { log += String(chunk); });
  for (let attempt = 0; attempt < 100; attempt++) {
    try { if ((await fetch(`${root}/api/status`)).ok) return; } catch { /* 等待本地隔离服务。 */ }
    if (server.exitCode !== null) throw new Error(log);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`隔离服务未启动：${log}`);
});
test.afterAll(async () => {
  if (server?.exitCode === null) { server.kill('SIGTERM'); await new Promise(resolve => server.once('exit', resolve)); }
  if (directory) await rm(directory, { recursive: true, force: true });
});

test('教师真实身份 → 检测确认 → 挂载 → 学生受控试用 → 回收证据与教师评价', async ({ page, browser }, info) => {
  test.setTimeout(90000);
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: '注册教师账号', exact: true }).click();
  await page.getByRole('textbox', { name: '姓名', exact: true }).fill('验证教师');
  await page.getByRole('textbox', { name: '账号', exact: true }).fill('teacher-browser');
  await page.getByLabel('密码', { exact: true }).fill('browser-test-password');
  await page.getByRole('button', { name: '注册并登录', exact: true }).click();
  await expect(page.getByRole('heading', { name: /让每一份教学智慧，\s*都被看见。/ })).toBeVisible();
  await expect(page).toHaveURL(/#\/home/);
  const accountId = await page.evaluate(async () => {
    const token = sessionStorage.getItem('teaching-workshop.server-session');
    return (await (await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })).json()).user.id;
  });
  const skill = packageTeachingMethod(completeTeachingMethod({ name: '错因反思', teachingSteps: [{ condition: '学生第一次答错', action: '请学生说出解题思路' }], principles: ['第一次答错不要直接给答案'] }), 'reflect');
  const assistant = { ...initialMine[0], id: 'browser-method', name: skill.name, userId: accountId, skills: [skill], status: 'GENERATED' as const };
  const companion = { ...newCompanion('browser-companion'), name: '反思学伴', introduction: '一起检查解题思路',
    status: 'ready' as const, step: 4 as const, skillIds: [], task: { audience: '个别学生', scenario: '课后练习', taskAndGoals: '解释错误原因，完成练习。' } };
  // 测试准备使用真实工作区格式，正式用户不会自动得到样例。
  const serialized = JSON.stringify([assistant]);
  const companionSerialized = JSON.stringify([companion]);
  await page.evaluate(({ ownerKey, companionKey, serialized, companionSerialized }) => {
    localStorage.setItem(ownerKey, serialized); localStorage.setItem(companionKey, companionSerialized);
  }, { ownerKey: accountWorkspaceKey(accountId, ownersStorageKey), companionKey: accountWorkspaceKey(accountId, companionsKey), serialized, companionSerialized });
  await page.goto('/#/assistant/browser-method/test');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('方法检测');
  await page.getByRole('button', { name: '开始验证', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教师确认', exact: true })).toBeVisible();
  await expect(page.locator('.execution-case')).toHaveCount(6);
  await expect(page.getByRole('button', { name: '确认检测结果' })).toBeDisabled();
  await page.getByRole('checkbox', { name: '我已查看实际回复，执行符合我的教学方法。' }).check();
  await page.getByRole('button', { name: '确认检测结果' }).click();
  await expect(page.getByRole('status').filter({ hasText: '可将这项教学方法添加到学伴' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('real-detection.png'), fullPage: true });
  await page.goto('/#/workshop');
  await page.locator('.workshop-item').getByRole('button', { name: /更多操作/ }).click();
  await page.getByRole('menuitem', { name: '挂载到学伴', exact: true }).click();
  await expect(page.getByRole('button', { name: '确认挂载', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '确认挂载', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/browser-companion/);
  await expect(page.getByRole('heading', { name: '反思学伴', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '教师自行试用', exact: true }).click();
  await page.getByRole('textbox', { name: '你的问题', exact: true }).fill('我不知道错在哪里。');
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.execution-self-test')).toContainText('先说说你的解题思路。');
  await page.getByRole('button', { name: '生成学生试用链接', exact: true }).click();
  const link = await page.getByRole('textbox', { name: '学生试用链接', exact: true }).inputValue();
  const context = await browser.newContext(); const student = await context.newPage();
  await student.goto(link); await expect(student.getByRole('heading', { name: '学伴试用' })).toBeVisible();
  await student.getByRole('textbox', { name: '昵称', exact: true }).fill('学生甲');
  await student.getByRole('button', { name: '进入试用', exact: true }).click();
  await student.getByRole('textbox', { name: '你的问题', exact: true }).fill('我不知道错在哪里。');
  await student.getByRole('button', { name: '发送', exact: true }).click();
  await expect(student.locator('.execution-transcript')).toContainText('先说说你的解题思路。');
  await student.reload(); await expect(student.locator('.execution-transcript')).toContainText('先说说你的解题思路。');
  await page.getByRole('button', { name: '结束试用', exact: true }).click();
  await page.getByRole('button', { name: '生成回收报告', exact: true }).click();
  await expect(page.getByRole('region', { name: '回收报告', exact: true })).toContainText('1 位学生 · 1 轮学伴回复');
  await page.getByRole('button', { name: '查看对话证据', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('我不知道错在哪里。');
  await page.keyboard.press('Escape');
  await page.getByRole('textbox', { name: '核对意见', exact: true }).fill('补充练习任务后重新试用。');
  await page.getByRole('combobox', { name: '下一步', exact: true }).selectOption('adjust-scene');
  await page.getByRole('button', { name: '保存核对意见' }).click();
  await expect(page.getByRole('status').filter({ hasText: '已记录：调整学习场景' })).toBeVisible();
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('trial-report-mobile.png'), fullPage: true });
  await student.getByRole('textbox', { name: '你的问题', exact: true }).fill('再问一个问题。');
  await student.getByRole('button', { name: '发送', exact: true }).click();
  await expect(student.getByRole('alert')).toContainText('本次试用已经结束');
  await context.close(); expect(errors).toEqual([]);
});
