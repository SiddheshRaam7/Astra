import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
    env: { DATABASE_URL: '', VERCEL: '', APP_BASE_URL: '', DEMO_MODE: 'true' },
  },
  resolve: { alias: { '@': new URL('./src', import.meta.url).pathname } },
});
