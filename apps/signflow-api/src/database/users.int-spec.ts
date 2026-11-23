import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';
import { createPrismaClient } from './prisma.service.js';
import {
  startTestDatabase,
  type TestDatabase,
} from './testing/test-database.js';

describe('users table on a real PostgreSQL (all migrations applied)', () => {
  let db: TestDatabase;
  let prisma: ReturnType<typeof createPrismaClient>;

  beforeAll(async () => {
    db = await startTestDatabase();
    prisma = createPrismaClient(db.url);
  });

  afterAll(async () => {
    await prisma?.$disconnect();
    await db?.container.stop();
  });

  it('the database generates the id as UUIDv7 and sets both timestamps (ADR-0008)', async () => {
    const user = await prisma.user.create({
      data: { email: 'erika@beispiel.de' },
    });

    // UUIDv7: the 13th hex digit is the version, 7.
    expect(user.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(user.createdAt).toBeInstanceOf(Date);
    expect(user.updatedAt).toBeInstanceOf(Date);
  });

  it('e-mail is unique regardless of case: Anna@Beispiel.de, then anna@beispiel.de → conflict', async () => {
    await prisma.user.create({ data: { email: 'Anna@Beispiel.de' } });

    const second = prisma.user.create({ data: { email: 'anna@beispiel.de' } });

    await expect(second).rejects.toBeInstanceOf(
      Prisma.PrismaClientKnownRequestError,
    );
    await expect(second).rejects.toMatchObject({ code: 'P2002' });
  });

  it('finds a user whatever case the e-mail is typed in', async () => {
    await prisma.user.create({ data: { email: 'Jonas.Weber@Beispiel.de' } });

    const found = await prisma.user.findUnique({
      where: { email: 'jonas.weber@beispiel.de' },
    });

    // Stored as typed: the case the user chose is kept for display.
    expect(found?.email).toBe('Jonas.Weber@Beispiel.de');
  });

  it('sorts German and Russian text the way people expect (Debian image, not alpine)', async () => {
    const rows = await prisma.$queryRaw<{ word: string }[]>`
      SELECT word FROM (VALUES ('Zebra'), ('Äpfel'), ('apfel'), ('Яблоко'), ('Жук'), ('Ёж'), ('Еда'))
        AS words(word)
      ORDER BY word`;

    expect(rows.map((row) => row.word)).toEqual([
      'apfel',
      'Äpfel',
      'Zebra',
      'Еда',
      'Ёж',
      'Жук',
      'Яблоко',
    ]);
  });
});
