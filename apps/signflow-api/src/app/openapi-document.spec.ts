import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';
import { offlineConfig } from '../config/offline-config.js';
import { configureApp } from './configure-app.js';
import { createOpenApiDocument } from './openapi-document.js';
import { PROBLEM_CODE_LIST } from '../problem/problem-codes.js';

describe('OpenAPI document of signflow-api', () => {
  let app: INestApplication;
  let document: ReturnType<typeof createOpenApiDocument>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule.forRoot(offlineConfig())],
    }).compile();
    app = configureApp(moduleRef.createNestApplication({ logger: false }));
    document = createOpenApiDocument(app);
  });

  afterAll(async () => {
    await app.close();
  });

  it('declares OpenAPI 3.1.0', () => {
    expect(document.openapi).toBe('3.1.0');
  });

  it('describes GET /api/v1/health/live with HealthDto', () => {
    const operation = document.paths['/api/v1/health/live']?.get;

    expect(operation?.operationId).toBe('getHealthLive');
    expect(operation?.responses['200']).toMatchObject({
      content: {
        'application/json': {
          schema: { $ref: '#/components/schemas/HealthDto' },
        },
      },
    });
  });

  it('every operation can answer with Problem Details (default response, ADR-0008)', () => {
    const operation = document.paths['/api/v1/health/live']?.get;

    expect(operation?.responses['default']).toMatchObject({
      content: {
        'application/problem+json': {
          schema: { $ref: '#/components/schemas/ProblemDetailsDto' },
        },
      },
    });
  });

  it('lists every code of the registry as the ProblemCode enum', () => {
    const schemas = document.components?.schemas ?? {};

    expect(schemas['ProblemCode']).toMatchObject({
      type: 'string',
      enum: PROBLEM_CODE_LIST,
    });
    // allOf: the way OpenAPI puts a $ref next to sibling keys (description, example).
    const codeRef = { allOf: [{ $ref: '#/components/schemas/ProblemCode' }] };
    expect(schemas['ProblemDetailsDto']).toMatchObject({
      properties: { code: codeRef },
    });
    expect(
      (schemas['ProblemDetailsDto'] as { required: string[] }).required.sort(),
    ).toEqual(['code', 'instance', 'status', 'title', 'traceId', 'type']);
    expect(schemas['ProblemFieldErrorDto']).toMatchObject({
      properties: { code: codeRef },
    });
    expect(
      (
        schemas['ProblemFieldErrorDto'] as { required: string[] }
      ).required.sort(),
    ).toEqual(['code', 'params', 'pointer']);
  });

  // The compiler plugin writes this schema from the class alone: types, @IsIn (enum),
  // JSDoc (description, @example). Without the plugin, HealthDto would have no properties.
  it('builds HealthDto from the class: status is enum ["ok"], version has an example', () => {
    expect(document.components?.schemas?.['HealthDto']).toMatchObject({
      type: 'object',
      required: ['status', 'version'],
      properties: {
        // example: generated MSW mocks take it instead of random faker data (ADR-0007).
        status: { type: 'string', enum: ['ok'], example: 'ok' },
        version: { type: 'string', example: '0.1.0' },
      },
    });
  });
});

// A DTO that exists only in this test: HealthDto has no nullable field, and we do not
// add one just to check how the library spells "may be null".
class NullableProbeDto {
  @ApiProperty({ type: String, nullable: true })
  note!: string | null;
}

@Controller('probe')
class ProbeController {
  @ApiOkResponse({ type: NullableProbeDto })
  @Get()
  get(): NullableProbeDto {
    return { note: null };
  }
}

@Module({ controllers: [ProbeController] })
class ProbeModule {}

describe('OpenAPI 3.1 nullability', () => {
  it('writes nullable as a type list with "null", not as nullable: true', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ProbeModule],
    }).compile();
    const app = configureApp(
      moduleRef.createNestApplication({ logger: false }),
    );

    const note =
      createOpenApiDocument(app).components?.schemas?.['NullableProbeDto'];
    await app.close();

    expect(note).toMatchObject({
      properties: { note: { type: ['string', 'null'] } },
    });
    expect(JSON.stringify(note)).not.toContain('"nullable"');
  });
});
