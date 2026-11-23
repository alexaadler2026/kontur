import { defineConfig } from 'vitest/config';
import { maxWorkers } from '../../../vitest-base.config.mjs';

// Plain Node unit tests: password hashing and password rules, no Nest application.
export default defineConfig({
  test: {
    name: 'auth-server',
    maxWorkers,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
