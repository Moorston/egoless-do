import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    root: __dirname,
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.{ts,tsx}'],
    exclude: ['node_modules', 'dist', '.expo'],
    setupFiles: [path.resolve(__dirname, '../../__tests__/setup.ts')],
  },
  resolve: {
    alias: {
      '@egoless-do/core': path.resolve(__dirname, '../../packages/core/src'),
    },
  },
});
