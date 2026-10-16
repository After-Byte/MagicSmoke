import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './test',
  testMatch: '**/*.spec.ts',
  timeout: 60000,
  webServer: {
    command: 'npx vite preview --port 5173 --host 127.0.0.1',
    url: 'http://127.0.0.1:5173',
    reuseExistingServer: false,
    timeout: 30000,
  },
  use: {
    baseURL: 'http://127.0.0.1:5173',
  },
});
