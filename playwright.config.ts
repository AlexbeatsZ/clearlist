import { defineConfig } from '@playwright/test';
import fs from 'node:fs';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const browser =
  process.env.CLEARLIST_BROWSER ??
  (process.platform === 'win32' && fs.existsSync(edge) ? edge : undefined);
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  expect: { timeout: 7000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5178',
    viewport: { width: 1440, height: 960 },
    launchOptions: browser ? { executablePath: browser } : {},
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev:web',
    url: 'http://127.0.0.1:5178',
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
});
