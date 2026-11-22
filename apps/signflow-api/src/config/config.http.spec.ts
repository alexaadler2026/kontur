import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app/app.module.js';
import { configureApp } from '../app/configure-app.js';
import { createOpenApiDocument } from '../app/openapi-document.js';

describe('GET /api/v1/config (public settings for the SPA, ADR-0009)', () => {
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

  it('answers 200 with exactly the public settings: for now only the version', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/config')
      .expect(200)
      .expect('Content-Type', /application\/json/);

    // toEqual, not toMatchObject: a new field must be added here on purpose — the
    // response is public by definition and must never carry a server setting by accident.
    expect(response.body).toEqual({
      version: expect.stringMatching(/^\d+\.\d+\.\d+/),
    });
  });

  it('is in the contract as getConfig → PublicConfigDto', () => {
    const operation = createOpenApiDocument(app).paths['/api/v1/config']?.get;

    expect(operation?.operationId).toBe('getConfig');
    expect(operation?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/PublicConfigDto' },
        },
      },
    });
  });
});
