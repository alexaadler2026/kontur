import { checkPassword, type PasswordHasher } from '@adlersoft/auth-server';
import { isEmail } from 'class-validator';
import type { PrismaClient } from '../generated/prisma/client.js';

/** The test account of the e2e database (apps/signflow-e2e/src/support/e2e-user.json). */
export interface E2eUser {
  email: string;
  password: string;
}

function fail(reason: string): never {
  throw new Error(`e2e account: ${reason}`);
}

/**
 * Reads the e2e account file. The password must follow the rules of 7a like any real
 * one (owner, 2026-11-23): a weak test password would hide a broken rule. Any problem stops
 * the e2e server with this message instead of starting with a broken account.
 * Keys other than email and password (the file's "//" comment) are ignored.
 */
export function parseE2eUser(json: string): E2eUser {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch {
    fail('the file is not valid JSON');
  }
  const { email, password } = (data ?? {}) as Record<string, unknown>;
  if (typeof email !== 'string' || !isEmail(email)) {
    fail('"email" must be an e-mail address');
  }
  if (typeof password !== 'string') {
    fail('"password" is missing');
  }
  const problems = checkPassword(password, { email });
  if (problems.length > 0) {
    fail(`the password breaks the password rules (${problems.join(', ')})`);
  }
  return { email, password };
}

/** Creates the account in a fresh e2e database, with a real Argon2id hash. */
export async function seedE2eUser(
  prisma: PrismaClient,
  user: E2eUser,
  hasher: PasswordHasher,
): Promise<void> {
  await prisma.user.create({
    data: { email: user.email, passwordHash: await hasher.hash(user.password) },
  });
}
