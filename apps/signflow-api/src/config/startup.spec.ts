import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// The built server, exactly as it runs in production (the test target depends on build).
const main = fileURLToPath(
  new URL('../../../../dist/apps/signflow-api/src/main.js', import.meta.url),
);

describe('start of the built API with a wrong setting (ADR-0009)', () => {
  it('the build exists (guard: the next test must start the real server)', () => {
    expect(existsSync(main)).toBe(true);
  });

  it('PORT=abc: the process exits with code 1 and names the variable, not the value', () => {
    const run = spawnSync(process.execPath, [main], {
      env: { ...process.env, PORT: 'abc' },
      encoding: 'utf8',
      timeout: 20_000,
    });

    expect(run.status).toBe(1);
    expect(run.stderr).toContain('PORT must be an integer from 1 to 65535');
    expect(run.stderr).not.toContain('abc');
    // It stopped before Nest started: nothing was listening.
    expect(run.stdout).not.toContain('SignFlow API on');
    // A real process: Node loads Nest's modules before main.ts runs, which can take a few
    // seconds while other test files run in parallel.
  }, 20_000);
});
