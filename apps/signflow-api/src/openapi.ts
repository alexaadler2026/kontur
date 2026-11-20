import 'reflect-metadata';
import { writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { configureApp } from './app/configure-app.js';
import { createOpenApiDocument, sortKeys } from './app/openapi-document.js';

// Usage: node dist/apps/signflow-api/src/openapi.js <output file>
// Run through `nx run signflow-api:openapi`, which builds first.
const outputFile = process.argv[2];
if (!outputFile) {
  throw new Error('Usage: openapi.js <output file>');
}

// The app is created but never listens: no port, no network.
const app = configureApp(
  await NestFactory.create(AppModule, { logger: ['error'] }),
);
const document = sortKeys(createOpenApiDocument(app));
await app.close();

writeFileSync(outputFile, JSON.stringify(document, null, 2) + '\n');
