import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vite 8 transforms with Oxc by default; disable it so SWC can emit
  // decorator metadata that NestJS dependency injection requires.
  oxc: false,
  plugins: [
    swc.vite({
      module: { type: 'es6' },
    }),
  ],
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['reflect-metadata'],
    include: ['lib/**/*.spec.ts', 'lib/**/*.test.ts'],
    coverage: {
      include: ['lib/**/*.{js,jsx,tsx,ts}'],
      exclude: ['**/node_modules/**', '**/vendor/**'],
      reporter: ['json', 'lcov'],
    },
  },
});
