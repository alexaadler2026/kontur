import { argon2, randomBytes, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { PasswordHasher } from './password-hasher.js';

const argon2Async = promisify(argon2);

export interface Argon2idParameters {
  /** Memory in KiB (1024-byte blocks), as Argon2 counts it. */
  memoryKiB: number;
  /** Number of passes over the memory (iterations, "t"). */
  passes: number;
  /** Number of lanes ("p"). */
  parallelism: number;
}

/**
 * Production parameters (ADR-0010): 46 MiB, 2 passes, 1 lane — above the OWASP baseline
 * (19 MiB, 2, 1). Measured 2026-11-23: median 274 ms on the owner's laptop (i7-8565U);
 * target 200–500 ms. Raising them later is safe: old hashes are upgraded at the next login
 * (`needsRehash`).
 */
export const ARGON2ID_PARAMETERS: Argon2idParameters = {
  memoryKiB: 46 * 1024,
  passes: 2,
  parallelism: 1,
};

const VERSION = 19; // Argon2 version 1.3 (0x13), the only one Node implements
const SALT_BYTES = 16;
const HASH_BYTES = 32;

// PHC string format: $argon2id$v=19$m=<KiB>,t=<passes>,p=<lanes>$<salt>$<hash>
// salt and hash in standard Base64 without "=" padding.
const PHC =
  /^\$argon2id\$v=(\d+)\$m=(\d+),t=(\d+),p=(\d+)\$([A-Za-z0-9+/]+)\$([A-Za-z0-9+/]+)$/;

interface Parsed extends Argon2idParameters {
  version: number;
  salt: Buffer;
  hash: Buffer;
}

const toBase64 = (bytes: Buffer) => bytes.toString('base64').replace(/=+$/, '');

function parse(stored: string): Parsed {
  const match = PHC.exec(stored);
  if (!match) {
    // A stored value we cannot read is a data error, never a "wrong password".
    throw new Error('Stored password hash is not an Argon2id PHC string');
  }
  const [, version, memoryKiB, passes, parallelism, salt, hash] = match;
  return {
    version: Number(version),
    memoryKiB: Number(memoryKiB),
    passes: Number(passes),
    parallelism: Number(parallelism),
    salt: Buffer.from(salt, 'base64'),
    hash: Buffer.from(hash, 'base64'),
  };
}

export class Argon2idPasswordHasher implements PasswordHasher {
  constructor(
    private readonly parameters: Argon2idParameters = ARGON2ID_PARAMETERS,
  ) {}

  async hash(password: string): Promise<string> {
    const salt = randomBytes(SALT_BYTES);
    const hash = await this.derive(password, salt, this.parameters, HASH_BYTES);
    const { memoryKiB: m, passes: t, parallelism: p } = this.parameters;
    return `$argon2id$v=${VERSION}$m=${m},t=${t},p=${p}$${toBase64(salt)}$${toBase64(hash)}`;
  }

  async verify(stored: string, password: string): Promise<boolean> {
    const parsed = parse(stored);
    const candidate = await this.derive(
      password,
      parsed.salt,
      parsed,
      parsed.hash.length,
    );
    // Constant-time comparison: the time taken does not reveal how many bytes matched.
    return timingSafeEqual(candidate, parsed.hash);
  }

  needsRehash(stored: string): boolean {
    const parsed = parse(stored);
    return (
      parsed.version !== VERSION ||
      parsed.memoryKiB !== this.parameters.memoryKiB ||
      parsed.passes !== this.parameters.passes ||
      parsed.parallelism !== this.parameters.parallelism ||
      parsed.hash.length !== HASH_BYTES
    );
  }

  private derive(
    password: string,
    salt: Buffer,
    { memoryKiB, passes, parallelism }: Argon2idParameters,
    length: number,
  ): Promise<Buffer> {
    return argon2Async('argon2id', {
      // NFC: "ü" typed as one code point or as u + combining mark is the same password.
      message: password.normalize('NFC'),
      nonce: salt,
      memory: memoryKiB,
      passes,
      parallelism,
      tagLength: length,
    });
  }
}
