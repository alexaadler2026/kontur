import { apiTestConfig } from './vitest.config.mjs';

// Integration tests (*.int-spec.ts): each file starts its own PostgreSQL in Docker
// (Testcontainers). Target test-integration; needs a running Docker, CI has one.
export default apiTestConfig({
  name: 'signflow-api-integration',
  include: ['src/**/*.int-spec.ts'],
  // Pulling the image the first time and starting PostgreSQL take more than 10 s.
  hookTimeout: 180_000,
  testTimeout: 30_000,
});
