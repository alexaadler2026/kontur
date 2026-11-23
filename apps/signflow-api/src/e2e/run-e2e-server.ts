import { Argon2idPasswordHasher } from '@adlersoft/auth-server';
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import type { Writable } from 'node:stream';
import { createPrismaClient } from '../database/prisma.service.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../database/testing/test-database.js';
import { parseE2eUser, seedE2eUser } from './e2e-user.js';

export interface E2eServerOptions {
  /** apps/signflow-e2e/src/support/e2e-user.json */
  userFile: string;
  /** apps/signflow-api: prisma.config.ts, schema and migrations. */
  projectRoot: string;
  /** dist/apps/signflow-api/src/main.js — the built API, as production runs it. */
  apiEntry: string;
  port: string;
  stderr: Writable;
}

/**
 * The API for e2e (task 8-1): a fresh PostgreSQL in Docker (Testcontainers) with all
 * migrations and the test account, then the built API on it. Lives as long as this
 * process: the API stopping stops the database; a SIGINT/SIGTERM stops both; a hard kill
 * is cleaned up by Testcontainers' reaper (Ryuk). Returns the exit code.
 */
export async function runE2eServer(options: E2eServerOptions): Promise<number> {
  let db: TestDatabase;
  try {
    // Read first: a broken account file must not wait for Docker.
    const user = parseE2eUser(readFileSync(options.userFile, 'utf8'));
    db = await startTestDatabase(options.projectRoot);
    const prisma = createPrismaClient(db.url);
    try {
      await seedE2eUser(prisma, user, new Argon2idPasswordHasher());
    } finally {
      await prisma.$disconnect();
    }
  } catch (error) {
    options.stderr.write(
      `e2e server: ${error instanceof Error ? error.message : String(error)}\n` +
        'It needs a running Docker (the same as the integration tests).\n',
    );
    return 1;
  }

  const api = spawn(process.execPath, [options.apiEntry], {
    // Not a setting read past loadConfig() (ADR-0009): the child gets this process's
    // environment (PATH, Docker, …) plus the two settings the API itself then loads.
    // eslint-disable-next-line no-restricted-properties
    env: { ...process.env, DATABASE_URL: db.url, PORT: options.port },
    stdio: 'inherit',
  });
  const stopApi = () => api.kill('SIGTERM');
  process.once('SIGINT', stopApi);
  process.once('SIGTERM', stopApi);

  const code = await new Promise<number>((done) =>
    api.on('exit', (exitCode) => done(exitCode ?? 0)),
  );
  await db.container.stop();
  return code;
}
