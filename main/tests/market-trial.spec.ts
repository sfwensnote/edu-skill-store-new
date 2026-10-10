import { test, expect, type Page } from '@playwright/test';
import { marketSkills } from '../src/data/marketplace';
import { skillTrialCases } from '../src/data/skill-trial-cases';
import { addMarketSkill } from '../shared/marketplace';

const trial = (page: Page) => page.getByRole('region', { name: '试用 SKILL', exact: true });
const dialogue = (page: Page) => page.getByRole('log', { name: '试用对话' });
async function openSkill(page: Page, name = '错误后反思引导') {
  await page.goto('/#/market');
  await page.locator('.market-resource-card').filter({ has: page.getByRole('button', { name, exact: true }) })
    .getByRole('button', { name: '查看与试用', exact: true }).click();
}

test('首屏给出题目和学生回答；按所选回答引导，重试不改变个人资料', async ({ page }) => {
  await openSkill(page);
  const before = await page.evaluate(() => ({
    owners: localStorage.getItem('teaching-assistant.frontend-demo.v2'),
    workspace: localStorage.getItem('teaching-method.market-workspace.v1'),
  }));
  await expect(trial(page)).toContainText('2x + 3 = 9');
  await expect(dialogue(page)).toContainText('我算出 x=6');
  await expect(dialogue(page)).not.toContainText('模型回复');
  await expect(trial(page).getByRole('textbox')).toHaveCount(0);
  await expect(trial(page)).not.toContainText(/步骤 [1-8]|demo|演示|预置|示例/i);
  await trial(page).getByRole('button', { name: '查看模型回复', exact: true }).click();
  await expect(dialogue(page)).toContainText('你是怎样得到 x=6 的');
  await trial(page).getByRole('button', { name: '我写成了 2x=9+3，再算出 x=6。', exact: true }).click();
  await expect(dialogue(page)).toContainText('为了消去左边的 +3');
  await trial(page).getByRole('button', { name: '两边都减去 3，得到 2x=6，所以 x=3。', exact: true }).click();
  await expect(dialogue(page)).toContainText('回看前一次的 2x=9+3');
  await expect(trial(page).getByRole('group')).toHaveCount(0);
  await expect(trial(page).getByRole('status')).toContainText('已看完');
  await trial(page).getByRole('button', { name: '重新试用', exact: true }).click();
  await expect(dialogue(page)).not.toContainText('模型回复');
  await trial(page).getByRole('button', { name: '查看模型回复', exact: true }).click();
  await trial(page).getByRole('button', { name: '我不知道下一步怎么做。', exact: true }).click();
  await expect(dialogue(page)).toContainText('把你已经写出的第一步发来');
  await expect(dialogue(page)).not.toContainText('为了消去左边的 +3');
  await trial(page).getByRole('button', { name: '重新试用', exact: true }).click();
  await trial(page).getByRole('button', { name: '查看模型回复', exact: true }).click();
  await trial(page).getByRole('button', { name: '我想直接看答案。', exact: true }).click();
  await expect(dialogue(page)).toContainText('先试着写出你的第一步');
  await expect(dialogue(page)).not.toContainText('x=3');
  expect(await page.evaluate(() => ({
    owners: localStorage.getItem('teaching-assistant.frontend-demo.v2'),
    workspace: localStorage.getItem('teaching-method.market-workspace.v1'),
  }))).toEqual(before);
});

test('切换案例与刷新清除旧对话；键盘查看后焦点落在新回复', async ({ page }) => {
  await openSkill(page);
  const start = trial(page).getByRole('button', { name: '查看模型回复', exact: true });
  await start.focus();
  await page.keyboard.press('Enter');
  await expect(dialogue(page).getByText('你是怎样得到 x=6 的？把你的计算过程写出来。', { exact: true })).toBeFocused();
  await trial(page).getByRole('button', { name: '重新试用', exact: true }).click();
  await expect(start).toBeFocused();
  await page.getByLabel('试用案例', { exact: true }).selectOption('fraction-addition');
  await expect(trial(page)).toContainText('1/2 + 1/3');
  await expect(dialogue(page)).not.toContainText('x=6');
  await expect(dialogue(page)).not.toContainText('模型回复');
  await start.click();
  await trial(page).getByRole('button', { name: '分子 1+1=2，分母 2+3=5。', exact: true }).click();
  await expect(dialogue(page)).toContainText('表示的每一份一样大吗');
  await page.reload();
  await expect(page.getByLabel('试用案例', { exact: true })).toHaveValue('equation-sign');
  await expect(dialogue(page)).not.toContainText('模型回复');
});

