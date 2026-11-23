import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app/app.module.js';
import { offlineConfig } from '../config/offline-config.js';
import { configureApp } from '../app/configure-app.js';
import { CapturingLogger } from '../testing/capturing-logger.js';

describe('GET /api/v1/health/live (HTTP)', () => {
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

  it('answers 200 with status ok and the version from package.json', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/live')
      .expect(200)
      .expect('Content-Type', /application\/json/);

    expect(response.body).toEqual({
      status: 'ok',
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
    });
  });

  it('serves the API only under the /api/v1 prefix', async () => {
    await request(app.getHttpServer()).get('/health/live').expect(404);
  });
});

describe('GET /api/v1/health/ready without a database (HTTP, ADR-0020)', () => {
  let app: INestApplication;
  const logger = new CapturingLogger();

  beforeAll(async () => {
    // offlineConfig(): the database address leads nowhere, like a database that is down.
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(offlineConfig())],
    }).compile();
    app = configureApp(moduleRef.createNestApplication({ logger }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers 503 server.unavailable as Problem Details — the deploy waits, liveness stays 200', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/health/ready')
      .expect(503)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toMatchObject({
      code: 'server.unavailable',
      status: 503,
      instance: '/api/v1/health/ready',
    });
    await request(app.getHttpServer()).get('/api/v1/health/live').expect(200);
  });

  it('logs why, by error code only: no connection string, no password', async () => {
    logger.lines.length = 0;
    await request(app.getHttpServer()).get('/api/v1/health/ready').expect(503);

    expect(logger.text()).toContain('not ready: database unreachable');
    expect(logger.text()).not.toContain('offline:offline');
  });
});
