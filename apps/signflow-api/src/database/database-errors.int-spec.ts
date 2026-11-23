import {
  Body,
  Controller,
  type INestApplication,
  Module,
  Post,
} from '@nestjs/common';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { startApiOn } from '../testing/api-on-database.js';
import type { CapturingLogger } from '../testing/capturing-logger.js';
import { PrismaService } from './prisma.service.js';
import {
  startTestDatabase,
  type TestDatabase,
} from './testing/test-database.js';

// Database errors quote what was sent: PostgreSQL's DETAIL says
// `Key (email)=(…) already exists`, and `invalid input syntax for type uuid: "…"`.
// Such a value may be personal data or a secret, so it must reach neither the response nor
// the log (journal 027; owner, 2026-11-22). A controller that exists only in this test
// makes the queries — the real endpoints come with sign-in and invitations.

const SECRET = 'Geheim-Adresse-42@beispiel.de';
const SECRET_FRAGMENT = 'Geheim';

@Controller('probe-db')
class ProbeDbController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('users')
  create(@Body() body: { email: string }) {
    return this.prisma.client.user.create({ data: { email: body.email } });
  }

  // The id comes in the body: values in the URL path are echoed in `instance` by design
  // (RFC 9457), and real paths carry only UUIDs.
  @Post('users/find')
  find(@Body() { id }: { id: string }) {
    return this.prisma.client.user.findUnique({ where: { id } });
  }
}

@Module({ controllers: [ProbeDbController] })
class ProbeDbModule {}

describe('database errors leak no value into the response or the log', () => {
  let db: TestDatabase;
  let app: INestApplication;
  let logger: CapturingLogger;

  beforeAll(async () => {
    db = await startTestDatabase();
    ({ app, logger } = await startApiOn(db.url, [ProbeDbModule]));
  });

  afterAll(async () => {
    await app?.close();
    await db?.container.stop();
  });

  beforeEach(() => {
    logger.lines.length = 0;
  });

  it('duplicate e-mail: 500 server.internal; the e-mail is in neither body nor log', async () => {
    await request(app.getHttpServer())
      .post('/api/v1/probe-db/users')
      .send({ email: SECRET })
      .expect(201);

    const response = await request(app.getHttpServer())
      .post('/api/v1/probe-db/users')
      .send({ email: SECRET.toUpperCase() })
      .expect(500);

    expect(response.body.code).toBe('server.internal');
    expect(JSON.stringify(response.body)).not.toMatch(/geheim/i);
    // The log still says what happened, by code: a developer can find the cause.
    expect(logger.text()).toContain(`traceId=${response.body.traceId}`);
    expect(logger.text()).toContain('P2002');
    expect(logger.text()).not.toMatch(/geheim/i);
  });

  it('a value the database cannot read (not a UUID): neither body nor log quotes it', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe-db/users/find')
      .send({ id: `${SECRET_FRAGMENT}-123` })
      .expect(500);

    expect(response.body.code).toBe('server.internal');
    expect(JSON.stringify(response.body)).not.toContain(SECRET_FRAGMENT);
    expect(logger.text()).toContain(`traceId=${response.body.traceId}`);
    expect(logger.text()).not.toContain(SECRET_FRAGMENT);
  });
});
