import { defineConfig } from 'vitest/config';
import { maxWorkers } from '../../../vitest-base.config.mjs';

// Plain Node tests of the hand-written helpers next to the generated client (no Angular).
export default defineConfig({
  test: {
    maxWorkers,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
