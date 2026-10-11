import { test, expect } from './workspace-fixture';
import { fillMethodDetails } from './fixtures/method-form';
import { mockQuestions } from '../shared/teaching-method';

const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l9sAAAAASUVORK5CYII=', 'base64');
test('分类图案固定，颜色和自定义图片随创建、编辑、发布及只读添加保存', async ({ page, browser }, info) => {
  await page.goto('/#/create/icon-flow');
  const icon = page.locator('.skill-icon-field .skill-icon');
  const patterns = new Set<string>();
  for (const category of ['课堂提问', '错因辅导', '智能练习', '知识讲解']) {
    await page.getByLabel('教学分类', { exact: true }).selectOption(category);
    await expect(icon).toHaveAttribute('data-category', category);
    patterns.add(await icon.locator('svg').innerHTML());
  }
  expect(patterns.size).toBe(4);
  await page.getByRole('button', { name: '蓝色', exact: true }).click();
  await expect(icon).toHaveCSS('color', 'rgb(59, 109, 154)');
  await page.getByLabel('上传 SKILL 图标', { exact: true }).setInputFiles({ name: 'unsafe.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg />') });
  await expect(page.getByRole('alert')).toContainText('请上传 PNG');
  await expect(icon.locator('img')).toHaveCount(0);
  await page.getByLabel('上传 SKILL 图标', { exact: true }).setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(1024 * 1024 + 1) });
  await expect(page.getByRole('alert')).toContainText('不能超过 1 MB');
  await page.getByLabel('上传 SKILL 图标', { exact: true }).setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('broken') });
  await expect(page.getByRole('alert')).toContainText('图片无法读取');
  await page.getByLabel('上传 SKILL 图标', { exact: true }).setInputFiles({ name: 'skill.png', mimeType: 'image/png', buffer: image });
  await expect(icon.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await page.getByLabel('教学想法').fill('学生答错时，先请他回顾解题思路。');
  await page.getByRole('checkbox', { name: '标签 错因辅导', exact: true }).check();
  await page.reload();
  await expect(icon.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(icon).toHaveCSS('color', 'rgb(59, 109, 154)');
  await page.getByRole('button', { name: '继续', exact: true }).click();
  for (const question of mockQuestions) {
    await page.getByLabel('你的回答').fill(question.example);
    await page.getByRole('button', { name: '提交', exact: true }).click();
  }
  await fillMethodDetails(page, '图标同步检查', '引导学生回顾步骤', '学生能说明正确思路时结束');
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await expect(page).toHaveURL(/icon-flow\/test/);
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await page.goto('/#/workshop');
  const mine = page.locator('.workshop-item');
  await expect(mine.locator('.skill-icon img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(mine.locator('.skill-icon')).toHaveCSS('color', 'rgb(59, 109, 154)');
  await mine.getByRole('button', { name: '编辑', exact: true }).click();
  await expect(icon.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await page.getByRole('button', { name: '使用分类图标', exact: true }).click();
  await page.getByLabel('教学分类', { exact: true }).selectOption('智能练习');
  await expect(icon).toHaveAttribute('data-category', '智能练习');
  await expect(icon.locator('img')).toHaveCount(0);
  await expect(icon).toHaveCSS('color', 'rgb(59, 109, 154)');
  await page.getByLabel('上传 SKILL 图标', { exact: true }).setInputFiles({ name: 'skill.png', mimeType: 'image/png', buffer: image });
  await expect(icon.locator('img')).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('skill-icon-mobile.png'), fullPage: true });
  await page.getByRole('button', { name: '形成 SKILL', exact: true }).click();
  await page.getByRole('button', { name: '确认并继续', exact: true }).click();
  await page.getByRole('button', { name: '确认并完成', exact: true }).click();
  await page.goto('/#/workshop');
  await mine.getByRole('button', { name: '发布到集市', exact: true }).click();
  await page.getByRole('button', { name: '确认发布', exact: true }).click();
  const market = page.locator('.market-resource-card');
  await expect(market.locator('.skill-icon')).toHaveAttribute('data-category', '智能练习');
  await expect(market.locator('.skill-icon')).toHaveCSS('color', 'rgb(59, 109, 154)');
  await expect(market.locator('.skill-icon img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  await expect(market.getByRole('button', { name: '已添加', exact: true })).toBeDisabled();
  const data = await page.evaluate(() => Object.entries(localStorage));
  const receiver = await browser.newContext({ baseURL: info.project.use.baseURL });
  try {
    await receiver.addInitScript(data => {
      if (localStorage.getItem('icon-receiver-seeded')) return;
      for (const [key, value] of data) localStorage.setItem(key, value);
      localStorage.setItem('icon-receiver-seeded', 'true');
    }, data);
    const other = await receiver.newPage();
    await other.goto('/#/market');
    await other.getByRole('button', { name: '注册教师账号', exact: true }).click();
    await other.getByLabel('姓名', { exact: true }).fill('图标接收教师');
    await other.getByLabel('账号', { exact: true }).fill('icon_receiver');
    await other.getByLabel('密码', { exact: true }).fill('icon123456');
    await other.getByRole('button', { name: '注册并登录', exact: true }).click();
    await other.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: '教学 SKILL 集市', exact: true }).click();
    await other.locator('.market-resource-card').getByRole('button', { name: '添加到我的 SKILL', exact: true }).click();
    await other.getByRole('navigation', { name: '主要导航' }).getByRole('button', { name: '我的 SKILL', exact: true }).click();
    await other.getByRole('navigation', { name: 'SKILL 分类', exact: true }).getByRole('button', { name: '从集市添加', exact: true }).click();
    const added = other.locator('.workshop-item .skill-icon');
    await expect(added.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
    await other.reload();
    await expect(added).toHaveCSS('color', 'rgb(59, 109, 154)');
    await expect(added.locator('img')).toHaveAttribute('src', /^data:image\/png;base64,/);
  } finally { await receiver.close(); }
});
