import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test, type TestingModuleBuilder } from '@nestjs/testing';
import { AppModule } from '../app/app.module.js';
import { configureApp } from '../app/configure-app.js';
import type { AppConfig } from '../config/load-config.js';
import { offlineConfig } from '../config/offline-config.js';
import { CapturingLogger } from './capturing-logger.js';

/**
 * The whole API, as main.ts builds it, on the given database; its log is captured.
 * `settings` overrides single settings (e.g. a higher request rate for a test file that
 * signs in many times from one address); `override` replaces providers (e.g. a hasher the
 * test controls).
 */
export async function startApiOn(
  databaseUrl: string,
  extra: ModuleMetadata['imports'] = [],
  settings: Partial<AppConfig> = {},
  override: (builder: TestingModuleBuilder) => TestingModuleBuilder = (b) => b,
): Promise<{ app: INestApplication; logger: CapturingLogger }> {
  const logger = new CapturingLogger();
  const moduleRef = await override(
    Test.createTestingModule({
      imports: [
        AppModule.forRoot(
          Object.freeze({
            ...offlineConfig(),
            PORT: 0,
            DATABASE_URL: databaseUrl,
            ...settings,
          }),
        ),
        ...extra,
      ],
    }),
  ).compile();
  const app = configureApp(moduleRef.createNestApplication({ logger }));
  await app.init();
  return { app, logger };
}
