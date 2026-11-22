import {
  Body,
  Controller,
  type INestApplication,
  type LoggerService,
  Module,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  MinLength,
  ValidateNested,
} from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../app/app.module.js';
import { configureApp } from '../app/configure-app.js';

// A controller and DTOs that exist only in this test: SignFlow has no endpoint with input
// yet (the first is sign-in, task 8), and we do not invent one (AGENTS.md).
class ProbeSignerDto {
  @IsEmail()
  email!: string;
}

class ProbeDto {
  @IsEmail()
  email!: string;

  @IsNotEmpty()
  @MinLength(20)
  password!: string;

  @ValidateNested({ each: true })
  @Type(() => ProbeSignerDto)
  signers: ProbeSignerDto[] = [];
}

@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() body: ProbeDto) {
    return { received: Boolean(body) };
  }

  @Post('crash')
  crash(): never {
    throw new Error('database password is hunter2');
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

/** Keeps every log line, so a test can assert what is (not) written. */
class CapturingLogger implements LoggerService {
  readonly lines: string[] = [];
  private keep(...parts: unknown[]) {
    this.lines.push(parts.map((part) => String(part)).join(' '));
  }
  log = (...parts: unknown[]) => this.keep(...parts);
  error = (...parts: unknown[]) => this.keep(...parts);
  warn = (...parts: unknown[]) => this.keep(...parts);
  debug = (...parts: unknown[]) => this.keep(...parts);
  verbose = (...parts: unknown[]) => this.keep(...parts);
}

const SECRET = 'Geheim-Passwort-42!';
/** Error messages quote only a slice of the input; this part is always in the slice. */
const SECRET_FRAGMENT = 'Geheim';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Problem Details (RFC 9457, ADR-0008) over HTTP', () => {
  let app: INestApplication;
  const logger = new CapturingLogger();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule, ProbeModule],
    }).compile();
    app = configureApp(moduleRef.createNestApplication({ logger }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    logger.lines.length = 0;
  });

  it('validation: 422 problem+json with one entry per field (JSON Pointer, code, params)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ email: 'not-an-email', password: '', signers: [{ email: 'x' }] })
      .expect(422)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toEqual({
      type: 'urn:kontur:problem:validation.failed',
      title: expect.any(String),
      status: 422,
      code: 'validation.failed',
      instance: '/api/v1/probe',
      traceId: expect.stringMatching(UUID),
      errors: [
        { pointer: '/email', code: 'validation.email', params: {} },
        // Empty: "required" wins over the other rules of the same field.
        { pointer: '/password', code: 'validation.required', params: {} },
        { pointer: '/signers/0/email', code: 'validation.email', params: {} },
      ],
    });
  });

  it('a rule without its own code becomes validation.invalid; a property the DTO does not have is rejected', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ email: 'a@example.com', password: 'too-short', isAdmin: true })
      .expect(422);

    // Order is not part of the contract: the frontend matches entries by pointer.
    expect(response.body.errors).toHaveLength(2);
    expect(response.body.errors).toEqual(
      expect.arrayContaining([
        { pointer: '/password', code: 'validation.invalid', params: {} },
        { pointer: '/isAdmin', code: 'validation.invalid', params: {} },
      ]),
    );
  });

  it('never returns or logs the value that was sent (ADR-0020: no request bodies)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .send({ email: SECRET, password: SECRET })
      .expect(422);

    expect(JSON.stringify(response.body)).not.toContain(SECRET);
    expect(logger.lines.join('\n')).not.toContain(SECRET);
  });

  it('malformed JSON: 400 request.malformed, without echoing the body', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe')
      .set('Content-Type', 'application/json')
      // Unquoted on purpose: V8's parse error then quotes a slice of the input
      // ("…assword": Geheim-Pas…"), so a leaked error message would contain "Geheim".
      .send(`{"password": ${SECRET}}`)
      .expect(400)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toMatchObject({
      code: 'request.malformed',
      status: 400,
    });
    expect(response.body).not.toHaveProperty('errors');
    expect(JSON.stringify(response.body)).not.toContain(SECRET_FRAGMENT);
    expect(logger.lines.join('\n')).not.toContain(SECRET_FRAGMENT);
  });

  it('unknown route: 404 request.not_found; instance is the path without the query string', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist?email=someone@example.com')
      .expect(404)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toMatchObject({
      type: 'urn:kontur:problem:request.not_found',
      code: 'request.not_found',
      status: 404,
      instance: '/api/v1/does-not-exist',
    });
    expect(JSON.stringify(response.body)).not.toContain('someone@example.com');
  });

  it('unexpected error: 500 server.internal, no internals in the body, traceId in the log line', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe/crash')
      .expect(500)
      .expect('Content-Type', /application\/problem\+json/);

    expect(response.body).toEqual({
      type: 'urn:kontur:problem:server.internal',
      title: expect.any(String),
      status: 500,
      code: 'server.internal',
      instance: '/api/v1/probe/crash',
      traceId: expect.stringMatching(UUID),
    });
    expect(JSON.stringify(response.body)).not.toContain('hunter2');
    expect(
      logger.lines.some((line) => line.includes(response.body.traceId)),
    ).toBe(true);
  });
});
