import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: '.', testMatch: 'skill-demo.spec.ts', timeout: 45000, workers: 1, reporter: 'list',
  use: {
    baseURL: process.env.SKILL_DEMO_URL || 'http://127.0.0.1:5173', headless: true,
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : { channel: 'chrome' },
  },
});
