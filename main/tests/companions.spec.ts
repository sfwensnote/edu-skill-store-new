import { test, expect, type Page } from './workspace-fixture';
import { initialMine } from '../src/data/platform';
import { packageTeachingMethod } from '../shared/teaching-method';
import { completeTeachingMethod } from './fixtures/teaching-method';
import { companionsKey, taskFields } from '../shared/learning-companion';

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
  for (const [key, label] of taskFields) await page.getByRole('textbox', { name: label, exact: true }).fill(key === 'title' ? '检查解题思路' : `${label}由教师填写`);
}
async function create(page: Page) {
  await page.goto('/#/companions/new-buddy/edit');
  await page.getByRole('textbox', { name: '学伴名称' }).fill('数学学伴');
  await page.getByRole('checkbox', { name: /错因追问/ }).check();
  await page.getByRole('button', { name: '下一步', exact: true }).click();
  await tasks(page);
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
  await page.getByLabel('上传教学材料').setInputFiles({ name: '课堂记录.txt', mimeType: 'text/plain', buffer: Buffer.from('学生把移项后的符号写错了。') });
  await expect(page.locator('.companion-files')).toContainText('课堂记录.txt');
  await page.reload();
  await expect(page.getByRole('textbox', { name: '教学任务名称', exact: true })).toHaveValue('检查解题思路');
  await page.getByRole('button', { name: '创建教学活动', exact: true }).click();
  await expect(page).toHaveURL(/#\/companions\/new-buddy$/);
  await expect(page.getByRole('heading', { name: '检查解题思路' })).toBeVisible();
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
  await page.getByRole('button', { name: '情景化出题' }).click();
  await page.getByRole('button', { name: '创建教学活动', exact: true }).click();
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
  await page.getByRole('button', { name: '创建教学活动', exact: true }).click();
  await expect(page.getByRole('heading', { name: '情景题', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'PBL 学习活动', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '编辑学伴' }).click();
  await page.getByRole('button', { name: '情景化出题' }).click();
  await page.getByRole('button', { name: '保存教学活动', exact: true }).click();
  await expect(page.getByRole('heading', { name: '情景题', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'PBL 学习活动', exact: true })).toBeVisible();
});

test('从我的 SKILL 挂载已有学伴可去重，挂载入口也可预选创建新学伴', async ({ page }) => {
  await create(page); await page.getByRole('button', { name: '创建教学活动', exact: true }).click();
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
  await expect(page.getByRole('checkbox', { name: /错因追问/ })).toBeChecked();
  await expect(page.getByRole('textbox', { name: '学伴名称' })).toHaveValue('');
});

test('存储失败保留任务输入，恢复后可重试；损坏资料不被覆盖', async ({ page }) => {
  await create(page);
  await page.evaluate(key => { const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function(k, value) { if (k === key) throw new DOMException('full', 'QuotaExceededError'); original.call(this, k, value); };
  }, companionsKey);
  await page.getByRole('textbox', { name: '学习任务', exact: true }).fill('保留这项任务');
  await page.getByRole('button', { name: '创建教学活动', exact: true }).click();
  await expect(page).toHaveURL(/\/edit/);
  await expect(page.getByRole('textbox', { name: '学习任务', exact: true })).toHaveValue('保留这项任务');
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await page.getByRole('button', { name: '创建教学活动', exact: true }).click();
  await expect(page.getByRole('heading', { name: '检查解题思路' })).toBeVisible();
  await page.evaluate(key => localStorage.setItem(key, '{broken'), companionsKey);
  await page.reload();
  await expect(page.getByRole('alert')).toContainText('学伴资料读取失败');
  expect(await page.evaluate(key => localStorage.getItem(key), companionsKey)).toBe('{broken');
});

test('从集市添加的只读 SKILL 可以挂载已有学伴，来源和个人作品数量不变', async ({ page }) => {
  await create(page); await page.getByRole('button', { name: '创建教学活动', exact: true }).click();
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
