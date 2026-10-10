import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { skillWorkspaceKey } from '../shared/skill-workspace';

async function reuseExample(page: Page) {
  await page.goto('/#/market/example-reflection');
  await page.getByRole('button', { name: '复用到我的工作区' }).click();
  await expect(page.getByRole('heading', { name: '创建 SKILL', exact: true })).toBeVisible();
}
async function completeReview(page: Page) {
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: '核对教学方法' })).toBeVisible();
  const confirm = page.getByRole('button', { name: '确认此版本，进入 LLM 检测' });
  await expect(confirm).toBeDisabled();
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
  await confirm.click();
  await expect(page.getByRole('heading', { name: 'LLM 检测', exact: true })).toBeVisible();
}
async function publishCurrent(page: Page) {
  await page.getByRole('button', { name: '运行 LLM 检测', exact: true }).click();
  await expect(page.locator('.sd-detection-complete')).toContainText('演示检测通过');
  await page.getByRole('link', { name: '继续发布', exact: true }).click();
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  await expect(page.getByRole('link', { name: '查看集市说明', exact: true })).toBeVisible();
}

async function editField(page: Page, name: string, value: string) {
  await page.getByRole('button', { name: `编辑${name}`, exact: true }).click();
  await page.getByRole('textbox', { name, exact: true }).fill(value);
  await page.getByRole('heading', { name: /创建 SKILL|修订 SKILL/, exact: true }).click();
}

test('从经验创建，经教师核对、LLM 检测发布；集市只有说明与挂载文件', async ({ page }) => {
  const modelCalls: string[] = [];
  page.on('request', (request) => { if (request.url().includes('/api/')) modelCalls.push(request.url()); });
  await page.goto('/#/home');
  const navigation = page.getByRole('navigation', { name: '主要导航' });
  await expect(navigation).not.toContainText('PBL');
  await expect(navigation).not.toContainText('助手');
  await page.getByRole('button', { name: '创建 SKILL', exact: true }).click();
  await page.getByRole('textbox', { name: '教学想法' }).fill('学生移项时常漏掉变号，我先问他等式两边做了什么。');
  await page.getByLabel('教学分类', { exact: true }).selectOption('错因辅导');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.getByLabel('使用前需要哪些信息？', { exact: true }).fill('方程题目、学生的移项过程与核对依据。');
  await page.getByLabel('什么时候不适用，或需要教师介入？', { exact: true }).fill('看不到解题过程时先澄清；连续提示仍卡住时转交教师。');
  await editField(page, 'SKILL 名称', '移项前先解释等式变换');
  const answers = ['解释变号的依据', '学生移项漏变号时', '请解释等式两边分别做了什么',
    '学生解释后仍无法纠正', '只提示重新检查该行等式', '不直接报出最终答案'];
  for (const answer of answers) {
    await page.getByRole('textbox', { name: '你的回答', exact: true }).fill(answer);
    await page.getByRole('button', { name: '提交', exact: true }).click();
  }
  await completeReview(page);
  await expect(page.locator('.sd-detection-cases')).toContainText(answers[4]);
  await publishCurrent(page);
  await page.getByRole('link', { name: '查看集市说明', exact: true }).click();
  await expect(page.locator('.sd-teacher-guide')).toContainText(answers[4]);
  await expect(page.getByRole('link', { name: /预览|AI 执行示例/ })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /预览|运行 LLM 检测/ })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '自行挂载说明' })).toContainText('目标平台');
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: '下载 SKILL.md' }).click();
  const file = await downloaded;
  const markdown = await readFile((await file.path())!, 'utf8');
  expect(file.suggestedFilename()).toBe('SKILL.md');
  expect(markdown).toMatch(/^---\nname:/);
  expect(markdown).toContain(answers[4]);
  expect(markdown).toContain('教师核对：已核对 v1');
  expect(markdown).toContain('看不到解题过程时先澄清');
  expect(markdown).toContain('自行挂载');
  expect(modelCalls).toEqual([]);
  await page.reload();
  await expect(page.locator('.sd-version-line')).toContainText('已发布（Demo）');
});

