import 'reflect-metadata';
import { readFileSync, writeFileSync } from 'node:fs';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app/app.module.js';
import { configureApp } from './app/configure-app.js';
import { createOpenApiDocument, sortKeys } from './app/openapi-document.js';

// Usage: node dist/apps/signflow-api/src/openapi.js <contract file> [--check]
// Run through `nx run signflow-api:openapi` (writes) or `nx run signflow-api:api-check`
// (compares, ADR-0007); both build first.
const [contractFile, mode] = process.argv.slice(2);
if (!contractFile || (mode !== undefined && mode !== '--check')) {
  throw new Error('Usage: openapi.js <contract file> [--check]');
}

// The app is created but never listens: no port, no network.
const app = configureApp(
  await NestFactory.create(AppModule, { logger: ['error'] }),
);
const document = sortKeys(createOpenApiDocument(app));
await app.close();
const generated = JSON.stringify(document, null, 2) + '\n';

if (mode !== '--check') {
  writeFileSync(contractFile, generated);
} else {
  const committed = readFileSync(contractFile, 'utf8').replace(/\r\n/g, '\n');
  if (committed !== generated) {
    const committedLines = committed.split('\n');
    const generatedLines = generated.split('\n');
    const line = generatedLines.findIndex(
      (text, i) => text !== committedLines[i],
    );
    console.error(
      `${contractFile} is out of date (first difference at line ${line + 1}).\n` +
        `  committed: ${committedLines[line]?.trim() ?? '(end of file)'}\n` +
        `  generated: ${generatedLines[line]?.trim() ?? '(end of file)'}\n` +
        'Run: pnpm nx run signflow-api:openapi — and commit the file.',
    );
    process.exit(1);
  }
  console.log(`${contractFile} matches the API — ok`);
}
