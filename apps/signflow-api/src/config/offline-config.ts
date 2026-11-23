import type { AppConfig } from './load-config.js';

/**
 * Settings for an app that never talks to a database: HTTP unit tests and the contract
 * generator (openapi.ts). Prisma connects only on the first query, and these never make
 * one; the address points at port 1 on this machine, where nothing listens.
 * Integration tests use a real database instead (src/database/testing).
 */
export function offlineConfig(): AppConfig {
  return Object.freeze({
    PORT: 3333,
    DATABASE_URL: 'postgresql://offline:offline@127.0.0.1:1/offline',
  });
}
