import { defineConfig } from 'vitest/config';
import { maxWorkers } from '../../../vitest-base.config.mjs';

// Plain Node unit tests of the building blocks; no Nest application is started here.
export default defineConfig({
  // class-validator rules are legacy (experimentalDecorators) decorators; oxc, Vite's
  // TypeScript transform, compiles them only when asked. The Swagger plugin is not needed:
  // these tests check validation, not the OpenAPI document (the API's api-check does).
  oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } },
  test: {
    name: 'api-kit',
    maxWorkers,
    environment: 'node',
    include: ['src/**/*.spec.ts'],
  },
});
