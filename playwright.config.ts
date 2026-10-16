import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'src/e2e/features/**/*.feature',
  steps: 'src/e2e/steps/**/*.ts',
});

export default defineConfig({
  testDir,
  fullyParallel: true,
  outputDir: 'e2e/.playwright-output',
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'on-first-retry',
    screenshot: 'off',
    video: 'off',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm start -- --port 4200',
    url: 'http://localhost:4200/home',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
