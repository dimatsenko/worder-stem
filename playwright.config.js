import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests',
  testMatch: '*.spec.js',
  workers: 1,
  use: {
    baseURL: 'http://127.0.0.1:8771',
    launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE
      ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE }
      : {},
  },
  // Exercise the production bundle, including its copied catalog and images.
  webServer: {
    command: 'npx vite preview --host 127.0.0.1 --port 8771 --strictPort',
    url: 'http://127.0.0.1:8771/app.html',
    reuseExistingServer: false,
  },
});
