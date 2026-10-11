import { test, expect, type Page } from './workspace-fixture';
import { initialMine } from '../src/data/platform';
import { packageTeachingMethod } from '../shared/teaching-method';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { companionsKey, newCompanion } from '../shared/learning-companion';

const skill = packageTeachingMethod(completeTeachingMethod(), 'method');
const owner = { ...initialMine[0], id: 'buddy-owner', name: skill.name, skills: [skill], status: 'DRAFT' as const, revision: 1, isPublic: false };
const entryId = 'personal:buddy-owner:method';
test.beforeEach(async ({ page }) => {
  await page.addInitScript(value => {
    if (!localStorage.getItem('buddy-test-seeded')) {
      localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([value]));
      localStorage.setItem('buddy-test-seeded', 'true');
    }
  }, owner);
});
async function tasks(page: Page) {
  await page.getByRole('combobox', { name: '学习对象', exact: true }).selectOption('全班学生');
  await page.getByRole('combobox', { name: '学习情境', exact: true }).selectOption('课堂学习');
  await page.getByRole('textbox', { name: '学习任务与目标', exact: true }).fill('检查解题思路，说明每一步的理由');
}
async function basic(page: Page) {
  await page.getByRole('textbox', { name: '学伴名称', exact: true }).fill('数学学伴');
  await page.getByRole('textbox', { name: '学伴简介', exact: true }).fill('帮助学生检查解题思路');
  await page.getByRole('combobox', { name: '学科', exact: true }).selectOption('数学');
  await page.getByRole('combobox', { name: '适用年级（可选）', exact: true }).selectOption('七年级');
}
async function create(page: Page) {
  await page.goto('/#/companions/new-buddy/edit');
  await basic(page);
  await page.getByRole('button', { name: '下一步：选择 SKILL', exact: true }).click();
  await page.getByRole('checkbox', { name: /错因追问/ }).check();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await tasks(page);
}
async function finish(page: Page) {
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await expect(page.getByRole('heading', { name: '预览与保存', exact: true })).toBeVisible();
  await expect(page.getByRole('complementary', { name: '学伴预览' })).toBeVisible();
  await page.getByRole('button', { name: /^(创建学伴|保存学伴)$/ }).click();
}

test('草稿方法从详情检验，发布入口不会误入编辑；可发布和撤下', async ({ page }) => {
  await page.goto('/#/workshop');
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('发布前请完成方法检验');
  await page.getByRole('button', { name: '前往方法检验' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute('value', '0');
  await expect(page).toHaveURL(/buddy-owner\/test/);
  await page.getByRole('button', { name: '确认并完成' }).click();
  await page.goto('/#/workshop');
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  await page.getByRole('button', { name: '确认发布', exact: true }).click();
  await expect(page.locator('.market-resource-card')).toContainText('错因追问');
  await page.goto(`/#/skill/${entryId}`);
  await page.getByRole('button', { name: '管理发布' }).click();
  await page.getByRole('button', { name: '从集市撤下' }).click();
  await page.goto('/#/market');
  await expect(page.locator('.market-resource-card')).toHaveCount(0);
});

test('命名、选方法、填写任务、上传材料，普通活动创建后刷新保留且不增加 SKILL', async ({ page }, info) => {
  const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
  await create(page);
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('task-elements-desktop.png'), fullPage: true });
  await page.getByText('教学材料（选填）', { exact: true }).click();
  await page.getByLabel('上传教学材料').setInputFiles({ name: '课堂记录.txt', mimeType: 'text/plain', buffer: Buffer.from('学生把移项后的符号写错了。') });
  await expect(page.locator('.companion-files')).toContainText('课堂记录.txt');
  await page.reload();
  await expect(page.getByRole('textbox', { name: '学习任务与目标', exact: true })).toHaveValue('检查解题思路，说明每一步的理由');
  await finish(page);
  await expect(page).toHaveURL(/#\/companions\/new-buddy$/);
  await expect(page.locator('.companion-task-summary')).toContainText('检查解题思路，说明每一步的理由');
  await page.locator('summary').filter({ hasText: '学伴教学要求' }).click();
  await expect(page.locator('.companion-activity')).toContainText('学生把移项后的符号写错了。');
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: '下载材料' }).click();
  expect((await download).suggestedFilename()).toBe('课堂记录.txt');
  await page.reload(); await expect(page.getByRole('heading', { name: '数学学伴', exact: true })).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('companion-desktop.png'), fullPage: true });
  await page.goto('/#/workshop'); await expect(page.locator('.workshop-item')).toHaveCount(1);
  expect(errors).toEqual([]);
});

