import { test, expect } from './demo-workspace-fixture';

test('集市组合筛选、分类计数、收藏持久化及详情返回可用', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const api: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/')) api.push(request.url());
  });
  await page.goto('/#/market');
  const rows = page.locator('.market-resource-card');
  const personal = page.getByRole('navigation', { name: '集市个人导航' });
  const categories = page.getByRole('navigation', { name: '教学分类' });
  await expect(rows).toHaveCount(5);
  await expect(personal.getByRole('button', { name: /^全部方法/ })).toContainText('5');
  await expect(categories.getByRole('button', { name: /^课堂提问/ })).toContainText('2');
  await expect(categories).not.toContainText(/PBL|项目式学习|情境任务/);
  await expect(page.getByRole('region', { name: '热门标签' })).not.toContainText(/PBL|情境|任务链/);
  await expect(page.getByLabel('板块', { exact: true })).toHaveCount(0);
  await expect(page.getByText('方法示例', { exact: true })).toHaveCount(0);
  await expect(personal.getByRole('button', { name: /^我收藏的/ })).toContainText('0');
  await personal.getByRole('button', { name: /^我收藏的/ }).click();
  await expect(page.getByRole('heading', { name: '还没有收藏的教学方法' })).toBeVisible();
  await page.getByRole('button', { name: '浏览全部方法' }).click();

  await page.getByLabel('搜索 SKILL').fill('周老师');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('费用比较中的信息提取与论证');
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();
  await categories.getByRole('button', { name: /^课堂提问/ }).click();
  await expect(rows).toHaveCount(2);
  await expect(personal.getByRole('button', { name: /^全部方法/ })).toContainText('5');
  await page.getByLabel('学段筛选').selectOption('高中');
  await page.getByLabel('学科筛选').selectOption('综合实践');
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('项目方案的证据追问');
  await categories.getByRole('button', { name: /^错因辅导/ }).click();
  await expect(page.getByRole('heading', { name: '没有找到符合条件的教学方法' })).toBeVisible();
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();

  await categories.getByRole('button', { name: /^智能练习/ }).click();
  await expect(rows).toHaveCount(1);
  await expect(rows).toContainText('渐进式提示');
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();
  await page
    .getByRole('region', { name: '热门标签' })
    .getByRole('button', { name: '信息提取', exact: true })
    .click();
  await expect(rows).toHaveCount(1);
  await rows.getByRole('button', { name: '收藏费用比较中的信息提取与论证', exact: true }).click();
  await personal.getByRole('button', { name: /^我收藏的/ }).click();
  await expect(personal.getByRole('button', { name: /^我收藏的/ })).toContainText('1');
  await rows.getByRole('button', { name: '查看与试用', exact: true }).click();
  await expect(page.getByText(/当前 SKILL：/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: '返回集市', exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(personal.getByRole('button', { name: /^我收藏的/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(
    page.getByRole('region', { name: '热门标签' }).getByRole('button', { name: '信息提取', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await expect(rows.getByRole('button', { name: '取消收藏费用比较中的信息提取与论证' })).toBeVisible();
  await rows.getByRole('button', { name: '取消收藏费用比较中的信息提取与论证' }).click();
  await expect(page.getByRole('heading', { name: '还没有收藏的教学方法' })).toBeVisible();
  await page.getByRole('button', { name: '浏览全部方法' }).click();
  const original = await rows.locator('h2').allTextContents();
  await page.getByLabel('排序方式').selectOption('name');
  await expect(rows.locator('h2')).toHaveText([...original].sort((a, b) => a.localeCompare(b, 'zh-CN')));
  await page.getByLabel('排序方式').selectOption('default');
  await page.screenshot({ path: 'docs/assets/SKILL集市桌面.png', fullPage: true });
  expect(api).toEqual([]);
});

test('手机集市使用白色分类面板，分类与标签共同生效并可清除', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/#/market');
  await expect(page.locator('.catalog-sidebar')).toBeHidden();
  await page.getByRole('button', { name: '筛选分类', exact: true }).click();
  const panel = page.getByRole('dialog');
  await expect(panel).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await panel
    .getByRole('navigation', { name: '教学分类' })
    .getByRole('button', { name: /^错因辅导/ })
    .click();
  await expect(panel).toBeHidden();
  await expect(page.locator('.market-resource-card')).toHaveCount(1);
  await page.getByRole('button', { name: '筛选分类', exact: true }).click();
  await panel.getByRole('button', { name: '信息提取', exact: true }).click();
  await expect(page.getByRole('heading', { name: '没有找到符合条件的教学方法' })).toBeVisible();
  await page.getByRole('button', { name: '清除筛选', exact: true }).click();
  await expect(page.locator('.market-resource-card')).toHaveCount(5);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: 'docs/assets/SKILL集市手机.png', fullPage: true });
});

test('我的 SKILL 试用留在作者流程，原版集市与日常教学可用', async ({ page }) => {
  await page.goto('/#/daily');
  await page.setViewportSize({ width: 1440, height: 1000 });
  const card = await page.locator('.daily-entry').boundingBox();
  expect(Math.abs(card!.x + card!.width / 2 - 720)).toBeLessThan(2);
  await page.goto('/#/workshop?tab=skills');
  await page.locator('.workshop-item').first().getByRole('button', { name: '试用 SKILL', exact: true }).click();
  await expect(page).toHaveURL(/#\/assistant\/[^/]+\/test/);
  await expect(page.getByRole('button', { name: '我的 SKILL', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('button', { name: '布置任务', exact: true })).toHaveCount(0);
  await page.goto('/#/market');
  await expect(page.getByRole('button', { name: /助手库/ })).toHaveCount(0);
});
