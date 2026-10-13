import { test, expect, type Page } from './workspace-fixture';
import { previewStorageKey } from '../src/features/execution/preview-runtime';
import { primaryTeacherId } from '../shared/local-accounts';
import { applyCompanionCase } from '../shared/companion-cases';
import { companionsKey, newCompanion, type LearningCompanion } from '../shared/learning-companion';

// 内置案例仅在隔离资料中使用，不读写用户正在登录的浏览器状态。
const caseCompanion: LearningCompanion = { ...applyCompanionCase(newCompanion('case-buddy'), 'fraction-error-review'), status: 'ready', step: 4 };
// 1×1 PNG，仅用于触发“自定义头像”改动。
const tinyPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
const caseName = '分数错因学伴';
const turnInput = [
  '老师，1/2 + 1/3 我算出来是 2/5，对吗？',
  '我把分子加起来 1+1=2，分母加起来 2+3=5，所以是 2/5。',
  '它们不一样，2 份和 3 份不同，要先通分。',
];
type Box = { x: number; y: number; width: number; height: number };
function overlaps(a: Box, b: Box) {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}
async function seedCaseCompanion(page: Page, item: LearningCompanion = caseCompanion) {
  await page.addInitScript(({ key, value }) => {
    if (localStorage.getItem('companion-practice-seeded')) return;
    localStorage.setItem(key, JSON.stringify([value]));
    localStorage.setItem('companion-practice-seeded', 'true');
  }, { key: companionsKey, value: item });
}
function input(page: Page) { return page.getByRole('textbox', { name: '以学生身份输入', exact: true }); }
async function startPractice(page: Page, id = 'case-buddy') {
  await page.goto(`/#/companions/${id}/practice`);
  await expect(page.getByRole('heading', { name: '分数错因学伴', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '开始试运行', exact: true }).click();
  await expect(input(page)).toBeVisible();
}
async function send(page: Page, text: string) {
  await input(page).fill(text);
  await page.getByRole('button', { name: '发送', exact: true }).click();
}
async function blockPracticeWrites(page: Page) {
  await page.evaluate(key => {
    const write = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('full', 'QuotaExceededError');
      write.call(this, name, value);
    };
  }, previewStorageKey(primaryTeacherId));
}
async function restorePracticeWrites(page: Page) {
  await page.evaluate(() => (window as unknown as { restoreWrite: () => void }).restoreWrite());
}

