import { test, expect, type Page } from './workspace-fixture';
import { editMethodField, fillMethodDetails } from './fixtures/method-form';

const METHOD_NAME = '错因反思';

// 与 execution-preview.spec.ts 同源的纯前端创建 → 检测流程，验证检测完成区的两条出口。
async function createMethod(page: Page) {
  await page.goto('/#/create/preview-reflect');
  await page.getByLabel('教学想法').fill('学生第一次答错时，先回顾思路，再检查不确定的一步。');
  await page.getByRole('combobox', { name: '学科', exact: true }).selectOption('任意学科');
  await page.getByRole('checkbox', { name: '标签 错因辅导', exact: true }).check();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await fillMethodDetails(page, METHOD_NAME, '引导学生检查并改正错误', '学生能解释错误原因并独立改正');
  await editMethodField(page, '希望学生达到', '能解释错误原因并独立改正');
  await editMethodField(page, '什么时候开始', '学生第一次答错时');
  for (const [condition, action] of [['学生第一次答错', '请学生回顾解题思路'], ['学生回顾后仍没有找到问题', '提醒学生检查不确定的一步']]) {
    await page.getByRole('button', { name: '补充一种情况和做法', exact: true }).click();
    const index = await page.locator('.outline-step').count();
    await editMethodField(page, `情况 ${index}`, condition); await editMethodField(page, `做法 ${index}`, action);
  }
  await page.getByRole('button', { name: '完成整理', exact: true }).click();
  await expect(page).toHaveURL(/preview-reflect\/test/);
}

// 只跑完三条确认动作，不断言最终的 ready 文案；失败或待继续核对时也能复用。
async function detectCases(page: Page) {
  await page.getByRole('button', { name: '开始验证', exact: true }).click();
  await expect(page.getByRole('heading', { name: '情况 1', exact: true })).toBeVisible();
  await expect(page.locator('.execution-case')).toHaveCount(1);
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await expect(page.getByRole('heading', { name: '情况 2', exact: true })).toBeVisible();
  await expect(page.locator('.execution-case')).toContainText('已经回顾过思路');
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await page.getByRole('button', { name: '确认并完成验证', exact: true }).click();
}

async function confirm(page: Page) {
  await detectCases(page);
  await expect(page.getByRole('status').filter({ hasText: '可将这项教学方法添加到学伴' })).toBeVisible();
}

test('检测确认完成后提供两条出口：先不发布返回我的教学方法 且集市无新增', async ({ page }) => {
  test.setTimeout(90000);
  await createMethod(page);
  await confirm(page);

  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '先不发布，返回我的教学方法', exact: true }).click();

  await expect(page).toHaveURL(/workshop/);
  await expect(page.locator('.workshop-item')).toHaveCount(1);

  await page.goto('/#/market');
  await expect(page.locator('.market-resource-card').filter({ hasText: METHOD_NAME })).toHaveCount(0);
});

test('检测完成刷新后仍可发布：确认发布后进入集市', async ({ page }) => {
  test.setTimeout(90000);
  await createMethod(page);
  await confirm(page);

  await page.reload();
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toBeVisible();

  await page.getByRole('button', { name: '发布到集市', exact: true }).click();
  await page.getByRole('button', { name: '确认发布', exact: true }).click();

  await expect(page.locator('.market-resource-card').filter({ hasText: METHOD_NAME }).first()).toBeVisible();
});

test('发布资格同步写入失败时提示重试，恢复存储后可发布且刷新仍可发布', async ({ page }) => {
  test.setTimeout(90000);
  await createMethod(page);

  // 仅在状态写为 TESTED 时失败，确认记录（preview 键）等其它写入保持成功。
  await page.evaluate(() => {
    const write = Storage.prototype.setItem;
    (window as unknown as { restoreWrite: () => void }).restoreWrite = () => { Storage.prototype.setItem = write; };
    Storage.prototype.setItem = function (name, value) {
      if (name === 'teaching-assistant.frontend-demo.v2' && String(value).includes('"status":"TESTED"')) {
        throw new DOMException('full', 'QuotaExceededError');
      }
      write.call(this, name, value);
    };
  });

  await detectCases(page);
  await expect(page.getByRole('alert').filter({ hasText: '核对已保存，但发布资格未保存' })).toBeVisible();
  await expect(page.getByRole('button', { name: '重试同步', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toHaveCount(0);

  await page.evaluate(() => (window as unknown as { restoreWrite: () => void }).restoreWrite());
  await page.getByRole('button', { name: '重试同步', exact: true }).click();
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toBeVisible();

  await page.reload();
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toBeVisible();
});

test('存在第二项待核对方法时先提示继续核对，切换后确认完成方可发布', async ({ page }) => {
  test.setTimeout(90000);
  await createMethod(page);

  // 在同一隔离账号下复制一份仍未核对的方法，制造多方法待核对场景。
  await page.evaluate(() => {
    const key = 'teaching-assistant.frontend-demo.v2';
    const owners = JSON.parse(localStorage.getItem(key) ?? '[]') as Array<{ skills?: Array<{ id: string; name: string }> }>;
    const owner = owners.find(item => (item.skills?.length ?? 0) > 0);
    if (!owner?.skills) throw new Error('未找到包含 教学方法 的助手记录');
    const second = structuredClone(owner.skills[0]);
    second.id = 'second-reviewed-method';
    second.name = '另一项错因反思';
    owner.skills.push(second);
    localStorage.setItem(key, JSON.stringify(owners));
  });
  await page.reload();

  await confirm(page);
  await expect(page.getByRole('status').filter({ hasText: '还有 1 项方法需要核对' })).toBeVisible();
  await expect(page.locator('.execution-complete-pending li').filter({ hasText: '另一项错因反思' })).toBeVisible();
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toHaveCount(0);

  await page.getByRole('button', { name: '继续核对其它方法', exact: true }).click();
  const skillSelect = page.getByRole('combobox', { name: '选择教学方法' });
  // 直接断言按钮已把选择切到第二项，而不是再手动挑选来掩盖失效。
  await expect(skillSelect).toHaveValue('personal:preview-reflect:second-reviewed-method');
  await expect(skillSelect.locator('option:checked')).toHaveText('另一项错因反思');

  await detectCases(page);
  await expect(page.getByRole('button', { name: '发布到集市', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '继续核对其它方法', exact: true })).toHaveCount(0);
});
