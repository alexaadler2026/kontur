import { spawnSync } from 'node:child_process';
import { PassThrough } from 'node:stream';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { runCreateAdmin } from './create-admin.js';

// The command's own rules (owner, 2026-11-23), checked before any database connection:
// the e-mail is the one argument; the password only from an interactive terminal.

function io(options: { tty: boolean }) {
  const stdin = Object.assign(new PassThrough(), {
    isTTY: options.tty,
    setRawMode: () => undefined,
  });
  let out = '';
  let err = '';
  const stdout = new PassThrough().on('data', (c: Buffer) => (out += c));
  const stderr = new PassThrough().on('data', (c: Buffer) => (err += c));
  return {
    stdin,
    stdout,
    stderr,
    // Settings come from here; a password variable is never read (there is none).
    env: { DATABASE_URL: 'postgresql://offline:offline@127.0.0.1:1/offline' },
    out: () => out,
    err: () => err,
  };
}

// The built command itself, as the owner and the server run it (the test target builds
// first). Here stdin is a pipe, so it must stop at the terminal check — after starting
// cleanly. Catches what the function tests cannot: the entry file's own imports.
describe('the built command (dist/apps/signflow-api/src/create-admin.js)', () => {
  it('starts and refuses a piped stdin with exit code 2', () => {
    const entry = fileURLToPath(
      new URL(
        '../../../../dist/apps/signflow-api/src/create-admin.js',
        import.meta.url,
      ),
    );
    const run = spawnSync(process.execPath, [entry, 'aigul@firma.kg'], {
      input: 'Grüne Berge über Bischkek\n',
      encoding: 'utf8',
    });

    expect(run.stderr).toMatch(/interactive terminal/);
    expect(run.status).toBe(2);
  });
});

describe('runCreateAdmin: arguments and terminal', () => {
  it('no e-mail → usage, exit code 2', async () => {
    const t = io({ tty: true });

    expect(await runCreateAdmin([], t)).toBe(2);
    expect(t.err()).toMatch(/Usage: .*create-admin <e-mail>/);
  });

  it('more than one argument (e.g. a password after the e-mail) → refused, exit 2, nothing echoed', async () => {
    const t = io({ tty: true });

    expect(
      await runCreateAdmin(['aigul@firma.kg', 'Grüne Berge über Bischkek'], t),
    ).toBe(2);
    expect(t.err()).toMatch(/Usage/);
    expect(t.err() + t.out()).not.toContain('Grüne');
  });

  it('not an e-mail address → exit 2', async () => {
    const t = io({ tty: true });

    expect(await runCreateAdmin(['aigul'], t)).toBe(2);
    expect(t.err()).toMatch(/not a valid e-mail address/);
  });

  it('stdin is not a terminal (piped: echo pw | …) → refused, exit 2: the password would be in the shell history', async () => {
    const t = io({ tty: false });

    expect(await runCreateAdmin(['aigul@firma.kg'], t)).toBe(2);
    expect(t.err()).toMatch(/interactive terminal/);
  });

  // Owner, 2026-11-24: --generate-password — the command makes the password and shows it
  // once — straight on the console, never through stdout (under `nx run` on Windows stdout
  // is Nx's pipe, measured 2026-11-24). No console to show it on → nothing is created.
  it('--generate-password without a console to show it on → refused, exit 2', async () => {
    const t = io({ tty: true });

    expect(
      await runCreateAdmin(['aigul@firma.kg', '--generate-password'], {
        ...t,
        openConsole: () => null,
      }),
    ).toBe(2);
    expect(t.err()).toMatch(/shown only on a terminal/);
  });

  it('an unknown option → usage, exit 2', async () => {
    const t = io({ tty: true });

    expect(await runCreateAdmin(['aigul@firma.kg', '--password=x'], t)).toBe(2);
    expect(t.err()).toMatch(/Usage/);
    expect(t.err()).not.toContain('--password=x');
  });

  it('a wrong setting stops it with the message naming the variable, exit 1', async () => {
    const t = io({ tty: true });

    expect(await runCreateAdmin(['aigul@firma.kg'], { ...t, env: {} })).toBe(1);
    expect(t.err()).toMatch(/DATABASE_URL must be a postgresql:\/\/ URL/);
  });
});
