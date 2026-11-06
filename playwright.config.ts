import { defineConfig } from '@playwright/test';
import 'dotenv/config';
export default defineConfig({
  testDir: 'tests/browser',
  use: { baseURL: 'http://localhost:4321', headless: true },
  workers: 1,
  reporter: 'list',
  timeout: 60000,
});
