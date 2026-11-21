import { defineConfig } from 'vitest/config';

// Plain Node test over the committed openapi.json (no app, no browser).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['*.spec.mts'],
  },
});