test('空账号用内置案例创建学伴，详情进入独立试运行页并完成案例对话', async ({ page }, info) => {
  test.setTimeout(90000);
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (request.url().includes('/api/')) requests.push(request.url()); });

  await page.goto('/#/companions/case-buddy/edit');
  await expect(page.getByRole('heading', { name: '创建我的学伴', exact: true })).toBeVisible();
  await expect(page.getByRole('combobox', { name: '案例', exact: true })).toHaveValue('fraction-error-review');
  await page.getByRole('button', { name: '填入案例', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '学伴名称', exact: true })).toHaveValue(caseName);
  await page.getByRole('button', { name: '下一步：选择教学方法', exact: true }).click();
  await expect(page.locator('.companion-case-skill')).toContainText('案例配套方法 · 仅用于试运行');
  await expect(page.locator('.companion-case-skill').getByRole('checkbox')).toBeChecked();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '学习任务与目标', exact: true })).toHaveValue(/1\/2 \+ 1\/3/);
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await expect(page.getByRole('complementary', { name: '学伴预览' })).toContainText('分数错因追问');
  await page.getByRole('button', { name: '创建学伴', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/case-buddy$/);
  await expect(page.getByRole('heading', { name: '学伴试运行', exact: true })).toBeVisible();
  for (const width of [1440, 768, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 900 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const detailBack = await page.locator('.companion-overview-heading .back-link').boundingBox();
    const detailTitle = await page.locator('.companion-overview-heading .companion-overview-profile').boundingBox();
    expect(detailBack, '详情返回按钮应可见').not.toBeNull();
    expect(detailTitle, '详情标题区域应可见').not.toBeNull();
    expect(overlaps(detailBack!, detailTitle!), '详情返回按钮与标题区域不应重叠').toBe(false);
    const detailActions = await page.locator('.companion-overview-actions').boundingBox();
    expect(overlaps(detailActions!, detailTitle!), '详情操作组不能覆盖标题').toBe(false);
  }
  await page.setViewportSize({ width: 1440, height: 1000 });

  await page.screenshot({ path: info.outputPath('companion-detail-desktop.png'), fullPage: true, animations: 'disabled' });

  // 案例配套方法不写入个人 SKILL，也不进入集市。
  const skills = await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'));
  expect(skills ?? '').not.toContain('分数错因追问');
  await page.goto('/#/market');
  await expect(page.locator('.market-resource-card')).toHaveCount(0);

  await page.goto('/#/companions/case-buddy');
  await page.getByRole('button', { name: '开始试运行', exact: true }).click();
  await expect(page).toHaveURL(/companions\/case-buddy\/practice/);
  await expect(page.getByRole('combobox', { name: '学习对象', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: '开始试运行', exact: true }).click();
  await expect(input(page)).toHaveValue(turnInput[0]);
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.locator('.companion-chat-log')).toContainText('先别急着看答案');
  await expect(page.locator('.companion-chat-message').first()).toContainText('学生');
  await page.locator('.companion-chat-trace > summary').click();
  await expect(page.locator('.companion-chat-trace')).toContainText('选择第 1 步');

  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('companion-practice-desktop.png'), fullPage: true });
  for (const width of [1440, 768, 640, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    const studentBubble = await page.locator('.companion-chat-message[data-role="user"] .companion-chat-bubble').first().boundingBox();
    const companionBubble = await page.locator('.companion-chat-message[data-role="assistant"] .companion-chat-bubble').first().boundingBox();
    expect(studentBubble, '学生对话气泡应可见').not.toBeNull();
    expect(companionBubble, '学伴对话气泡应可见').not.toBeNull();
    expect(studentBubble!.x, '新版试运行保留学生右侧、学伴左侧的对话').toBeGreaterThan(companionBubble!.x);
    const back = await page.locator('.companion-practice-heading .back-link').boundingBox();
    const identity = await page.locator('.companion-practice-heading .companion-practice-identity').boundingBox();
    const actions = await page.locator('.companion-practice-heading .companion-practice-actions').boundingBox();
    expect(back, '返回按钮应可见').not.toBeNull();
    expect(identity, '学伴标题应可见').not.toBeNull();
    expect(actions, '试运行操作应可见').not.toBeNull();
    expect(overlaps(back!, identity!), '返回按钮与学伴标题不应重叠').toBe(false);
    expect(overlaps(back!, actions!), '返回按钮与操作按钮不应重叠').toBe(false);
    expect(overlaps(identity!, actions!), '学伴标题与操作按钮不应重叠').toBe(false);
  }
  await page.screenshot({ path: info.outputPath('companion-practice-mobile.png'), fullPage: true });
  expect(requests).toEqual([]); expect(errors).toEqual([]);
});