test('五种方法的案例均可走通全部分支，不调用模型 API', async ({ page }) => {
  const errors: string[] = [], requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => { if (request.url().includes('/api/')) requests.push(request.url()); });
  for (const entry of marketSkills) {
    await openSkill(page, entry.skill.name);
    for (const example of skillTrialCases(entry.skill)) {
      if (skillTrialCases(entry.skill).length > 1) await page.getByLabel('试用案例', { exact: true }).selectOption(example.id);
      for (const choice of example.start.choices || []) {
        const reset = trial(page).getByRole('button', { name: '重新试用', exact: true });
        if (await reset.count()) await reset.click();
        await trial(page).getByRole('button', { name: '查看模型回复', exact: true }).click();
        await trial(page).getByRole('button', { name: choice.student, exact: true }).click();
        await expect(dialogue(page)).toContainText(choice.reply);
        for (const followUp of choice.choices || []) {
          await trial(page).getByRole('button', { name: followUp.student, exact: true }).click();
          await expect(dialogue(page)).toContainText(followUp.reply);
          await expect(trial(page).getByRole('status')).toBeVisible();
          await reset.click();
          await trial(page).getByRole('button', { name: '查看模型回复', exact: true }).click();
          await trial(page).getByRole('button', { name: choice.student, exact: true }).click();
        }
      }
    }
  }
  expect(errors).toEqual([]);
  expect(requests).toEqual([]);
});

test('方法内容改变或没有匹配案例时仍可阅读、添加，不套用原方法回复', async ({ page }) => {
  const source = structuredClone(marketSkills[0]);
  source.skill.constraints = ['先把答案给学生，再讲解'];
  const workspace = JSON.stringify({ version: 1, addedSkills: addMarketSkill([], source, '2026-10-10T08:00:00Z') });
  await page.addInitScript((raw) => {
    const key = 'teaching-method.market-workspace.v1';
    if (!localStorage.getItem(key)) localStorage.setItem(key, raw);
  }, workspace);
  await page.goto('/#/workshop?tab=added');
  await page.getByRole('button', { name: '查看', exact: true }).click();
  await expect(trial(page)).toContainText('暂无试用案例');
  await expect(trial(page).getByRole('button')).toHaveCount(0);
  await expect(page.getByText('先把答案给学生，再讲解', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '已添加', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem('teaching-method.market-workspace.v1'))).toBe(workspace);
});

test('桌面与手机完整阅读、分支和重试可用，试用区不遮挡或横向溢出', async ({ page }, info) => {
  await openSkill(page);
  for (const width of [1440, 768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    const reset = trial(page).getByRole('button', { name: '重新试用', exact: true });
    if (await reset.count()) await reset.click();
    await trial(page).getByRole('button', { name: '查看模型回复', exact: true }).click();
    await trial(page).getByRole('button', { name: '我写成了 2x=9+3，再算出 x=6。', exact: true }).click();
    await expect(trial(page)).toHaveCSS('position', 'static');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect(trial(page).getByRole('button', { name: '我还是不明白为什么要减去 3。', exact: true })).toBeVisible();
    if (width < 1100) {
      const top = await trial(page).evaluate((node) => node.getBoundingClientRect().top + scrollY);
      const methodTop = await page.locator('.method-detail').evaluate((node) => node.getBoundingClientRect().top + scrollY);
      expect(top).toBeLessThan(methodTop);
    }
    if (width === 1440 || width === 390) {
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: info.outputPath(`trial-${width}.png`), fullPage: true });
    }
  }
});
