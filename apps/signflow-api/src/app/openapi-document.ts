import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ProblemDetailsDto } from '@adlersoft/api-kit';
import { readAppVersion } from './app-version.js';

/** Builds the OpenAPI document from the controllers and DTOs of a configured app. */
export function createOpenApiDocument(app: INestApplication) {
  const config = new DocumentBuilder()
    .setOpenAPIVersion('3.1.0')
    .setTitle('SignFlow API')
    .setDescription(
      'Backend of SignFlow, the e-signature product of this portfolio.',
    )
    .setVersion(readAppVersion())
    .build();
  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [ProblemDetailsDto],
  });
  // ADR-0008: any operation can fail, and every failure is Problem Details. Declared once
  // here instead of a decorator on each endpoint, so no endpoint can forget it.
  for (const operations of Object.values(document.paths)) {
    for (const method of METHODS) {
      const operation = operations[method];
      if (operation) {
        operation.responses['default'] ??= PROBLEM_RESPONSE;
      }
    }
  }
  return document;
}

const METHODS = ['get', 'put', 'post', 'delete', 'patch'] as const;

const PROBLEM_RESPONSE = {
  description: 'Error as Problem Details (RFC 9457, ADR-0008)',
  content: {
    'application/problem+json': {
      schema: { $ref: '#/components/schemas/ProblemDetailsDto' },
    },
  },
};

/**
 * The same value with object keys sorted, so the committed openapi.json changes only
 * when the API changes, not when decorators are reordered. Arrays keep their order.
 */
export function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeys);
  }
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
        .map(([key, inner]) => [key, sortKeys(inner)]),
    );
  }
  return value;
}
