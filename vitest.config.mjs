import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    jsdom: {
      domConfig: {
        MutationObserver: global.MutationObserver,
      },
    },
    globals: true,
    fileParallelism: false,
    resolver: 'vitest-resolve-absolute-imports',
  },
});