test('完整方法可直接形成；修订产生新版本并重新核对', async ({ page }) => {
  await reuseExample(page);
  await completeReview(page);
  await publishCurrent(page);
  await page.getByRole('link', { name: '整理', exact: true }).click();
  await editField(page, '做法 1', '请学生先解释第一步等式变化，暂不提供答案。');
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page.locator('.sd-page-heading')).toContainText('v2');
  for (const checkbox of await page.getByRole('checkbox').all()) await expect(checkbox).not.toBeChecked();
  await expect(page.getByRole('button', { name: '确认此版本，进入 LLM 检测' })).toBeDisabled();
  await expect(page.locator('.sd-document')).toContainText('请学生先解释第一步等式变化');
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), skillWorkspaceKey);
  expect(stored.skills[0].revision).toBe(2);
  expect(stored.skills[0].review).toBeUndefined();
  expect(stored.skills[0].detection).toBeUndefined();
  expect(stored.skills[0].publication).toBeUndefined();
  expect(stored.skills[0].source.skillId).toBe('example-reflection');
  await page.goto('/#/market/example-reflection');
  await expect(page.locator('.sd-teacher-guide')).not.toContainText('请学生先解释第一步等式变化');
});

test('草稿恢复未提交回答；手动修订优先于问答内容', async ({ page }) => {
  await page.goto('/#/home');
  await page.getByRole('button', { name: '创建 SKILL', exact: true }).click();
  await page.getByRole('textbox', { name: '教学想法' }).fill('引导学生引用文本证据。');
  await page.getByLabel('教学分类', { exact: true }).selectOption('课堂提问');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await editField(page, '希望学生达到', '教师手动填写的目标');
  await page.getByRole('textbox', { name: '你的回答', exact: true }).fill('尚未提交的目标回答');
  await page.reload();
  await expect(page.getByRole('textbox', { name: '你的回答', exact: true })).toHaveValue('尚未提交的目标回答');
  await expect(page.getByRole('button', { name: '编辑希望学生达到', exact: true })).toContainText('教师手动填写的目标');
  await page.getByRole('button', { name: '提交', exact: true }).click();
  await expect(page.getByRole('button', { name: '编辑希望学生达到', exact: true })).toContainText('教师手动填写的目标');
});

test('存储失败保留输入并阻止离开，不冒充形成或核对成功', async ({ page }) => {
  await reuseExample(page);
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    (window as unknown as { restoreStorage: () => void }).restoreStorage = () => { Storage.prototype.setItem = original; };
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('存储空间不足', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, skillWorkspaceKey);
  await page.getByLabel('使用前需要哪些信息？', { exact: true }).fill('保存失败时保留的使用条件');
  await expect(page.getByRole('alert')).toContainText('保存失败');
  const hash = new URL(page.url()).hash;
  await page.getByRole('link', { name: '我的 SKILL', exact: true }).click();
  await expect.poll(() => new URL(page.url()).hash).toBe(hash);
  await expect(page.getByLabel('使用前需要哪些信息？', { exact: true })).toHaveValue('保存失败时保留的使用条件');
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: '创建 SKILL', exact: true })).toBeVisible();
  let stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), skillWorkspaceKey);
  expect(stored.skills[0].revision).toBe(0);
  await page.evaluate(() => (window as unknown as { restoreStorage: () => void }).restoreStorage());
  await page.getByRole('button', { name: '重试保存／读取' }).click();
  await expect(page.getByRole('alert')).toHaveCount(0);
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page.getByRole('heading', { name: '核对教学方法' })).toBeVisible();
  stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), skillWorkspaceKey);
  expect(stored.skills[0].content.context.inputs).toBe('保存失败时保留的使用条件');
});

