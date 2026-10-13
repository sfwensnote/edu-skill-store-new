import { test, expect, type Page } from './workspace-fixture';
import { applyCompanionCase } from '../shared/companion-cases';
import { companionsKey, newCompanion } from '../shared/learning-companion';
import { primaryTeacherId } from '../shared/local-accounts';
import { previewStorageKey } from '../src/features/execution/preview-runtime';

async function openCase(page: Page) {
  const companion = { ...applyCompanionCase(newCompanion('run-report-buddy'), 'fraction-error-review'), status: 'ready', step: 4 };
  await page.addInitScript(({ key, companion }) => {
    if (!localStorage.getItem('run-report-seeded')) {
      localStorage.setItem(key, JSON.stringify([companion]));
      localStorage.setItem('run-report-seeded', 'true');
    }
  }, { key: companionsKey, companion });
  await page.goto('/#/companions/run-report-buddy');
  await page.locator('.companion-overview-heading').getByRole('button', { name: '运行', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
}

test('运行时长与发布保存失败保护，成功后进入对应报告且刷新可恢复', async ({ page }) => {
  await openCase(page);
  const dialog = page.getByRole('dialog');
  const hours = dialog.getByRole('spinbutton', { name: /运行时长/ });
  await hours.fill('24');
  const key = previewStorageKey(primaryTeacherId);
  await page.evaluate(key => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreRunWrite: () => void }).restoreRunWrite = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('full', 'QuotaExceededError');
      original.call(this, name, value);
    };
  }, key);
  await dialog.getByRole('button', { name: /^(确认)?发布(运行)?$/ }).click();
  await expect(dialog.getByRole('alert')).toBeVisible();
  await expect(hours).toHaveValue('24');
  await expect(page).not.toHaveURL(/\/report/);
  await page.evaluate(() => (window as unknown as { restoreRunWrite: () => void }).restoreRunWrite());
  await dialog.getByRole('button', { name: /^(确认)?发布(运行)?$/ }).click();
  await expect(page).toHaveURL(/companions\/run-report-buddy\/report\?run=/);
  await expect(page.getByRole('heading', { name: '运行报告', exact: true })).toBeVisible();
  const snapshot = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}'), key);
  expect(snapshot.trials).toHaveLength(1);
  expect(Date.parse(snapshot.trials[0].expiresAt) - Date.parse(snapshot.trials[0].createdAt)).toBe(24 * 3600000);
  await page.reload();
  await expect(page.getByRole('heading', { name: '运行报告', exact: true })).toBeVisible();
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.getByRole('button', { name: /返回.*学伴/ }).click();
  await expect(page).toHaveURL(/companions\/run-report-buddy$/);
});

