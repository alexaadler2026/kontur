import { Argon2idPasswordHasher } from '@adlersoft/auth-server';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../database/prisma.service.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../database/testing/test-database.js';
import { PassThrough } from 'node:stream';
import { createAdmin, runCreateAdmin } from './create-admin.js';

// Task 7d, owner 2026-11-23: the first user is created by a command; the password is typed
// twice, checked by the password rules, stored only as an Argon2id hash; an existing user
// is never overwritten. Admin flag: task 9. A one-time link instead of a password: task 10.

const PASSWORD = 'Grüne Berge über Bischkek';
const hasher = new Argon2idPasswordHasher();

describe('createAdmin on a real PostgreSQL', () => {
  let db: TestDatabase;
  let prisma: ReturnType<typeof createPrismaClient>;
  let printed: string[];

  /** Answers the password questions from a script, like a person at the keyboard. */
  const typing = (...answers: string[]) => {
    const asked: string[] = [];
    return {
      asked,
      deps: {
        prisma,
        hasher,
        askPassword: async (prompt: string) => {
          asked.push(prompt);
          const answer = answers.shift();
          if (answer === undefined) throw new Error('no more answers');
          return answer;
        },
        print: (line: string) => printed.push(line),
      },
    };
  };

  beforeAll(async () => {
    db = await startTestDatabase();
    prisma = createPrismaClient(db.url);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await db?.container.stop();
  });

  beforeEach(async () => {
    await prisma.user.deleteMany();
    printed = [];
  });

  it('password typed twice → the user exists, with an Argon2id hash that verifies', async () => {
    const { deps } = typing(PASSWORD, PASSWORD);

    expect(await createAdmin('Aigul.Sadykova@Firma.kg', deps)).toBe('created');

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'aigul.sadykova@firma.kg' },
    });
    expect(user.email).toBe('Aigul.Sadykova@Firma.kg');
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(await hasher.verify(user.passwordHash ?? '', PASSWORD)).toBe(true);
    expect(printed.join('\n')).toMatch(/Created Aigul\.Sadykova@Firma\.kg/);
  });

  // Owner, 2026-11-24: two Ctrl+V pastes gave "do not match" on Windows. Under
  // `pnpm nx run … create-admin` the terminal input arrives merged: both pastes and both
  // Enters (here as \r\n, a copied line) in one chunk. The whole command must take it.
  it('the whole command: both pastes merged in one chunk, ending in \\r\\n → created', async () => {
    let shown = '';
    const stdin = Object.assign(new PassThrough(), {
      isTTY: true,
      setRawMode: () => stdin,
    });
    const stdout = new PassThrough().on('data', (c: Buffer) => (shown += c));
    const stderr = new PassThrough().on('data', (c: Buffer) => (shown += c));

    const run = runCreateAdmin(['aigul@firma.kg'], {
      stdin,
      stdout,
      stderr,
      env: { DATABASE_URL: db.url },
    });
    stdin.write(`${PASSWORD}\r\n${PASSWORD}\r\n`);

    expect(await run).toBe(0);
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'aigul@firma.kg' },
    });
    expect(await hasher.verify(user.passwordHash ?? '', PASSWORD)).toBe(true);
    expect(shown).not.toContain('Grüne');
    expect(shown).not.toContain('do not match');
  });

  it('--generate-password: nothing typed; the user signs in with the password shown once', async () => {
    let logged = ''; // stdout + stderr: what Nx or a log may keep
    let onConsole = ''; // the console itself, past Nx and any log
    const stdin = Object.assign(new PassThrough(), {
      isTTY: false, // not read at all: nothing has to be typed
      setRawMode: () => {
        throw new Error('stdin must not be read');
      },
    });
    const stdout = new PassThrough().on('data', (c: Buffer) => (logged += c));
    const stderr = new PassThrough().on('data', (c: Buffer) => (logged += c));

    const code = await runCreateAdmin(
      ['aigul@firma.kg', '--generate-password'],
      {
        stdin,
        stdout,
        stderr,
        env: { DATABASE_URL: db.url },
        openConsole: () => (text: string) => (onConsole += text),
      },
    );

    expect(code).toBe(0);
    const line = onConsole
      .split('\n')
      .find((l) => l.startsWith('Password: ')) as string;
    const password = line.slice('Password: '.length);
    expect(password.length).toBeGreaterThanOrEqual(24);
    expect(onConsole.split(password)).toHaveLength(2); // shown exactly once
    expect(onConsole).toMatch(/save it now.*will not be shown again/i);
    expect(logged).toMatch(/Created aigul@firma\.kg/);
    expect(logged).not.toContain(password); // never through stdout/stderr
    const user = await prisma.user.findUniqueOrThrow({
      where: { email: 'aigul@firma.kg' },
    });
    expect(await hasher.verify(user.passwordHash ?? '', password)).toBe(true);
  });

  it('the password is never printed', async () => {
    const { deps } = typing('kurz', PASSWORD, 'falsch', PASSWORD, PASSWORD);

    await createAdmin('aigul@firma.kg', deps);

    const all = printed.join('\n');
    for (const secret of ['kurz', 'falsch', 'Grüne', 'Bischkek']) {
      expect(all).not.toContain(secret);
    }
  });

  it('the user already exists (any case) → refused before asking, nothing changed', async () => {
    const before = await prisma.user.create({
      data: { email: 'aigul@firma.kg', passwordHash: 'keep-me' },
    });
    const { deps, asked } = typing(PASSWORD, PASSWORD);

    expect(await createAdmin('AIGUL@firma.kg', deps)).toBe('exists');

    expect(asked).toEqual([]);
    expect(printed.join('\n')).toMatch(/already exists/);
    const after = await prisma.user.findUniqueOrThrow({
      where: { id: before.id },
    });
    expect(after.passwordHash).toBe('keep-me');
  });

  it('a password breaking the rules is explained and asked again', async () => {
    const { deps, asked } = typing(
      'zu kurz',
      'aigul-firma-kg-ist-mein-passwort',
      PASSWORD,
      PASSWORD,
    );

    expect(await createAdmin('aigul@firma.kg', deps)).toBe('created');

    const all = printed.join('\n');
    expect(all).toMatch(/at least 15 characters/);
    expect(all).toMatch(/e-mail address/);
    expect(asked).toHaveLength(4);
  });

  it('the two entries differ → asked again', async () => {
    const { deps } = typing(PASSWORD, `${PASSWORD}!`, PASSWORD, PASSWORD);

    expect(await createAdmin('aigul@firma.kg', deps)).toBe('created');
    expect(printed.join('\n')).toMatch(/do not match/);
  });

  it('"ü" typed in two Unicode forms counts as the same password (NFC)', async () => {
    const decomposed = PASSWORD.normalize('NFD');
    expect(decomposed).not.toBe(PASSWORD);
    const { deps } = typing(PASSWORD, decomposed);

    expect(await createAdmin('aigul@firma.kg', deps)).toBe('created');
  });

  it('three failed rounds → gives up, no user created', async () => {
    const { deps } = typing('kurz', 'kurz', 'kurz');

    expect(await createAdmin('aigul@firma.kg', deps)).toBe('gave_up');
    expect(await prisma.user.count()).toBe(0);
  });
});