test('Enter 发送、Shift+Enter 换行、IME 组合不发送，发送中锁定输入，失败保留输入可重试', async ({ page }) => {
  await seedCaseCompanion(page);
  await startPractice(page);
  await expect(input(page)).toHaveValue(turnInput[0]);

  await input(page).click();
  await page.keyboard.press('Enter');
  await expect(page.locator('.companion-chat-log')).toContainText('先别急着看答案');
  await expect(input(page)).toHaveValue('');

  await input(page).fill('我把分子加起来');
  await input(page).press('Shift+Enter');
  expect((await input(page).inputValue()).includes('\n')).toBe(true);
  await expect(page.locator('.companion-chat-message')).toHaveCount(2);

  // 中文输入法组合中的 Enter 不发送：用 CDP 合成真实的组合输入状态。
  const cdp = await page.context().newCDPSession(page);
  await input(page).click();
  await cdp.send('Input.imeSetComposition', { text: '我把分子加起来', selectionStart: 6, selectionEnd: 6 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await cdp.send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Enter', code: 'Enter', windowsVirtualKeyCode: 13, nativeVirtualKeyCode: 13 });
  await expect(page.locator('.companion-chat-message')).toHaveCount(2);

  await input(page).fill(turnInput[1]);
  // 闸门挂在预览运行时返回的会话克隆上，用于稳定观察发送过程中的只读状态。
  await page.evaluate(() => {
    const original = window.structuredClone.bind(window);
    let armed = true, release: (() => void) | null = null;
    (window as unknown as { releaseGate: () => void }).releaseGate = () => release?.();
    window.structuredClone = ((value: unknown) => {
      const target = value as { trialId?: unknown; messages?: unknown } | null;
      if (!armed || !target || typeof target !== 'object' || typeof target.trialId !== 'string' || !Array.isArray(target.messages))
        return original(value);
      armed = false;
      return new Promise(resolve => { release = () => resolve(original(value)); });
    }) as typeof structuredClone;
  });
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(input(page)).toBeDisabled();
  await expect(page.getByRole('button', { name: '正在回复…', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toContainText('学伴正在回复');
  await page.evaluate(() => (window as unknown as { releaseGate: () => void }).releaseGate());
  await expect(page.locator('.companion-chat-log')).toContainText('你已经说出了自己的算法');
  await expect(page.locator('.companion-chat-message')).toHaveCount(4);

  await input(page).fill(turnInput[2]);
  await blockPracticeWrites(page);
  await page.getByRole('button', { name: '发送', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('记录未保存');
  await expect(input(page)).toHaveValue(turnInput[2]);
  await expect(page.locator('.companion-chat-message')).toHaveCount(4);
  await restorePracticeWrites(page);
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await expect(page.locator('.companion-chat-log')).toContainText('要先通分成相同的分母');

  await page.reload();
  await expect(page.locator('.companion-chat-log')).toContainText('要先通分成相同的分母');
  await expect(page.locator('.companion-chat-message')).toHaveCount(6);
});

test('结束试运行后只读，新对话与历史记录保留旧对话', async ({ page }) => {
  await seedCaseCompanion(page);
  await startPractice(page);
  await send(page, turnInput[0]);
  await expect(page.locator('.companion-chat-log')).toContainText('先别急着看答案');

  await page.getByRole('button', { name: '结束试运行', exact: true }).click();
  await expect(input(page)).toHaveCount(0);
  await expect(page.locator('.companion-practice-chat')).toContainText('本次对话已结束');
  await expect(page.getByRole('button', { name: '结束试运行', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '新对话', exact: true }).click();
  await expect(input(page)).toHaveValue(turnInput[0]);
  await expect(page.locator('.companion-chat-message')).toHaveCount(0);
  const history = page.getByRole('combobox', { name: '历史记录', exact: true });
  await expect(history).toBeVisible();
  await history.selectOption({ index: 1 });
  await expect(page.locator('.companion-chat-log')).toContainText('先别急着看答案');
  await expect(input(page)).toHaveCount(0);
});

test('案例填入可取消覆盖，复制为独立草稿且不写入我的教学方法，手改任务后新对话按新任务引导', async ({ page }) => {
  test.setTimeout(90000);
  await page.goto('/#/companions/case-edit/edit');
  await page.getByRole('textbox', { name: '学伴名称', exact: true }).fill('我自己起的名字');
  await page.getByRole('button', { name: '填入案例', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('用案例覆盖当前填写？');
  await page.getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '学伴名称', exact: true })).toHaveValue('我自己起的名字');
  await page.getByRole('button', { name: '填入案例', exact: true }).click();
  await page.getByRole('button', { name: '确认覆盖并填入', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '学伴名称', exact: true })).toHaveValue(caseName);
  await page.getByRole('button', { name: '下一步：选择教学方法', exact: true }).click();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await page.getByRole('button', { name: '创建学伴', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/case-edit$/);

  const before = await page.evaluate(key => localStorage.getItem(key), companionsKey);
  await page.goto('/#/companions');
  await page.locator('[data-companion-id="case-edit"]').getByRole('button', { name: '复制', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('已复制为草稿');
  await expect(page.locator('.companion-card')).toHaveCount(2);
  const after = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!), companionsKey);
  expect(after.find((item: LearningCompanion) => item.id === 'case-edit')).toEqual(JSON.parse(before!)[0]);
  expect(after.filter((item: LearningCompanion) => item.id !== 'case-edit')[0].status).toBe('draft');
  expect((await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'))) ?? '').not.toContain('分数错因追问');

  await page.goto('/#/companions/case-edit/edit');
  await page.getByRole('button', { name: '下一步：选择教学方法', exact: true }).click();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await page.getByRole('textbox', { name: '学习任务与目标', exact: true }).fill('用身边的例子说明什么是通分。');
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await page.getByRole('button', { name: '保存学伴', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/case-edit$/);
  await page.getByRole('button', { name: '开始试运行', exact: true }).click();
  await page.getByRole('button', { name: '开始试运行', exact: true }).click();
  await expect(input(page)).toHaveValue(/学习任务：用身边的例子说明什么是通分。/);
  await page.locator('.practice-suggestions > summary').click();
  await expect(page.locator('.practice-suggestions')).not.toContainText(turnInput[0]);
});

test('不完整草稿的试运行入口保持关闭并提示缺失字段', async ({ page }) => {
  const draft: LearningCompanion = { ...caseCompanion, id: 'draft-buddy', name: '半成品学伴', introduction: '',
    status: 'draft', step: 1, task: { audience: '', scenario: '', taskAndGoals: '' } };
  await seedCaseCompanion(page, draft);
  await page.goto('/#/companions/draft-buddy/practice');
  await expect(page.locator('.execution-method-gate')).toContainText('请填写学伴简介。');
  await expect(page.locator('.execution-method-gate').getByRole('button', { name: '完善学伴信息', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '开始试运行', exact: true })).toBeDisabled();
  await expect(page.locator('.companion-practice-chat')).toContainText('请先完成上方提示，再开始试运行。');
  const stored = await page.evaluate(key => localStorage.getItem(key), previewStorageKey(primaryTeacherId));
  expect(stored === null || JSON.parse(stored).trials.length === 0).toBe(true);
});

test('只填年级或只上传头像也要先确认覆盖案例，取消后保留输入', async ({ page }) => {
  await page.goto('/#/companions/case-year/edit');
  const year = page.getByRole('combobox', { name: '适用年级（可选）', exact: true });
  await year.selectOption('七年级');
  await page.getByRole('button', { name: '填入案例', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('用案例覆盖当前填写？');
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  await expect(page.getByRole('textbox', { name: '学伴名称', exact: true })).toHaveValue('');
  await expect(year).toHaveValue('七年级');

  await page.goto('/#/companions/case-avatar/edit');
  await page.getByLabel('上传学伴形象', { exact: true }).setInputFiles({ name: '头像.png', mimeType: 'image/png', buffer: tinyPng });
  const custom = page.getByRole('button', { name: '自定义上传学伴形象', exact: true });
  await expect(custom).toHaveAttribute('data-selected', 'true');
  await page.getByRole('button', { name: '填入案例', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('用案例覆盖当前填写？');
  await page.getByRole('dialog').getByRole('button', { name: '取消', exact: true }).click();
  await expect(custom).toHaveAttribute('data-selected', 'true');
  await expect(page.getByRole('textbox', { name: '学伴名称', exact: true })).toHaveValue('');
});
