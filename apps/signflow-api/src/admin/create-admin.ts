import type { Writable } from 'node:stream';
import {
  Argon2idPasswordHasher,
  checkPassword,
  type PasswordHasher,
  type PasswordProblem,
} from '@adlersoft/auth-server';
import { isEmail } from 'class-validator';
import { ConfigError, loadConfig } from '../config/load-config.js';
import { createPrismaClient } from '../database/prisma.service.js';
import { Prisma, type PrismaClient } from '../generated/prisma/client.js';
import {
  HiddenLineReader,
  InputAbortedError,
  type TerminalInput,
} from './read-hidden-line.js';
import { generatePassword } from './generate-password.js';
import { openConsole, type ConsoleWriter } from './open-console.js';

/**
 * The first user (task 7d, owner 2026-11-23). Run on the machine with the database:
 *   pnpm nx run signflow-api:create-admin <e-mail>
 *   (server, task 23: docker compose run --rm api node dist/.../create-admin.js <e-mail>)
 * The password is typed twice in the terminal and never shown, never taken from an
 * argument, a variable or a pipe — those end up in the shell history or in logs. An
 * existing user is never overwritten. Admin flag: task 9. ADR-0010 wants a one-time link
 * instead of a password; until invitations exist (task 10) this is the agreed deviation.
 */

const ROUNDS = 3;

const USAGE = [
  'Usage: pnpm nx run signflow-api:create-admin <e-mail> [--generate-password]',
  '  Without the option, the password is asked for interactively (twice) and never shown.',
  '  --generate-password: a random password is made and shown ONCE on this terminal.',
].join('\n');

const GENERATE = '--generate-password';

/** What each rule violation means, for the person at the terminal. */
const PROBLEM_TEXT: Record<PasswordProblem, string> = {
  too_short: 'Too short: at least 15 characters.',
  too_long: 'Too long: at most 128 characters.',
  common: 'Too common: it is on the list of frequently used passwords.',
  contains_email: 'Contains the e-mail address or its part before "@".',
  contains_product: 'Contains a product name (SignFlow, Belegscan, Kontur).',
};

export interface CreateAdminDeps {
  prisma: PrismaClient;
  hasher: PasswordHasher;
  /** Asks for a password without showing it. */
  askPassword(prompt: string): Promise<string>;
  /** One line for the person at the terminal. Never given the password. */
  print(line: string): void;
  /**
   * --generate-password (owner, 2026-11-24): the password is made here instead of asked,
   * and shown once with `showSecret` — straight on the console, never through `print`
   * (stdout may be a pipe into Nx or a log). Left out: asked twice.
   */
  generated?: {
    generatePassword(email: string): string;
    showSecret(line: string): void;
  };
}

export type CreateAdminResult = 'created' | 'exists' | 'gave_up';

/**
 * Creates the user with a password typed twice and checked by the password rules
 * (ADR-0010). An existing e-mail (any case) is refused before the password is asked.
 */
export async function createAdmin(
  email: string,
  deps: CreateAdminDeps,
): Promise<CreateAdminResult> {
  const exists = () => {
    deps.print(
      `A user with the e-mail ${email} already exists. Nothing changed.`,
    );
    return 'exists' as const;
  };
  if (await deps.prisma.user.findUnique({ where: { email } })) return exists();

  const password = deps.generated
    ? deps.generated.generatePassword(email)
    : await askNewPassword(email, deps);
  if (password === undefined) {
    deps.print(`No user created: no valid password after ${ROUNDS} tries.`);
    return 'gave_up';
  }

  try {
    await deps.prisma.user.create({
      data: { email, passwordHash: await deps.hasher.hash(password) },
    });
  } catch (error) {
    // Created by someone else between the check and now: still never overwritten.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      return exists();
    }
    throw error;
  }
  deps.print(`Created ${email}. Sign in with this e-mail and the password.`);
  if (deps.generated) {
    // The only place a password is ever shown: once, on the console itself, only after
    // the user really exists.
    deps.generated.showSecret('Save it now — it will not be shown again:');
    deps.generated.showSecret(`Password: ${password}`);
  }
  return 'created';
}

