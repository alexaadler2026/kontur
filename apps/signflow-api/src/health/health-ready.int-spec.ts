import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  startEmptyDatabase,
  startTestDatabase,
  type TestDatabase,
} from '../database/testing/test-database.js';
import { startApiOn } from '../testing/api-on-database.js';
import type { CapturingLogger } from '../testing/capturing-logger.js';

// /health/ready tells the deploy script (task 24) when the new version may take traffic:
// the database answers AND every migration of this build is applied (ADR-0014, ADR-0020).

describe('GET /api/v1/health/ready on a real PostgreSQL', () => {
  describe('all migrations applied', () => {
    let db: TestDatabase;
    let app: INestApplication;

    beforeAll(async () => {
      db = await startTestDatabase();
      ({ app } = await startApiOn(db.url));
    });

    afterAll(async () => {
      await app?.close();
      await db?.container.stop();
    });

    it('answers 200 ok with the version', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(200);

      expect(response.body).toEqual({
        status: 'ok',
        version: expect.stringMatching(/^\d+\.\d+\.\d+/),
      });
    });

    it('the database goes away → 503 server.unavailable, liveness still 200', async () => {
      await db.container.stop();

      await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503)
        .expect((response) =>
          expect(response.body.code).toBe('server.unavailable'),
        );
      await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
    });
  });

  describe('database reachable, but migrations not applied (deploy started too early)', () => {
    let db: TestDatabase;
    let app: INestApplication;
    let logger: CapturingLogger;

    beforeAll(async () => {
      db = await startEmptyDatabase();
      ({ app, logger } = await startApiOn(db.url));
    });

    afterAll(async () => {
      await app?.close();
      await db?.container.stop();
    });

    it('answers 503 and logs which migration is missing', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/v1/health/ready')
        .expect(503);

      expect(response.body.code).toBe('server.unavailable');
      expect(logger.text()).toMatch(
        /not ready: migration \d{14}_init not applied/,
      );
    });
  });
});