test('情景题与 PBL 可分别选用，取消后不进入活动；手机不溢出', async ({ page }, info) => {
  await create(page);
  await page.getByText('活动设计（选填）', { exact: true }).click();
  await page.getByRole('button', { name: '情景化出题' }).click();
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('请填写教学情景');
  await page.getByRole('textbox', { name: '教学情景', exact: true }).fill('校园节水调查');
  await page.getByRole('textbox', { name: '情景题目', exact: true }).fill('比较不同节水方案');
  await page.getByRole('button', { name: '创建 PBL 学习活动' }).click();
  await page.getByRole('textbox', { name: '驱动问题', exact: true }).fill('如何降低用水量');
  await page.getByRole('textbox', { name: '项目成果', exact: true }).fill('节水提案');
  await page.getByRole('textbox', { name: '活动阶段', exact: true }).fill('调查\n设计\n展示');
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: info.outputPath('companion-mobile.png'), fullPage: true });
  await finish(page);
  await expect(page.getByRole('heading', { name: '情景题', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PBL 学习活动', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '编辑学伴' }).click();
  await page.getByRole('button', { name: '下一步：选择 SKILL', exact: true }).click();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await page.getByText('活动设计（选填）', { exact: true }).click();
  await page.getByRole('button', { name: '情景化出题' }).click();
  await finish(page);
  await expect(page.getByRole('heading', { name: '情景题', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'PBL 学习活动', exact: true })).toBeVisible();
});

test('从我的 SKILL 挂载已有学伴可去重，挂载入口也可预选创建新学伴', async ({ page }) => {
  await create(page); await finish(page);
  await page.goto('/#/workshop');
  const before = await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'));
  await page.getByRole('button', { name: /更多操作：/ }).click();
  await page.getByRole('menuitem', { name: '挂载到学伴' }).click();
  await page.getByRole('button', { name: '已挂载，查看学伴' }).click();
  await expect(page.getByRole('heading', { name: '数学学伴', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'))).toBe(before);
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)[0].skillIds.length, companionsKey)).toBe(1);
  await page.goto(`/#/skill/${entryId}`);
  await page.getByRole('button', { name: '挂载到学伴' }).click();
  await page.getByRole('button', { name: '创建新学伴' }).click();
  await expect(page.getByRole('textbox', { name: '学伴名称', exact: true })).toHaveValue('');
  await basic(page);
  await page.getByRole('button', { name: '下一步：选择 SKILL', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /错因追问/ })).toBeChecked();
});

test('存储失败保留任务输入，恢复后可重试；损坏资料不被覆盖', async ({ page }) => {
  await create(page);
  await page.evaluate(key => { const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(k, value) { if (k === key) throw new DOMException('full', 'QuotaExceededError'); original.call(this, k, value); };
  }, companionsKey);
  await page.getByRole('textbox', { name: '学习任务与目标', exact: true }).fill('保留这项任务');
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await expect(page).toHaveURL(/\/edit/);
  await expect(page.getByRole('textbox', { name: '学习任务与目标', exact: true })).toHaveValue('保留这项任务');
  await expect(page.locator('.companion-editor').getByRole('alert')).toContainText('保存失败');
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await finish(page);
  await expect(page.locator('.companion-task-summary')).toContainText('保留这项任务');
  await page.evaluate(key => localStorage.setItem(key, '{broken'), companionsKey);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('学伴资料读取失败');
  expect(await page.evaluate(key => localStorage.getItem(key), companionsKey)).toBe('{broken');
});

