import { defineConfig } from 'vitest/config';

export default defineConfig({
  oxc: {
    decorator: {
      legacy: true,
      emitDecoratorMetadata: true,
    },
  },
  test: {
    globals: true,
    include: ['e2e/**/*.e2e-spec.ts'],
    setupFiles: ['reflect-metadata'],
    globalSetup: ['./e2e/prisma-generate.setup.mts'],
    // The e2e suite talks to the docker-compose services; running the files
    // in parallel makes them fight over ports and connections.
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
