import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '../storage.js': fileURLToPath(new URL('./src/storage.js', import.meta.url)),
      '../src': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    pool: 'forks',
    singleFork: true,
    fileParallelism: false,
  },
});