test('从集市添加的只读 SKILL 可以挂载已有学伴，来源和个人作品数量不变', async ({ page }) => {
  await create(page); await finish(page);
  await page.evaluate(skillValue => {
    localStorage.setItem('teaching-method.market-workspace.v1', JSON.stringify({ version: 1,
      addedSkills: [{ id: 'added:external', skill: { ...skillValue, id: 'external', name: '证据追问' }, creator: '李老师', grade: '初中', subject: '语文',
        area: 'daily', scene: '课堂提问', version: '1.0', validation: '教师已核对', example: '', source: '', demo: false,
        addedFrom: { id: 'external', addedAt: new Date().toISOString() } }], sharedSkillIds: [], favorites: [],
    }));
  }, skill);
  await page.goto('/#/workshop?tab=added'); await page.reload();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
  const originals = await page.evaluate(() => [localStorage.getItem('teaching-assistant.frontend-demo.v2'), localStorage.getItem('teaching-method.market-workspace.v1')]);
  await page.getByRole('button', { name: /更多操作：/ }).click();
  await expect(page.getByRole('menuitem', { name: '复制', exact: true })).toHaveCount(0);
  await page.getByRole('menuitem', { name: '挂载到学伴' }).click();
  await page.getByRole('button', { name: '确认挂载', exact: true }).click();
  await expect(page.locator('summary').filter({ hasText: '证据追问' })).toBeVisible();
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)[0].skillIds.length, companionsKey)).toBe(2);
  expect(await page.evaluate(() => [localStorage.getItem('teaching-assistant.frontend-demo.v2'), localStorage.getItem('teaching-method.market-workspace.v1')])).toEqual(originals);
});

test('发布保存失败不跳转、不假报成功，重试只发布一次', async ({ page }) => {
  await page.goto('/#/workshop');
  await page.evaluate(() => {
    const key = 'teaching-assistant.frontend-demo.v2'; const owners = JSON.parse(localStorage.getItem(key)!);
    owners[0].status = 'TESTED'; localStorage.setItem(key, JSON.stringify(owners));
  });
  await page.reload();
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function(key, value) { if (key === 'teaching-method.market-workspace.v1') throw new Error('full'); write.call(this, key, value); };
  });
  await page.getByRole('button', { name: '确认发布', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('发布未保存');
  await expect(page).toHaveURL(/workshop/);
  await page.evaluate(() => (window as unknown as { restoreWrite: () => void }).restoreWrite());
  await page.getByRole('button', { name: '确认发布', exact: true }).click();
  await expect(page.locator('.market-resource-card')).toHaveCount(1);
});

