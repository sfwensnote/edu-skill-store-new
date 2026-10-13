import { test, expect } from './workspace-fixture';
import { initialMine } from '../src/data/platform';

for (const stepCount of [1, 3]) {
  test(`${stepCount} 个教学步骤的验证进度铺满内容区并按实际项数等分`, async ({ page }) => {
    const owner = {
      ...structuredClone(initialMine[0]), id: `progress-owner-${stepCount}`, status: 'GENERATED' as const,
      skills: [{ ...structuredClone(initialMine[0].skills[0]), id: `progress-method-${stepCount}`,
        steps: Array.from({ length: stepCount }, (_, index) => ({
          condition: `学生第 ${index + 1} 次回答错误`, action: `请学生说明第 ${index + 1} 步的思路`,
        })),
        behaviorSteps: Array.from({ length: stepCount }, (_, index) => `请学生说明第 ${index + 1} 步的思路`),
        constraints: ['不直接告诉学生答案', '结束条件：学生能独立说明理由后结束'],
      }],
    };
    await page.addInitScript(value => {
      if (!localStorage.getItem('progress-layout-seeded')) {
        localStorage.setItem('teaching-assistant.frontend-demo.v2', JSON.stringify([value]));
        localStorage.setItem('progress-layout-seeded', 'true');
      }
    }, owner);
    await page.goto(`/#/assistant/${owner.id}/test`);
    await page.getByRole('button', { name: '开始验证', exact: true }).click();
    await expect(page.locator('.execution-case')).toBeVisible();
    const conversation = page.locator('.execution-transcript-conversation');
    await expect(conversation.locator('.execution-chat-avatar')).toHaveCount(2);
    await expect(conversation.locator('[data-role="user"] .execution-chat-bubble > span')).toHaveText('学生');
    await expect(conversation.locator('[data-role="assistant"] .execution-chat-bubble > span')).toHaveText('教学方法回复');
    await expect(conversation.locator('[data-role="assistant"]')).toHaveCSS('background-color', 'rgba(0, 0, 0, 0)');
    const progress = page.getByRole('progressbar', { name: '教学方法验证进度' });
    await expect(progress).toHaveAttribute('max', String(stepCount + 1));
    await expect(progress).toHaveAttribute('value', '0');
    const cells = page.locator('.execution-progress-dividers > span');
    await expect(cells).toHaveCount(stepCount + 1);
    for (const width of [1440, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const geometry = await page.locator('.execution-heading').evaluate(element => {
        const heading = element.getBoundingClientRect();
        const bar = element.querySelector('progress')!.getBoundingClientRect();
        const widths = Array.from(element.querySelectorAll('.execution-progress-dividers > span'), item => item.getBoundingClientRect().width);
        return { headingWidth: heading.width, barWidth: bar.width, widths };
      });
      expect(geometry.barWidth).toBeCloseTo(geometry.headingWidth, 0);
      expect(Math.max(...geometry.widths) - Math.min(...geometry.widths)).toBeLessThan(1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      expect(await conversation.evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
    }
    await page.getByRole('button', { name: '确认并继续', exact: true }).click();
    await expect(progress).toHaveAttribute('value', '1');
  });
}
