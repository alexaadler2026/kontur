import { Controller, Get, type INestApplication, Module } from '@nestjs/common';
import { ApiOkResponse, ApiProperty } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from './app.module.js';
import { configureApp } from './configure-app.js';
import { createOpenApiDocument } from './openapi-document.js';

describe('OpenAPI document of signflow-api', () => {
  let app: INestApplication;
  let document: ReturnType<typeof createOpenApiDocument>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
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

  // The compiler plugin writes this schema from the class alone: types, @IsIn (enum),
  // JSDoc (description, @example). Without the plugin, HealthDto would have no properties.
  it('builds HealthDto from the class: status is enum ["ok"], version has an example', () => {
    expect(document.components?.schemas?.['HealthDto']).toMatchObject({
      type: 'object',
      required: ['status', 'version'],
      properties: {
        status: { type: 'string', enum: ['ok'] },
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
