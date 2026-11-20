import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
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
  return SwaggerModule.createDocument(app, config);
}

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
