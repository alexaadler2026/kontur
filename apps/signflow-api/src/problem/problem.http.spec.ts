import {
  Body,
  Controller,
  type INestApplication,
  Get,
  Module,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import {
  MoneyDto,
  PageQueryDto,
  ProblemException,
  ParseIdPipe,
  parseSort,
} from '@adlersoft/api-kit';
import { Test } from '@nestjs/testing';
import { Type } from 'class-transformer';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  ValidateNested,
} from 'class-validator';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { AppModule } from '../app/app.module.js';
import { offlineConfig } from '../config/offline-config.js';
import { configureApp } from '../app/configure-app.js';
import { CapturingLogger } from '../testing/capturing-logger.js';

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

class ProbePriceDto {
  @ValidateNested()
  @Type(() => MoneyDto)
  price!: MoneyDto;
}

class ProbeListQueryDto extends PageQueryDto {
  @IsOptional()
  @IsString()
  sort?: string;
}

@Controller('probe')
class ProbeController {
  @Post()
  create(@Body() body: ProbeDto) {
    return { received: Boolean(body) };
  }

  @Post('price')
  price(@Body() body: ProbePriceDto) {
    return body.price;
  }

  @Get('items')
  list(@Query() query: ProbeListQueryDto) {
    const sort = parseSort(query.sort, ['title', 'updatedAt'] as const);
    return { page: query.page, pageSize: query.pageSize, sort };
  }

  @Get('items/:id')
  one(@Param('id', ParseIdPipe) id: string) {
    return { id };
  }

  @Post('throttled')
  throttled(): never {
    throw new ProblemException('auth.throttled', undefined, {
      retryAfterSeconds: 125,
    });
  }

  @Post('crash')
  crash(): never {
    throw new Error('database password is hunter2');
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

const SECRET = 'Geheim-Passwort-42!';
/** Error messages quote only a slice of the input; this part is always in the slice. */
const SECRET_FRAGMENT = 'Geheim';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

describe('Problem Details (RFC 9457, ADR-0008) over HTTP', () => {
  let app: INestApplication;
  const logger = new CapturingLogger();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(offlineConfig()), ProbeModule],
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

  it('throttled: 429 auth.throttled with the standard Retry-After header in seconds (ADR-0010)', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe/throttled')
      .expect(429)
      .expect('Retry-After', '125');

    expect(response.body.code).toBe('auth.throttled');
  });

  it('other errors carry no Retry-After', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/does-not-exist')
      .expect(404);

    expect(response.headers['retry-after']).toBeUndefined();
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

  it('money: an unsupported currency is 422 with money.currency_unsupported; a supported one passes', async () => {
    const response = await request(app.getHttpServer())
      .post('/api/v1/probe/price')
      .send({ price: { amountMinor: 1586, currency: 'XAU' } })
      .expect(422);
    expect(response.body.errors).toEqual([
      {
        pointer: '/price/currency',
        code: 'money.currency_unsupported',
        params: {},
      },
    ]);

    await request(app.getHttpServer())
      .post('/api/v1/probe/price')
      .send({ price: { amountMinor: 1586, currency: 'EUR' } })
      .expect(201, { amountMinor: 1586, currency: 'EUR' });
  });

  it('lists: page and pageSize from the query, sort parsed against the allowed fields', async () => {
    await request(app.getHttpServer())
      .get('/api/v1/probe/items?page=2&sort=-title')
      .expect(200, {
        page: 2,
        pageSize: 25,
        sort: [{ field: 'title', direction: 'desc' }],
      });
  });

  it('lists: pageSize over 100 is 422; an unknown sort field is 400 request.malformed', async () => {
    const tooBig = await request(app.getHttpServer())
      .get('/api/v1/probe/items?pageSize=101')
      .expect(422);
    expect(tooBig.body.errors).toEqual([
      { pointer: '/pageSize', code: 'validation.invalid', params: {} },
    ]);

    const unknown = await request(app.getHttpServer())
      .get('/api/v1/probe/items?sort=password')
      .expect(400);
    expect(unknown.body.code).toBe('request.malformed');
  });

  it('an id in the path that is not a UUID is 404 request.not_found', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/v1/probe/items/not-a-uuid')
      .expect(404);
    expect(response.body.code).toBe('request.not_found');

    const id = '019a7f3c-5b2e-7c41-9d3a-2f6e8b1c4d50';
    await request(app.getHttpServer())
      .get(`/api/v1/probe/items/${id}`)
      .expect(200, { id });
  });
});
