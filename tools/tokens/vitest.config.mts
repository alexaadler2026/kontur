import { defineConfig } from 'vitest/config';

// Plain Node tests (no browser, no Angular): the generator is a pure function.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.mts'],
  },
});
