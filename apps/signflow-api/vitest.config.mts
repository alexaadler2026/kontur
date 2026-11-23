import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
import { maxWorkers } from '../../vitest-base.config.mjs';
import { tscWithSwaggerPlugin } from './vite-plugin-tsc.mjs';

interface ProjectJson {
  targets: {
    build: {
      options: { transformers: { options: Record<string, unknown> }[] };
    };
  };
}

// The @nestjs/swagger plugin options live once, in the build target; tests reuse them.
const project = JSON.parse(
  readFileSync(new URL('./project.json', import.meta.url), 'utf8'),
) as ProjectJson;
const swaggerOptions = project.targets.build.options.transformers[0].options;

/** Shared by the unit tests (here) and the integration tests (vitest.integration.config.mts). */
export function apiTestConfig(test: {
  name: string;
  include: string[];
  testTimeout?: number;
  hookTimeout: number;
}) {
  return defineConfig({
    root: import.meta.dirname,
    // Vite's own TypeScript transform is switched off: our plugin compiles instead.
    oxc: false,
    plugins: [
      tscWithSwaggerPlugin(
        fileURLToPath(new URL('./tsconfig.spec.json', import.meta.url)),
        swaggerOptions,
      ),
    ],
    test: {
      environment: 'node',
      setupFiles: ['reflect-metadata'],
      maxWorkers,
      ...test,
    },
  });
}

export default apiTestConfig({
  name: 'signflow-api',
  include: ['src/**/*.spec.ts'],
  // beforeAll creates a whole Nest app; on a cold start, with test files running in
  // parallel, loading Nest, Express and Swagger can take longer than the default 10 s.
  hookTimeout: 30_000,
});
