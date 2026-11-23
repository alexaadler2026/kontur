import { readdirSync } from 'node:fs';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../database/prisma.service.js';

/**
 * Names of the migrations this build was made with (prisma/migrations/<timestamp>_<name>).
 * The folder sits two levels above this file both in the sources and in the build
 * (dist/apps/signflow-api/prisma, copied by the build target's `assets`).
 */
function migrationsOfThisBuild(): string[] {
  return readdirSync(new URL('../../prisma/migrations/', import.meta.url), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory() && /^\d{14}_/.test(entry.name))
    .map((entry) => entry.name)
    .sort();
}

/**
 * Is this instance ready for traffic (ADR-0020)? The database answers, and every migration
 * of this build is applied — the deploy script waits for that (ADR-0014, task 24).
 * The file-store check comes with the file store.
 */
@Injectable()
export class Readiness {
  private readonly logger = new Logger('Readiness');
  private readonly expected = migrationsOfThisBuild();

  constructor(private readonly prisma: PrismaService) {}

  /** `undefined` when ready; otherwise the reason, which is also logged (no values). */
  async notReadyReason(): Promise<string | undefined> {
    const reason = await this.check();
    if (reason) this.logger.warn(`not ready: ${reason}`);
    return reason;
  }

  private async check(): Promise<string | undefined> {
    let applied: string[];
    try {
      applied = await this.appliedMigrations();
    } catch (error) {
      // The error code only: driver messages can name the host and the user.
      const code = (error as { code?: unknown } | null)?.code;
      return `database unreachable${typeof code === 'string' ? ` (${code})` : ''}`;
    }
    const missing = this.expected.find((name) => !applied.includes(name));
    return missing ? `migration ${missing} not applied` : undefined;
  }

  private async appliedMigrations(): Promise<string[]> {
    const db = this.prisma.client;
    // No table yet = no migration applied (an empty database).
    const [{ exists }] = await db.$queryRaw<{ exists: boolean }[]>`
      SELECT to_regclass('_prisma_migrations') IS NOT NULL AS exists`;
    if (!exists) return [];
    const rows = await db.$queryRaw<{ migration_name: string }[]>`
      SELECT migration_name FROM _prisma_migrations
      WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL`;
    return rows.map((row) => row.migration_name);
  }
}
