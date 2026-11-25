// Entry of the e2e database (owner, 2026-11-24), run from the workspace root:
//   nx run signflow-api:e2e-database          prepare (fresh, migrated, test account)
//   node dist/apps/signflow-api/src/e2e-database.js --down   remove (Playwright teardown)
// Never part of production (task 22 keeps it out of the image).
// First, as in main.ts: the settings class (load-config) uses decorators that need Reflect.
import 'reflect-metadata';
import { Argon2idPasswordHasher } from '@adlersoft/auth-server';
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { createServer } from 'node:net';
import { resolve } from 'node:path';
import { loadConfig } from './config/load-config.js';
import { createPrismaClient } from './database/prisma.service.js';
import { prisma } from './database/testing/test-database.js';
import { seedE2eUser } from './e2e/e2e-user.js';
import { prepareE2eDatabase } from './e2e/prepare-e2e-database.js';

/** docker from PATH; on Windows also Docker Desktop's own folder (not always on PATH). */
function dockerBinary(): string {
  const desktop =
    'C:\\Program Files\\Docker\\Docker\\resources\\bin\\docker.exe';
  const onPath = spawnSync('docker', ['--version'], { encoding: 'utf8' });
  if (onPath.status === 0) return 'docker';
  return process.platform === 'win32' && existsSync(desktop)
    ? desktop
    : 'docker';
}

const docker = dockerBinary();
const compose = (args: string[]) => {
  const run = spawnSync(
    docker,
    ['compose', '-p', 'kontur-e2e', '-f', resolve('compose.e2e.yaml'), ...args],
    { encoding: 'utf8' },
  );
  return { status: run.status, stderr: run.stderr ?? String(run.error ?? '') };
};

if (process.argv.includes('--down')) {
  process.exitCode =
    compose(['down', '--volumes', '--remove-orphans']).status ?? 1;
} else {
  const { DATABASE_URL } = loadConfig();
  const port = Number(new URL(DATABASE_URL).port);
  process.exitCode = await prepareE2eDatabase({
    userFile: resolve('apps/signflow-e2e/src/support/e2e-user.json'),
    databaseUrl: DATABASE_URL,
    port,
    compose,
    portFree: (p) =>
      new Promise((done) => {
        const probe = createServer()
          .once('error', () => done(false))
          .once('listening', () => probe.close(() => done(true)));
        probe.listen(p, '127.0.0.1');
      }),
    migrate: (url) => {
      const run = prisma(
        ['migrate', 'deploy'],
        { DATABASE_URL: url },
        resolve('apps/signflow-api'),
      );
      // Prisma prints its errors to stdout too: both, so the reason is never empty.
      return { status: run.status, stderr: `${run.stdout}\n${run.stderr}` };
    },
    seed: async (url, user) => {
      const client = createPrismaClient(url);
      try {
        await seedE2eUser(client, user, new Argon2idPasswordHasher());
      } finally {
        await client.$disconnect();
      }
    },
    stderr: process.stderr,
  });
}
// Exit now: after a failed step something kept the process alive, and Playwright waited
// its full 2 minutes for a database that had already failed (measured 2026-11-25).
process.exit(process.exitCode ?? 0);
