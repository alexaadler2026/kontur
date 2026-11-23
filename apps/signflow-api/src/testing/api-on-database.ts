import type { INestApplication, ModuleMetadata } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../app/app.module.js';
import { configureApp } from '../app/configure-app.js';
import { CapturingLogger } from './capturing-logger.js';

/** The whole API, as main.ts builds it, on the given database; its log is captured. */
export async function startApiOn(
  databaseUrl: string,
  extra: ModuleMetadata['imports'] = [],
): Promise<{ app: INestApplication; logger: CapturingLogger }> {
  const logger = new CapturingLogger();
  const moduleRef = await Test.createTestingModule({
    imports: [
      AppModule.forRoot(Object.freeze({ PORT: 0, DATABASE_URL: databaseUrl })),
      ...extra,
    ],
  }).compile();
  const app = configureApp(moduleRef.createNestApplication({ logger }));
  await app.init();
  return { app, logger };
}
