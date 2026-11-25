import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Writable } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import {
  type E2eDatabaseDeps,
  prepareE2eDatabase,
} from './prepare-e2e-database.js';

// Owner, 2026-11-24: e2e starts the API through signflow-api:serve (one way to start it).
// The e2e database is a compose service (compose.e2e.yaml), fresh for every run: a
// leftover of the last run is removed first; a port used by another program is a clear
// error and exit 1, never a hang. Testcontainers does not fit: its reaper (Ryuk) removed
// the container ~10 s after the starting process ended (measured 2026-11-25).

const GOOD = {
  email: 'e2e.nutzer@beispiel.de',
  password: 'Grüne Berge über Bischkek',
};

function accountFile(account: object): string {
  const file = join(mkdtempSync(join(tmpdir(), 'e2e-db-')), 'e2e-user.json');
  writeFileSync(file, JSON.stringify(account));
  return file;
}

function setUp(overrides: Partial<E2eDatabaseDeps> = {}) {
  let errors = '';
  const calls: string[] = [];
  const deps: E2eDatabaseDeps = {
    userFile: accountFile(GOOD),
    databaseUrl: 'postgresql://e2e:e2e-local@127.0.0.1:5433/signflow_e2e',
    port: 5433,
    compose: vi.fn((args: string[]) => {
      calls.push(`compose ${args.join(' ')}`);
      return { status: 0, stderr: '' };
    }),
    portFree: vi.fn(async () => {
      calls.push('port check');
      return true;
    }),
    migrate: vi.fn(() => {
      calls.push('migrate');
      return { status: 0, stderr: '' };
    }),
    seed: vi.fn(async () => {
      calls.push('seed');
    }),
    stderr: new Writable({
      write(chunk: Buffer, _encoding, done) {
        errors += chunk.toString();
        done();
      },
    }),
    ...overrides,
  };
  return { deps, calls, errors: () => errors };
}

describe('prepareE2eDatabase', () => {
  it('in order: remove the leftover, check the port, start and wait, migrate, seed', async () => {
    const t = setUp();

    expect(await prepareE2eDatabase(t.deps)).toBe(0);
    expect(t.calls).toEqual([
      'compose down --volumes --remove-orphans',
      'port check',
      'compose up --detach --wait --wait-timeout 90',
      'migrate',
      'seed',
    ]);
  });

  it('port used by another program → clear error, exit 1, nothing started', async () => {
    const t = setUp({ portFree: vi.fn(async () => false) });

    expect(await prepareE2eDatabase(t.deps)).toBe(1);
    expect(t.errors()).toMatch(/port 5433 is used by another program/);
    expect(t.deps.compose).toHaveBeenCalledTimes(1); // only the leftover removal
    expect(t.deps.migrate).not.toHaveBeenCalled();
  });

  it('the container does not become healthy → exit 1 with the reason', async () => {
    const t = setUp({
      compose: vi.fn((args: string[]) =>
        args[0] === 'up'
          ? { status: 1, stderr: 'container is unhealthy' }
          : { status: 0, stderr: '' },
      ),
    });

    expect(await prepareE2eDatabase(t.deps)).toBe(1);
    expect(t.errors()).toMatch(/did not start.*container is unhealthy/s);
    expect(t.deps.migrate).not.toHaveBeenCalled();
  });

  it('a weak password in the account file → exit 1 before Docker', async () => {
    const t = setUp({ userFile: accountFile({ ...GOOD, password: 'kurz' }) });

    expect(await prepareE2eDatabase(t.deps)).toBe(1);
    expect(t.errors()).toContain(
      'e2e account: the password breaks the password rules (too_short)',
    );
    expect(t.deps.compose).not.toHaveBeenCalled();
  });

  it('migrations fail → exit 1, no seed', async () => {
    const t = setUp({
      migrate: vi.fn(() => ({ status: 1, stderr: 'P3009' })),
    });

    expect(await prepareE2eDatabase(t.deps)).toBe(1);
    expect(t.errors()).toMatch(/migrations failed.*P3009/s);
    expect(t.deps.seed).not.toHaveBeenCalled();
  });
});
