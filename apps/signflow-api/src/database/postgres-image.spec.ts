import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { POSTGRES_IMAGE } from './postgres-image.js';

describe('one PostgreSQL image everywhere', () => {
  const compose = readFileSync(
    new URL('../../../../compose.dev.yaml', import.meta.url),
    'utf8',
  );

  it('compose.dev.yaml runs exactly the image of the integration tests', () => {
    const images = [...compose.matchAll(/image:\s*(postgres:\S+)/g)].map(
      (match) => match[1],
    );

    expect(images).toEqual([POSTGRES_IMAGE]);
  });

  // Owner, 2026-11-24: the e2e database is a compose service too — the same image.
  it('compose.e2e.yaml runs exactly the image of the integration tests', () => {
    const e2e = readFileSync(
      new URL('../../../../compose.e2e.yaml', import.meta.url),
      'utf8',
    );
    const images = [...e2e.matchAll(/image:\s*(postgres:\S+)/g)].map(
      (match) => match[1],
    );

    expect(images).toEqual([POSTGRES_IMAGE]);
  });

  it('the tag is exact and Debian-based, never alpine or a moving tag', () => {
    expect(POSTGRES_IMAGE).toMatch(/^postgres:\d+\.\d+-(trixie|bookworm)$/);
  });
});
