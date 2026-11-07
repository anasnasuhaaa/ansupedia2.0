import { defineConfig } from '@playwright/test';
import 'dotenv/config';
export default defineConfig({
  testDir: 'tests/browser',
  use: {
    baseURL: 'http://localhost:4321',
    headless: true,
    viewport: { width: 1440, height: 1000 },
    trace: 'retain-on-failure',
  },
  workers: 1,
  reporter: 'list',
  timeout: 60000,
});
