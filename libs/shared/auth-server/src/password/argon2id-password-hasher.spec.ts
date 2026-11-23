import { describe, expect, it } from 'vitest';
import {
  ARGON2ID_PARAMETERS,
  Argon2idPasswordHasher,
} from './argon2id-password-hasher.js';

// Small parameters keep these tests fast; production uses ARGON2ID_PARAMETERS.
const fast = { memoryKiB: 64, passes: 1, parallelism: 1 };
const hasher = new Argon2idPasswordHasher(fast);

describe('Argon2idPasswordHasher (ADR-0010)', () => {
  it('stores a PHC string with algorithm, version, parameters, salt and hash', async () => {
    const phc = await hasher.hash('correct horse battery staple');

    expect(phc).toMatch(
      /^\$argon2id\$v=19\$m=64,t=1,p=1\$[A-Za-z0-9+/]{22}\$[A-Za-z0-9+/]{43}$/,
    );
  });

  it('uses a new random salt each time, so equal passwords give different strings', async () => {
    const a = await hasher.hash('correct horse battery staple');
    const b = await hasher.hash('correct horse battery staple');

    expect(a).not.toBe(b);
  });

  it('accepts the right password and rejects a wrong one', async () => {
    const phc = await hasher.hash('correct horse battery staple');

    expect(await hasher.verify(phc, 'correct horse battery staple')).toBe(true);
    expect(await hasher.verify(phc, 'correct horse battery stapler')).toBe(
      false,
    );
  });

  it('normalises to Unicode NFC: "ü" as U+00FC and as u + U+0308 is the same password', async () => {
    // Built from code points so no editor can silently normalise the test data.
    const composed = `Gr${String.fromCharCode(0x00fc)}ße aus Bischkek 2026`;
    const decomposed = `Gru${String.fromCharCode(0x0308)}ße aus Bischkek 2026`;
    expect(composed).not.toBe(decomposed);
    expect(decomposed.normalize('NFC')).toBe(composed);

    expect(await hasher.verify(await hasher.hash(composed), decomposed)).toBe(
      true,
    );
    expect(await hasher.verify(await hasher.hash(decomposed), composed)).toBe(
      true,
    );
  });

  it('checks a hash with the parameters stored in it, not with the current ones', async () => {
    const old = await new Argon2idPasswordHasher({
      memoryKiB: 32,
      passes: 1,
      parallelism: 1,
    }).hash('correct horse battery staple');

    expect(await hasher.verify(old, 'correct horse battery staple')).toBe(true);
  });

  it('asks for a rehash when the stored parameters differ from the current ones', async () => {
    const current = await hasher.hash('correct horse battery staple');
    const weaker = await new Argon2idPasswordHasher({
      memoryKiB: 32,
      passes: 1,
      parallelism: 1,
    }).hash('correct horse battery staple');

    expect(hasher.needsRehash(current)).toBe(false);
    expect(hasher.needsRehash(weaker)).toBe(true);
  });

  it('refuses a stored string that is not an Argon2id PHC string (a data error, not a wrong password)', async () => {
    await expect(hasher.verify('$2b$10$abc', 'x')).rejects.toThrow(
      /not an argon2id/i,
    );
    await expect(
      hasher.verify('$argon2id$v=19$m=64,t=1,p=1$bad', 'x'),
    ).rejects.toThrow(/not an argon2id/i);
  });

  it('production parameters are at least the OWASP baseline (m = 19 MiB, t = 2, p = 1)', () => {
    expect(ARGON2ID_PARAMETERS.memoryKiB).toBeGreaterThanOrEqual(19 * 1024);
    expect(ARGON2ID_PARAMETERS.passes).toBeGreaterThanOrEqual(2);
    expect(ARGON2ID_PARAMETERS.parallelism).toBe(1);
  });
});
