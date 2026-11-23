import { spawnSync, type SpawnSyncReturns } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from '@testcontainers/postgresql';
import { POSTGRES_IMAGE } from '../postgres-image.js';

const appRoot = fileURLToPath(new URL('../../../', import.meta.url));
const prismaCli = createRequire(import.meta.url).resolve(
  'prisma/build/index.js',
);

export interface TestDatabase {
  readonly url: string;
  readonly container: StartedPostgreSqlContainer;
}

/** Runs the Prisma CLI of the repo in apps/signflow-api, with the given environment. */
export function prisma(
  args: string[],
  env: Record<string, string>,
): SpawnSyncReturns<string> {
  return spawnSync(process.execPath, [prismaCli, ...args], {
    cwd: appRoot,
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
}

/** A fresh, empty PostgreSQL in Docker (the project's one image). */
export async function startEmptyDatabase(): Promise<TestDatabase> {
  const container = await new PostgreSqlContainer(POSTGRES_IMAGE).start();
  return { url: container.getConnectionUri(), container };
}

/**
 * A fresh PostgreSQL with **all** migrations of the repo applied by
 * `prisma migrate deploy` — the same command production runs (ADR-0014). Each test file
 * gets its own database, so tests never see each other's rows.
 */
export async function startTestDatabase(): Promise<TestDatabase> {
  const db = await startEmptyDatabase();
  const migrate = prisma(['migrate', 'deploy'], { DATABASE_URL: db.url });
  if (migrate.status !== 0) {
    await db.container.stop();
    throw new Error(
      `prisma migrate deploy failed:\n${migrate.stdout}\n${migrate.stderr}`,
    );
  }
  return db;
}
