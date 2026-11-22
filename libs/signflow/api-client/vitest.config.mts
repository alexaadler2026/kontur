import { defineConfig } from 'vitest/config';

// Plain Node tests of the hand-written helpers next to the generated client (no Angular).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
