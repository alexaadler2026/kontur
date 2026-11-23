import { defineConfig } from 'vitest/config';
import { maxWorkers } from '../../vitest-base.config.mjs';

// Plain Node tests (no browser, no Angular): the generator is a pure function.
export default defineConfig({
  test: {
    maxWorkers,
    environment: 'node',
    include: ['src/**/*.spec.mts'],
  },
});
