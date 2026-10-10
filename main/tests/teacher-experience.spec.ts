import { test, expect, type Page } from './market-catalog-fixture';
import { initialMine } from '../src/data/platform';
import { defaultCreationDraft, methodFromSkill } from '../shared/teaching-method';

const ownersKey = 'teaching-assistant.frontend-demo.v2';
async function edit(page: Page, label: string, value: string) {
  await page.getByRole('button', { name: `编辑${label}`, exact: true }).click();
  await page.getByRole('textbox', { name: label, exact: true }).fill(value);
}
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function noDemoLabels(page: Page) {
  await expect(page.locator('main')).not.toContainText(/demo|演示|预置|示例/i);
}

test('教师初学者：空的个人工作区，具体案例试用与添加各自独立，手机不溢出', async ({ page }, info) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().includes('/api/')) requests.push(request.url()); });
  await page.goto('/#/workshop?tab=created');
  await noDemoLabels(page);
  await expect(page.locator('.workshop-item')).toHaveCount(0);
  expect(await page.evaluate((key) => localStorage.getItem(key), ownersKey)).toBeNull();
  await page.goto('/#/market');
  await noDemoLabels(page);
  await page.locator('.market-resource-card').first().getByRole('button', { name: '查看与试用', exact: true }).click();
  await expect(page.getByRole('log')).toContainText('我算出 x=6');
  await noDemoLabels(page);
  await page.getByRole('button', { name: '查看模型回复', exact: true }).click();
  await expect(page.locator('.experience-turn').last()).toContainText('你是怎样得到 x=6 的');
  await noDemoLabels(page);
  expect(await page.evaluate((key) => localStorage.getItem(key), ownersKey)).toBeNull();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('market-preview-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 1440, height: 500 });
  await expect(page.locator('.skill-experience')).toHaveCSS('position', 'static');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: '我写成了 2x=9+3，再算出 x=6。', exact: true }).click();
  await noOverflow(page);
  const previewTop = await page.locator('.skill-experience').evaluate((node) => node.getBoundingClientRect().top + scrollY);
  const methodTop = await page.locator('.method-detail').evaluate((node) => node.getBoundingClientRect().top + scrollY);
  expect(previewTop).toBeLessThan(methodTop);
  await page.getByRole('button', { name: '重新试用', exact: true }).click();
  await page.getByRole('button', { name: '查看模型回复', exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('market-preview-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: '添加到我的 SKILL', exact: true }).click();
  await page.goto('/#/workshop?tab=created');
  await expect(page.locator('.workshop-item')).toHaveCount(0);
  await page.goto('/#/workshop?tab=added');
  await noDemoLabels(page);
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  await expect(page.getByRole('button', { name: '编辑', exact: true })).toHaveCount(0);
  await noOverflow(page);
  expect(errors).toEqual([]); expect(requests).toEqual([]);
});

test('资深教师：直接编辑语文方法，不回答六问也能检测、试用、发布，再修改撤销旧确认', async ({ page }, info) => {
  await page.goto('/#/create/experienced-teacher');
  await noDemoLabels(page);
  await page.getByLabel('教学想法').fill('学生阅读时只有判断没有证据，我会先追问原文依据。');
  await page.getByRole('combobox', { name: '学科', exact: true }).selectOption('语文');
  await page.getByLabel('教学分类', { exact: true }).selectOption('课堂提问');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  for (const [label, value] of [['SKILL 名称', '阅读证据追问'], ['希望学生达到', '用原文支持自己的判断'],
    ['什么时候开始', '学生只表达观点没有依据']]) await edit(page, label, value);
  await page.getByRole('button', { name: '补充一种情况和做法', exact: true }).click();
  await edit(page, '情况 1', '学生只表达观点'); await edit(page, '做法 1', '追问原文依据');
  await page.getByRole('button', { name: '补充一条原则', exact: true }).click();
  await edit(page, '原则 1', '不替学生寻找原文证据');
  await expect(page.locator('.question-top small')).toHaveText('1 / 6');
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page.locator('.simulation-line.assistant')).toContainText('判断依据');
  await expect(page.locator('.simulation-line.assistant')).not.toContainText('教师会');
  await noDemoLabels(page);
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await page.getByRole('button', { name: '学生视角预览', exact: true }).click();
  await page.getByLabel('以学生身份输入').fill('我觉得他很勇敢');
  await page.getByRole('button', { name: '发送学生问题', exact: true }).click();
  await expect(page.locator('.student-message').last()).toContainText('判断依据');
  await noDemoLabels(page);
  await page.getByRole('button', { name: '分享到集市', exact: true }).click();
  await expect(page.locator('.market-resource-card').filter({ hasText: '阅读证据追问' })).toHaveCount(1);
  await noDemoLabels(page);
  await page.screenshot({ path: info.outputPath('teacher-published-skill.png'), fullPage: true });
  await page.goto('/#/create/experienced-teacher?skill=method-experienced-teacher');
  await edit(page, '做法 1', '请学生概括证据和观点的关系');
  const state = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!)[0], ownersKey);
  expect(state.status).toBe('DRAFT'); expect(state.isPublic).toBe(false);
  await page.goto('/#/market');
  await expect(page.locator('.market-resource-card').filter({ hasText: '阅读证据追问' })).toHaveCount(0);
});

