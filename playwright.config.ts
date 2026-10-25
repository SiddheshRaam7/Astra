import { defineConfig } from '@playwright/test';
const baseURL = process.env.E2E_BASE_URL || 'http://127.0.0.1:3000';
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  use: { baseURL, headless: true, screenshot: 'only-on-failure' },
  webServer: {
    command: 'npm run dev',
    url: baseURL,
    reuseExistingServer: true,
    timeout: 60000,
  },
});
