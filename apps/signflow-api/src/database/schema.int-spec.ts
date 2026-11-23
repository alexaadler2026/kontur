import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  prisma,
  startEmptyDatabase,
  type TestDatabase,
} from './testing/test-database.js';

describe('schema.prisma and the migrations tell the same story', () => {
  let shadow: TestDatabase;

  beforeAll(async () => {
    shadow = await startEmptyDatabase();
  });

  afterAll(async () => {
    await shadow?.container.stop();
  });

  it('replaying every migration gives exactly schema.prisma (prisma migrate diff is empty)', () => {
    // Prisma replays prisma/migrations in the empty "shadow" database and compares the
    // result with schema.prisma. A change to the schema without a migration fails here.
    const diff = prisma(
      [
        'migrate',
        'diff',
        '--from-migrations',
        'prisma/migrations',
        '--to-schema',
        'prisma/schema.prisma',
        '--exit-code',
        '--script',
      ],
      { SHADOW_DATABASE_URL: shadow.url },
    );

    expect(
      diff.status,
      `schema.prisma and prisma/migrations differ. Create a migration:\n` +
        `  pnpm nx run signflow-api:prisma-migrate-dev --name=<what>\n` +
        `Missing SQL:\n${diff.stdout}${diff.stderr}`,
    ).toBe(0);
  });
});