test('职前教师：按自己的备课想法完成六问，不混入数学答案或虚构教学效果', async ({ page }) => {
  await page.goto('/#/create/preservice-teacher');
  await page.getByLabel('教学想法').fill('我准备试讲朗读课，让学生比较不同停顿的含义。');
  await page.getByRole('combobox', { name: '学科', exact: true }).selectOption('语文');
  await page.getByLabel('教学分类', { exact: true }).selectOption('知识讲解');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await expect(page.getByLabel('你的回答')).toHaveValue('');
  for (const answer of ['理解停顿对句意的影响', '学生朗读时在不合适的位置停顿', '让学生标出停顿位置',
    '学生仍不理解句意', '比较两种停顿并解释意思', '不代替学生解释句意']) {
    await page.getByLabel('你的回答').fill(answer);
    await page.getByRole('button', { name: '提交', exact: true }).click();
  }
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page.locator('.simulation-line.assistant')).toContainText('停顿');
  await expect(page.locator('main')).not.toContainText(/3x|方程|100%|触发率|全部通过/);
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教学方法核对完成' })).toBeVisible();
  await noDemoLabels(page);
});

test('保存边界：检测修改遇到草稿缓存写入失败，旧输入保留且不覆盖新方法', async ({ page }) => {
  const assistant = { ...initialMine[0], id: 'cache-audit', revision: 2, status: 'GENERATED',
    isPublic: false, skills: [initialMine[0].skills[0]] };
  const key = 'teaching-assistant.method-draft.v1:cache-audit:reflect';
  const cache = { ...defaultCreationDraft(), sourceRevision: 2, stage: 'method', editingSkillId: 'reflect',
    method: methodFromSkill(assistant.skills[0]) };
  await page.addInitScript(({ assistant, cache, key }) => {
    if (localStorage.getItem('cache-audit-seeded')) return;
    localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([assistant]));
    localStorage.setItem(key, JSON.stringify(cache)); localStorage.setItem('cache-audit-seeded', '1');
  }, { assistant, cache, key });
  await page.goto('/#/assistant/cache-audit/test');
  const before = await page.evaluate((key) => localStorage.getItem(key), key);
  await page.evaluate((key) => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('配额不足', 'QuotaExceededError');
      write.call(this, name, value);
    };
  }, key);
  await page.getByRole('button', { name: '修改当前方法', exact: true }).click();
  await edit(page, '做法 1', '请学生指出原文证据');
  await page.getByRole('button', { name: '保存并重新核对', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(before);
  await page.goto('/#/create/cache-audit?skill=reflect');
  await expect(page.getByRole('button', { name: '编辑做法 1', exact: true })).toContainText('请学生指出原文证据');
});

test('失效的步骤与编辑链接不会冒用另一项方法；列表偏好写入失败仍可浏览', async ({ page }) => {
  await page.addInitScript((owners) => localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify(owners)), initialMine);
  for (const path of ['/#/create/assistant-demo-active?skill=missing',
    '/#/assistant/assistant-demo-active/student-preview?case=reflect:99&from=method']) {
    await page.goto(path);
    await expect(page.getByRole('button', { name: '返回我的 SKILL', exact: true })).toBeVisible();
    await expect(page.locator('.creation-flow,.student-chat')).toHaveCount(0);
  }
  await page.addInitScript(() => {
    const write = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (this === sessionStorage) throw new DOMException('不可写', 'SecurityError');
      write.call(this, key, value);
    };
  });
  const errors: string[] = []; page.on('pageerror', (error) => errors.push(error.message));
  for (const path of ['market', 'workshop']) {
    await page.goto(`/#/${path}`); await expect(page.locator('main')).toBeVisible(); await noOverflow(page);
  }
  expect(errors).toEqual([]);
});

test('损坏的个人资料不在启动时重写；后续保存先保留原始资料', async ({ page }) => {
  const raw = JSON.stringify([{ id: 'broken', teacherNotes: '仍需恢复的教师记录' }]);
  await page.addInitScript((raw) => {
    if (!localStorage.getItem('damaged-seeded')) {
      localStorage.setItem('teaching-assistant.frontend-demo.v2', raw); localStorage.setItem('damaged-seeded', '1');
    }
  }, raw);
  await page.goto('/#/workshop');
  expect(await page.evaluate((key) => localStorage.getItem(key), ownersKey)).toBe(raw);
  await page.goto('/#/create/recovered-new');
  const backups = await page.evaluate((key) => Object.keys(localStorage).filter((name) => name.startsWith(`${key}.recovery:`))
    .map((name) => localStorage.getItem(name)), ownersKey);
  expect(backups).toContain(raw);
});
