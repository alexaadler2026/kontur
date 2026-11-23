import { defineConfig } from 'vitest/config';
import { maxWorkers } from '../../vitest-base.config.mjs';

// Plain Node tests (no browser, no Angular): the checker is a pure function over JSON files.
export default defineConfig({
  test: {
    maxWorkers,
    environment: 'node',
    include: ['src/**/*.spec.mts'],
  },
});
