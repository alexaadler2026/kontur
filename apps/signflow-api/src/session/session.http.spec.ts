import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../app/app.module.js';
import { configureApp } from '../app/configure-app.js';
import { createOpenApiDocument } from '../app/openapi-document.js';
import { offlineConfig } from '../config/offline-config.js';

// Without a database: what the validation pipe rejects before any query, and the contract.
describe('/api/v1/session — validation and contract (ADR-0008, ADR-0010)', () => {
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

  it('POST without a password → 422 validation.failed, the field named, nothing hashed', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/session')
      .send({ email: 'aigul@firma.kg' })
      .expect(422);

    expect(response.body.code).toBe('validation.failed');
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          pointer: '/password',
          code: 'validation.required',
        }),
      ]),
    );
  });

  it('POST with a password longer than 128 characters → 422, before Argon2 runs', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/session')
      .send({ email: 'aigul@firma.kg', password: 'x'.repeat(129) })
      .expect(422);

    expect(response.body.code).toBe('validation.failed');
  });

  it('POST or DELETE from another site → 403 request.cross_site, before anything else runs', async () => {
    const fromEvil = await request(app.getHttpServer())
      .post('/api/v1/session')
      .set('Origin', 'https://evil.example')
      .send({ email: 'aigul@firma.kg' })
      .expect(403);
    expect(fromEvil.body.code).toBe('request.cross_site');

    const crossSite = await request(app.getHttpServer())
      .delete('/api/v1/session')
      .set('Sec-Fetch-Site', 'cross-site')
      .expect(403);
    expect(crossSite.body.code).toBe('request.cross_site');
  });

  it('same-origin requests pass the guard (here: on to validation → 422)', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/session')
      .set('Sec-Fetch-Site', 'same-origin')
      .send({})
      .expect(422);
  });

  // Errors (401, 422, …) are the shared "default" Problem Details answer of every operation.
  it('the contract has createSession (204), getSession (200 SessionDto), deleteSession (204)', () => {
    const path = createOpenApiDocument(app).paths['/api/v1/session'];

    expect(path?.post?.operationId).toBe('createSession');
    expect(Object.keys(path?.post?.responses ?? {})).toEqual([
      '204',
      'default',
    ]);
    expect(path?.get?.operationId).toBe('getSession');
    expect(path?.get?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/SessionDto' },
        },
      },
    });
    expect(path?.delete?.operationId).toBe('deleteSession');
    expect(Object.keys(path?.delete?.responses ?? {})).toEqual([
      '204',
      'default',
    ]);
  });
});
