import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: false,
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['reflect-metadata', './e2e/vitest.setup.ts'],
    include: ['e2e/**/*.e2e-spec.ts'],
    testTimeout: 300_000,
    hookTimeout: 300_000,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
});
