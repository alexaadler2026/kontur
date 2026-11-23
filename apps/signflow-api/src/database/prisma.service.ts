import { Inject, Injectable, type OnModuleDestroy } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { APP_CONFIG } from '../config/app-config.token.js';
import type { AppConfig } from '../config/load-config.js';
import { PrismaClient } from '../generated/prisma/client.js';

/**
 * A Prisma client for PostgreSQL through the `pg` driver adapter (Prisma 7: no Rust query
 * engine). Connects lazily, on the first query — so the API starts, and its unit tests
 * run, without a database; readiness is reported by /health/ready (task 5b).
 */
export function createPrismaClient(databaseUrl: string): PrismaClient {
  return new PrismaClient({
    adapter: new PrismaPg({ connectionString: databaseUrl }),
  });
}

/** The app's one Prisma client, from DI. Closes its connections when the app stops. */
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client: PrismaClient;

  constructor(@Inject(APP_CONFIG) config: AppConfig) {
    this.client = createPrismaClient(config.DATABASE_URL);
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.$disconnect();
  }
}
