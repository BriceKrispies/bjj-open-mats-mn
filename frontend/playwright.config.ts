import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/pw',
  testMatch: '**/*.pw.spec.ts',
  use: {
    baseURL: 'http://localhost:3000',
    testIdAttribute: 'data-testid',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
  },
});