test('损坏的资料不被默认工作区覆盖，旧版存储保持原样', async ({ page }) => {
  await page.addInitScript((key) => {
    localStorage.setItem(key, '损坏但需要保留的原资料');
    localStorage.setItem('teaching-assistant.frontend-demo.v2', '旧版资料标记');
  }, skillWorkspaceKey);
  await page.goto('/#/home');
  await expect(page.getByRole('alert')).toContainText('原资料未被覆盖');
  await page.getByRole('button', { name: '创建 SKILL', exact: true }).click();
  expect(await page.evaluate((key) => localStorage.getItem(key), skillWorkspaceKey)).toBe('损坏但需要保留的原资料');
  expect(await page.evaluate(() => localStorage.getItem('teaching-assistant.frontend-demo.v2'))).toBe('旧版资料标记');
});

test('确认核对时写入失败，不显示已核对或跳转使用页', async ({ page }) => {
  await reuseExample(page);
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  for (const checkbox of await page.getByRole('checkbox').all()) await checkbox.check();
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('存储空间不足', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, skillWorkspaceKey);
  await page.getByRole('button', { name: '确认此版本，进入 LLM 检测' }).click();
  await expect(page.getByRole('heading', { name: '核对教学方法' })).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('保存失败');
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), skillWorkspaceKey);
  expect(stored.skills[0].review).toBeUndefined();
  await page.getByRole('link', { name: '发布', exact: true }).click();
  await expect(page.getByRole('button', { name: '发布到集市' })).toBeDisabled();
});

test('320 像素手机布局无横向溢出，主要流程可完成', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/#/home');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await reuseExample(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await completeReview(page);
  await publishCurrent(page);
  await page.getByRole('link', { name: '查看集市说明', exact: true }).click();
  await expect(page.locator('.sd-teacher-guide')).toContainText('等待学生完成修正');
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
});

test('LLM 检测发现问题时不能发布，作者工作区显示回答和检测意见', async ({ page }) => {
  await reuseExample(page);
  await completeReview(page);
  await page.getByLabel('检测演示情境', { exact: true }).selectOption('review');
  await page.getByRole('button', { name: '运行 LLM 检测' }).click();
  await expect(page.locator('.sd-detection-complete')).toContainText('检测发现问题');
  await expect(page.locator('.sd-detection-cases')).toContainText('模型回答（演示）');
  await expect(page.locator('.sd-detection-cases')).toContainText('违反先澄清的边界');
  await page.getByRole('link', { name: '发布', exact: true }).click();
  await expect(page.getByRole('button', { name: '发布到集市' })).toBeDisabled();
  await page.getByRole('link', { name: 'SKILL 集市', exact: true }).click();
  await expect(page.locator('.sd-method-list > li')).toHaveCount(2);
});

test('检测输入草稿刷新恢复；发布存储失败时不显示成功', async ({ page }) => {
  await reuseExample(page);
  await completeReview(page);
  await page.locator('#test-input-step-0').fill('本次测试的具体学生回答。');
  await page.reload();
  await expect(page.locator('#test-input-step-0')).toHaveValue('本次测试的具体学生回答。');
  await page.getByRole('button', { name: '运行 LLM 检测' }).click();
  await page.getByRole('link', { name: '继续发布', exact: true }).click();
  await page.evaluate((key) => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (name, value) {
      if (name === key) throw new DOMException('存储空间不足', 'QuotaExceededError');
      return original.call(this, name, value);
    };
  }, skillWorkspaceKey);
  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  await expect(page.getByRole('alert')).toContainText('保存失败');
  await expect(page.getByRole('link', { name: '查看集市说明' })).toHaveCount(0);
  const stored = await page.evaluate((key) => JSON.parse(localStorage.getItem(key)!), skillWorkspaceKey);
  expect(stored.skills[0].publication).toBeUndefined();
});

test('旧 AI 示例地址不能在集市重新打开预览或检测功能', async ({ page }) => {
  await page.goto('/#/examples/example-reflection/use?view=ai');
  await expect(page.getByRole('heading', { name: '先问思路，再给提示', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: /预览|运行 LLM 检测/ })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'AI 执行示例' })).toHaveCount(0);
  await expect(page.getByRole('region', { name: '自行挂载说明' })).toBeVisible();
});