test('四步创建保留输入，预览仅在最后一步显示并排在保存区域上方', async ({ page }, info) => {
  await page.setViewportSize({ width: 1540, height: 1000 });
  await page.goto('/#/companions/profile-buddy/edit');
  await expect(page.getByRole('list', { name: '创建进度' }).getByRole('listitem')).toHaveCount(4);
  const preview = page.getByRole('complementary', { name: '学伴预览' });
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole('heading', { name: '基本信息', exact: true })).toBeVisible();
  await expect.poll(() => page.locator('.companion-avatar-options img').evaluateAll(images => images.every(image => (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  await page.getByRole('button', { name: '下一步：选择 SKILL', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('学伴名称');
  await basic(page);
  await page.getByRole('radio', { name: '简洁风格', exact: true }).check();
  const avatar = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
  await page.getByLabel('上传学伴形象', { exact: true }).setInputFiles({ name: '头像.png', mimeType: 'image/png', buffer: avatar });
  await expect(page.getByRole('button', { name: '自定义上传学伴形象', exact: true }).locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(preview).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole('textbox', { name: '学伴简介', exact: true })).toHaveValue('帮助学生检查解题思路');
  await expect(page.getByRole('button', { name: '自定义上传学伴形象', exact: true }).locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(preview).toHaveCount(0);
  await page.getByRole('radio', { name: '默认形象', exact: true }).check();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('companion-profile-desktop.png'), fullPage: true });
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
  await page.screenshot({ path: info.outputPath('companion-profile-mobile.png'), fullPage: true });
  await page.getByRole('radio', { name: '简洁风格', exact: true }).check();
  await page.getByRole('button', { name: '下一步：选择 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: '选择 SKILL', exact: true })).toBeVisible();
  await expect(preview).toHaveCount(0);
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole('alert')).toContainText('至少一项方法');
  await page.getByRole('checkbox', { name: /错因追问/ }).check();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教学场景', exact: true })).toBeVisible();
  await expect(page.locator('.companion-scene-fields').getByRole('combobox')).toHaveCount(2);
  await expect(page.locator('.companion-scene-fields').getByRole('textbox')).toHaveCount(1);
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('学习对象');
  await tasks(page);
  await page.getByRole('button', { name: '返回上一步', exact: true }).click();
  await expect(page.getByRole('checkbox', { name: /错因追问/ })).toBeChecked();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await page.reload();
  await expect(page.getByRole('combobox', { name: '学习情境', exact: true })).toHaveValue('课堂学习');
  await expect(page.getByRole('textbox', { name: '学习任务与目标', exact: true })).toHaveValue('检查解题思路，说明每一步的理由');
  await expect(preview).toHaveCount(0);
  await page.screenshot({ path: info.outputPath('companion-scene-mobile.png'), fullPage: true });
  await page.setViewportSize({ width: 1540, height: 1000 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: info.outputPath('companion-scene-desktop.png'), fullPage: true });
  await page.getByRole('button', { name: '下一步：预览与保存', exact: true }).click();
  await expect(page.getByRole('heading', { name: '预览与保存', exact: true })).toBeVisible();
  await expect(preview).toContainText('错因追问');
  await expect(preview).toContainText('帮助学生检查解题思路');
  await expect(preview).toContainText('检查解题思路，说明每一步的理由');
  await expect(preview.locator('.companion-avatar[data-style="simple"]')).toHaveCount(2);
  await page.reload();
  await expect(preview).toBeVisible();
  for (const width of [1540, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const form = await page.locator('.companion-editor').boundingBox();
    const above = await preview.boundingBox();
    expect(form!.y).toBeGreaterThanOrEqual(above!.y + above!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: info.outputPath(`companion-final-${width}.png`), fullPage: true });
  }
  await page.getByRole('button', { name: '返回上一步', exact: true }).click();
  await expect(preview).toHaveCount(0);
  await expect(page.getByRole('textbox', { name: '学习任务与目标', exact: true })).toHaveValue('检查解题思路，说明每一步的理由');
  await finish(page);
  await page.goto('/#/companions');
  await expect(page.locator('.companion-card')).toHaveCount(1);
  await page.getByRole('button', { name: '查看学伴', exact: true }).click();
  await expect(page.locator('.companion-task-summary')).toContainText('检查解题思路');
});

test('旧九项任务按授权清除，学伴名称、挂载与附件保留，新场景刷新仍保存', async ({ page }) => {
  await page.goto('/#/home');
  const old = { id: 'legacy-buddy', name: '旧数学学伴', skillIds: [entryId], step: 2, status: 'ready', updatedAt: '2026-10-10',
    task: { title: '旧纠错任务', audience: '七年级学生', subject: '数学', duration: '两课时', goals: '解释错因', priorKnowledge: '掌握移项',
      instructions: '回顾解题步骤', deliverable: '纠错记录', assessment: '说出理由' }, design: newCompanion('old').design,
    materials: [{ id: 'old-m', name: '旧课堂.txt', type: 'text/plain', size: 1, text: '旧课堂记录', data: 'data:text/plain;base64,QQ==' }] };
  const raw = JSON.stringify([old]);
  await page.evaluate(({ key, raw }) => localStorage.setItem(key, raw), { key: companionsKey, raw });
  await page.goto('/#/companions/legacy-buddy'); await page.reload();
  await expect(page.getByRole('heading', { name: '旧数学学伴', exact: true })).toBeVisible();
  const cleared = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)[0], companionsKey);
  expect(cleared.task).toEqual(newCompanion('legacy-buddy').task);
  expect(cleared.legacyTask).toBeUndefined(); expect(cleared.skillIds).toEqual(old.skillIds);
  expect(cleared.materials).toEqual(old.materials);
  await page.getByRole('button', { name: '编辑学伴', exact: true }).click();
  await page.getByRole('textbox', { name: '学伴简介', exact: true }).fill('帮助学生说明解题理由');
  await page.getByRole('combobox', { name: '学段', exact: true }).selectOption('初中');
  await page.getByRole('button', { name: '下一步：选择 SKILL', exact: true }).click();
  await page.getByRole('button', { name: '下一步：教学场景', exact: true }).click();
  await expect(page.getByRole('combobox', { name: '学习对象', exact: true })).toHaveValue('');
  await expect(page.getByRole('textbox', { name: '学习任务与目标', exact: true })).toHaveValue('');
  await tasks(page);
  await finish(page);
  await page.locator('summary').filter({ hasText: '学伴教学要求' }).click();
  await expect(page.locator('.companion-activity')).toContainText('旧课堂记录');
  await expect(page.locator('.companion-activity')).not.toContainText('掌握移项');
  await expect(page.locator('.companion-activity')).not.toContainText('旧学习目标');
  await page.reload();
  await expect(page.locator('.companion-task-summary')).toContainText('检查解题思路');
  expect(await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)[0].legacyTask, companionsKey)).toBeUndefined();
});

test('旧教学任务和活动草稿清空，来源 SKILL 与发布关系不受影响，清理失败可重试', async ({ page }) => {
  await page.goto('/#/home');
  const before = await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'));
  await page.evaluate(() => {
    localStorage.setItem('teaching-method.market-workspace.v1', JSON.stringify({ version: 1,
      tasks: [{ id: 'old-task', title: '旧任务' }], activityDrafts: [{ id: 'old-draft' }], sharedSkillIds: [] }));
  });
  await page.addInitScript(() => {
    if (localStorage.getItem('allow-legacy-task-cleanup')) return;
    const write = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function(key, value) { if (key === 'teaching-method.market-workspace.v1') throw new DOMException('quota', 'QuotaExceededError'); write.call(this, key, value); };
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '旧任务清理未完成', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!).tasks)).toHaveLength(1);
  await page.evaluate(() => { (window as unknown as { restoreWrite: () => void }).restoreWrite(); localStorage.setItem('allow-legacy-task-cleanup', 'yes'); });
  await page.getByRole('button', { name: '重新清理', exact: true }).click();
  await expect(page.getByRole('heading', { name: '教学工坊', exact: true })).toBeVisible();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!).tasks)).toEqual([]);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('teaching-method.market-workspace.v1')!).activityDrafts)).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'))).toBe(before);
  await page.goto('/#/task/old-task');
  await expect(page.getByRole('heading', { name: '没有找到这项内容' })).toBeVisible();
  await page.getByRole('button', { name: '返回我的 SKILL', exact: true }).click();
  await expect(page.locator('.workshop-item')).toHaveCount(1);
});

test('挂载弹窗关闭后，学伴详情和四个顶栏菜单均可继续点击', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await create(page); await finish(page);
  for (const origin of ['card', 'detail'] as const) {
    await page.goto('/#/workshop');
    if (origin === 'card') {
      await page.getByRole('button', { name: /更多操作：/ }).click();
      await page.getByRole('menuitem', { name: '挂载到学伴', exact: true }).click();
    } else {
      await page.getByRole('button', { name: '查看', exact: true }).click();
      await page.getByRole('button', { name: '挂载到学伴', exact: true }).click();
    }
    await page.getByRole('button', { name: '已挂载，查看学伴', exact: true }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(page.locator('main')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: '数学学伴', exact: true })).toBeVisible();
    await expect(page.locator('body')).not.toHaveCSS('pointer-events', 'none');
    for (const [name, hash] of [['首页', 'home'], ['教学 SKILL 集市', 'market'], ['我的 SKILL', 'workshop'], ['我的学伴', 'companions']]) {
      await page.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name, exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`#/${hash}$`));
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('main')).toBeVisible();
    }
  }
  expect(errors).toEqual([]);
});
