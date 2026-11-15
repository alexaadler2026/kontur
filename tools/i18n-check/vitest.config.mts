import { defineConfig } from 'vitest/config';

// Plain Node tests (no browser, no Angular): the checker is a pure function over JSON files.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.mts'],
  },
});
