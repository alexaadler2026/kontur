import { readFileSync } from 'node:fs';
import type { Writable } from 'node:stream';
import { type E2eUser, parseE2eUser } from './e2e-user.js';

interface StepResult {
  status: number | null;
  stderr: string;
}

export interface E2eDatabaseDeps {
  /** apps/signflow-e2e/src/support/e2e-user.json */
  userFile: string;
  databaseUrl: string;
  /** The host port of compose.e2e.yaml. */
  port: number;
  /** `docker compose -p kontur-e2e -f compose.e2e.yaml <args>` */
  compose(args: string[]): StepResult;
  portFree(port: number): Promise<boolean>;
  /** `prisma migrate deploy` on databaseUrl — as production does (ADR-0014). */
  migrate(databaseUrl: string): StepResult;
  seed(databaseUrl: string, user: E2eUser): Promise<void>;
  stderr: Writable;
}

/**
 * The database for e2e (owner, 2026-11-24): a compose service (compose.e2e.yaml) on tmpfs,
 * fresh for every run, with all migrations and the test account. This process ends when it
 * is ready — the container keeps running (a Testcontainers container would be removed by
 * its reaper ~10 s after this process ends, measured 2026-11-25). Playwright's
 * globalTeardown removes it. Returns the exit code.
 */
export async function prepareE2eDatabase(
  deps: E2eDatabaseDeps,
): Promise<number> {
  const fail = (message: string) => {
    deps.stderr.write(`e2e database: ${message}\n`);
    return 1;
  };
  let user: E2eUser;
  try {
    // Read first: a broken account file must not wait for Docker.
    user = parseE2eUser(readFileSync(deps.userFile, 'utf8'));
  } catch (error) {
    return fail(error instanceof Error ? error.message : String(error));
  }

  // A leftover of the last run (a cancelled run skips the teardown) is removed first.
  deps.compose(['down', '--volumes', '--remove-orphans']);
  if (!(await deps.portFree(deps.port))) {
    return fail(
      `port ${deps.port} is used by another program. Stop it, or find it with ` +
        `"netstat -ano | findstr :${deps.port}" (Windows) / "lsof -i :${deps.port}".`,
    );
  }

  const up = deps.compose(['up', '--detach', '--wait', '--wait-timeout', '90']);
  if (up.status !== 0) {
    return fail(
      `the container did not start (is Docker running?).\n${up.stderr.trim()}`,
    );
  }
  const migrate = deps.migrate(deps.databaseUrl);
  if (migrate.status !== 0) {
    return fail(`migrations failed.\n${migrate.stderr.trim()}`);
  }
  try {
    await deps.seed(deps.databaseUrl, user);
  } catch (error) {
    // The name only: a database error's message may quote sent values (journal 032).
    return fail(
      `seeding the test account failed: ${error instanceof Error ? error.name : 'error'}`,
    );
  }
  return 0;
}
