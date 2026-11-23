// Prisma CLI configuration (migrate, generate). The running API does not read this file:
// it gets DATABASE_URL through loadConfig() (ADR-0009).
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: { path: 'prisma/migrations' },
  datasource: {
    // `generate` needs no database; migrate commands fail with Prisma's own message
    // when DATABASE_URL is missing.
    url: process.env['DATABASE_URL'] ?? '',
    // An empty scratch database for `migrate diff --from-migrations` (the schema check):
    // Prisma replays all migrations there to compare them with schema.prisma.
    shadowDatabaseUrl: process.env['SHADOW_DATABASE_URL'],
  },
});
