import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';
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

export default defineConfig({
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
    name: 'signflow-api',
    environment: 'node',
    include: ['src/**/*.spec.ts'],
    setupFiles: ['reflect-metadata'],
    // beforeAll creates a whole Nest app; on a cold start, with test files running in
    // parallel, loading Nest, Express and Swagger can take longer than the default 10 s.
    hookTimeout: 30_000,
  },
});
