import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  use: { baseURL: 'http://127.0.0.1:4391', viewport: { width: 1440, height: 1000 } },
  webServer: {
    command: 'pnpm exec vite preview --host 127.0.0.1 --port 4391 --strictPort',
    url: 'http://127.0.0.1:4391',
    reuseExistingServer: false,
  },
});
