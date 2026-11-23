import { defineConfig } from 'vitest/config';
import { maxWorkers } from '../../../vitest-base.config.mjs';

// Plain Node test over the committed openapi.json (no app, no browser).
export default defineConfig({
  test: {
    maxWorkers,
    environment: 'node',
    include: ['*.spec.mts'],
  },
});
