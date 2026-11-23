import { Argon2idPasswordHasher } from '@adlersoft/auth-server';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createPrismaClient } from '../database/prisma.service.js';
import {
  startTestDatabase,
  type TestDatabase,
} from '../database/testing/test-database.js';
import { seedE2eUser } from './e2e-user.js';

// Task 8-1: the e2e database gets the test account with a real Argon2id hash, so the
// e2e sign-in goes through exactly the code production runs.

const USER = {
  email: 'e2e.nutzer@beispiel.de',
  password: 'Kranich-Wolke-Tinte-2026',
};
const hasher = new Argon2idPasswordHasher();

describe('seedE2eUser on a real PostgreSQL', () => {
  let db: TestDatabase;
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    db = await startTestDatabase();
    prisma = createPrismaClient(db.url);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await db.container.stop();
  });

  it('creates the account; the stored hash verifies the password', async () => {
    await seedE2eUser(prisma, USER, hasher);

    const user = await prisma.user.findUniqueOrThrow({
      where: { email: USER.email },
    });
    expect(user.passwordHash).toMatch(/^\$argon2id\$/);
    expect(
      await hasher.verify(user.passwordHash as string, USER.password),
    ).toBe(true);
  });
});