test('运行报告不混入试运行，运行记录可筛选、查看原文与下载', async ({ page }, info) => {
  const requests: string[] = [];
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await openCase(page);
  await page.getByRole('dialog').getByRole('button', { name: /^(确认)?发布(运行)?$/ }).click();
  await expect(page.getByRole('heading', { name: '运行报告', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '开始试运行', exact: true }).click();
  await expect(page).toHaveURL(/companions\/run-report-buddy\/practice/);
  await page.getByRole('button', { name: '开始试运行', exact: true }).click();
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.companion-chat-log')).toContainText('先别急着看答案');
  await page.getByRole('button', { name: '返回运行报告', exact: true }).click();
  await expect(page.getByRole('heading', { name: '运行报告', exact: true })).toBeVisible();
  const table = page.getByRole('table', { name: '对话记录' });
  await expect(table.getByRole('button', { name: '查看对话', exact: true })).toHaveCount(0);
  // 隔离资料中装入一场运行对话，验证报告原文功能；试运行资料保持原归属。
  await page.evaluate(key => {
    const data = JSON.parse(localStorage.getItem(key)!);
    const run = data.trials.find((trial: { purpose: string }) => trial.purpose === 'run');
    const practice = data.trials.find((trial: { purpose: string }) => trial.purpose === 'practice');
    if (run.status !== 'open' || practice.status !== 'open') throw new Error('运行和试运行不得互相关闭');
    const original = data.sessions.find((session: { trialId: string }) => session.trialId === practice.id);
    data.sessions.push({ ...original, id: crypto.randomUUID(), trialId: run.id, name: '运行对话记录' });
    localStorage.setItem(key, JSON.stringify(data));
  }, previewStorageKey(primaryTeacherId));
  await page.reload();
  await expect(table.getByRole('button', { name: '查看对话', exact: true })).toHaveCount(1);
  const search = page.getByLabel('搜索对话', { exact: true });
  await search.fill('不存在的记录');
  await expect(table.getByRole('button', { name: '查看对话', exact: true })).toHaveCount(0);
  await search.fill('');
  const searchGeometry = await page.locator('.run-records-filters label').evaluate(element => {
    const input = element.querySelector('input')!;
    const icon = element.querySelector('svg')!;
    return { textStart: input.getBoundingClientRect().left + parseFloat(getComputedStyle(input).paddingLeft), iconEnd: icon.getBoundingClientRect().right };
  });
  expect(searchGeometry.textStart - searchGeometry.iconEnd).toBeGreaterThanOrEqual(6);
  const trigger = table.getByRole('button', { name: '查看对话', exact: true });
  await trigger.click();
  await expect(page.getByRole('dialog')).toContainText('先别急着看答案');
  await page.keyboard.press('Escape');
  await expect(trigger).toBeFocused();
  await page.reload();
  await expect(table.getByRole('button', { name: '查看对话', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: '再次运行', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '发布运行', exact: true }).click();
  const runs = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '{}').trials.filter((trial: { purpose: string }) => trial.purpose === 'run'), previewStorageKey(primaryTeacherId));
  const recordSelector = page.getByRole('combobox', { name: '运行记录', exact: true });
  await recordSelector.selectOption(runs[1].id);
  await expect(page).toHaveURL(new RegExp(`run=${encodeURIComponent(runs[1].id)}`));
  await page.reload();
  await expect(table.getByRole('button', { name: '查看对话', exact: true })).toHaveCount(1);
  await recordSelector.selectOption(runs[0].id);
  await expect(table.getByRole('button', { name: '查看对话', exact: true })).toHaveCount(0);
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载报告', exact: true }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toMatch(/报告/);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.screenshot({ path: info.outputPath('run-report-desktop.png'), fullPage: true, animations: 'disabled' });
  for (const width of [1440, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: info.outputPath('run-report-mobile.png'), fullPage: true, animations: 'disabled' });
  expect(requests).toEqual([]);
});

test('失效运行不串到其他报告，时长校验与取消不创建运行', async ({ page }) => {
  await openCase(page);
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('spinbutton', { name: /运行时长/ }).fill('0');
  await expect(dialog.getByRole('button', { name: '发布运行' })).toBeDisabled();
  await dialog.getByRole('button', { name: '取消', exact: true }).click();
  await page.goto('/#/companions/run-report-buddy/report?run=invalid-record');
  await expect(page.getByRole('alert')).toContainText('不存在或不属于当前学伴');
  await expect(page.getByRole('table', { name: '对话记录' })).toHaveCount(0);
  await page.goto('/#/companions/run-report-buddy/report');
  await expect(page.getByRole('table', { name: '对话记录' })).toContainText('还没有对话记录');
  await expect(page.getByRole('button', { name: '下载报告', exact: true })).toBeDisabled();
});

test('结束运行需确认，保存失败保留运行，成功不影响试运行历史', async ({ page }) => {
  await openCase(page);
  await page.getByRole('dialog').getByRole('button', { name: '发布运行', exact: true }).click();
  await page.getByRole('button', { name: '结束运行', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('button', { name: '结束运行', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '结束运行', exact: true }).click();
  const key = previewStorageKey(primaryTeacherId);
  await page.evaluate(key => { const original = Storage.prototype.setItem;
    (window as unknown as { restoreStopWrite: () => void }).restoreStopWrite = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(name, value) { if (name === key) throw new DOMException('full', 'QuotaExceededError'); original.call(this, name, value); };
  }, key);
  await page.getByRole('dialog').getByRole('button', { name: '确认结束', exact: true }).click();
  await expect(page.getByRole('dialog').getByRole('alert')).toBeVisible();
  await page.evaluate(() => (window as unknown as { restoreStopWrite: () => void }).restoreStopWrite());
  await page.getByRole('dialog').getByRole('button', { name: '确认结束', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button', { name: '结束运行', exact: true })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('combobox', { name: '运行记录', exact: true })).toContainText('已结束');
});
