import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: [
      'packages/**/*.test.{ts,tsx}',
      'apps/**/*.test.{ts,tsx}',
      '__tests__/**/*.test.{ts,tsx}',
    ],
    exclude: ['node_modules', 'dist', '.expo'],
    setupFiles: ['./setup.ts'],
  },
  resolve: {
    alias: {
      '@egoless-do/core': path.resolve(__dirname, 'packages/core/src'),
    },
  },
});