/** Up to three rounds of "type it, check the rules, type it again". */
async function askNewPassword(
  email: string,
  deps: CreateAdminDeps,
): Promise<string | undefined> {
  for (let round = 0; round < ROUNDS; round++) {
    const first = await deps.askPassword(
      'Password (15–128 characters, not shown): ',
    );
    const problems = checkPassword(first, { email });
    if (problems.length > 0) {
      for (const problem of problems) deps.print(PROBLEM_TEXT[problem]);
      continue;
    }
    const second = await deps.askPassword('Repeat the password: ');
    if (first.normalize('NFC') !== second.normalize('NFC')) {
      deps.print('The two entries do not match.');
      continue;
    }
    return first;
  }
  return undefined;
}

export interface CommandIo {
  stdin: TerminalInput;
  stdout: Writable;
  stderr: Writable;
  /**
   * The environment for the settings (tests). Left out, loadConfig() reads the process's
   * own, as in main.ts (ADR-0009: nothing else reads it).
   */
  env?: Record<string, string | undefined>;
  /** The console itself, for the generated password (tests). Left out: open-console.ts. */
  openConsole?: () => ConsoleWriter | null;
}

/** The command around createAdmin: arguments, terminal, settings, database. Exit code. */
export async function runCreateAdmin(
  args: readonly string[],
  io: CommandIo,
): Promise<number> {
  const fail = (message: string, code: number) => {
    io.stderr.write(`${message}\n`);
    return code;
  };
  // The e-mail and at most the one known option: a password typed after the e-mail must not
  // be accepted (and is not repeated in the message).
  const generate = args.includes(GENERATE);
  const rest = args.filter((arg) => arg !== GENERATE);
  if (rest.length !== 1 || args.length !== rest.length + (generate ? 1 : 0)) {
    return fail(USAGE, 2);
  }
  const [email] = rest;
  if (email.startsWith('-') || !isEmail(email)) {
    return fail(
      email.startsWith('-')
        ? USAGE
        : `"${email}" is not a valid e-mail address.\n${USAGE}`,
      2,
    );
  }
  const showOnConsole = generate ? (io.openConsole ?? openConsole)() : null;
  if (generate && !showOnConsole) {
    return fail(
      'create-admin --generate-password: the password is shown only on a terminal, ' +
        'never into a pipe or file (it would stay in a log).',
      2,
    );
  }
  if (!generate && !io.stdin.isTTY) {
    return fail(
      'create-admin needs an interactive terminal: the password is typed, never piped in ' +
        '(a pipe like "echo … |" keeps it in the shell history).',
      2,
    );
  }

  let config;
  try {
    config = io.env ? loadConfig(io.env) : loadConfig();
  } catch (error) {
    if (error instanceof ConfigError) return fail(error.message, 1);
    throw error;
  }

  const prisma = createPrismaClient(config.DATABASE_URL);
  // One reader for every prompt: keys that arrive after an Enter (a merged paste) belong to
  // the next prompt and must not be lost (read-hidden-line.ts).
  // With --generate-password nothing is read: stdin stays untouched.
  const terminal = generate ? null : new HiddenLineReader(io.stdin, io.stdout);
  try {
    const result = await createAdmin(email, {
      prisma,
      hasher: new Argon2idPasswordHasher(),
      askPassword: (prompt) =>
        terminal
          ? terminal.read(prompt)
          : Promise.reject(new InputAbortedError()),
      print: (line) => io.stdout.write(`${line}\n`),
      ...(showOnConsole
        ? {
            generated: {
              generatePassword,
              showSecret: (line: string) => showOnConsole(`${line}\n`),
            },
          }
        : {}),
    });
    return result === 'created' ? 0 : 1;
  } catch (error) {
    if (error instanceof InputAbortedError) return fail('Aborted.', 130);
    // The name only: a database error's message may quote sent values (journal 032).
    return fail(
      `Failed: ${error instanceof Error ? error.name : 'unknown error'}.`,
      1,
    );
  } finally {
    terminal?.close();
    await prisma.$disconnect();
  }
}
