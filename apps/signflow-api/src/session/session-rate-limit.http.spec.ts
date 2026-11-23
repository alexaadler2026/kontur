import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app/app.module.js';
import { configureApp } from '../app/configure-app.js';
import { offlineConfig } from '../config/offline-config.js';

// ADR-0010, owner 2026-11-23: at most 20 requests per minute per IP on the auth endpoints,
// counted in memory. Its own file: the counter lives in the app, so a fresh app here.
// No database needed: the limit is checked before validation, and the requests below are
// rejected by validation (422) before any query.
describe('POST /api/v1/session — request rate per IP (ADR-0010)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(offlineConfig())],
    }).compile();
    app = configureApp(moduleRef.createNestApplication({ logger: false }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('20 requests in a minute pass, the 21st → 429 auth.throttled with Retry-After; sign-out stays open', async () => {
    for (let i = 0; i < 20; i++) {
      await request(app.getHttpServer())
        .post('/api/v1/session')
        .send({})
        .expect(422);
    }

    const response = await request(app.getHttpServer())
      .post('/api/v1/session')
      .send({})
      .expect(429);

    expect(response.body.code).toBe('auth.throttled');
    const retryAfter = Number(response.headers['retry-after']);
    expect(retryAfter).toBeGreaterThanOrEqual(1);
    expect(retryAfter).toBeLessThanOrEqual(60);

    // Signing out is never throttled: it can only end a session.
    await request(app.getHttpServer()).delete('/api/v1/session').expect(204);
  });
});
