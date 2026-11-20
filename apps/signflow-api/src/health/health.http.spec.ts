import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app/app.module.js';
import { configureApp } from '../app/configure-app.js';

describe('GET /api/v1/health/live (HTTP)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
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
