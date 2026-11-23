import type { PasswordHasher } from './password-hasher.js';

/**
 * Runs at most `limit` hash/verify calls of the wrapped hasher at the same time; the rest
 * wait in a first-come-first-served queue (owner, 2026-11-23). One Argon2id call takes
 * 46 MiB (ADR-0010), so without a limit a burst of sign-ins could take all the server's
 * memory (4 GB, ADR-0014). The rate limits in front (ADR-0010) keep the queue short.
 */
export class ConcurrencyLimitedPasswordHasher implements PasswordHasher {
  private running = 0;
  private readonly queue: (() => void)[] = [];

  constructor(
    private readonly inner: PasswordHasher,
    private readonly limit: number,
  ) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('limit must be a positive integer');
    }
  }

  hash(password: string): Promise<string> {
    return this.run(() => this.inner.hash(password));
  }

  verify(stored: string, password: string): Promise<boolean> {
    return this.run(() => this.inner.verify(stored, password));
  }

  /** Only reads the stored string: no hashing, no waiting. */
  needsRehash(stored: string): boolean {
    return this.inner.needsRehash(stored);
  }

  private async run<T>(work: () => Promise<T>): Promise<T> {
    if (this.running >= this.limit) {
      // Wait for a place; the call that frees it hands it over directly (running stays
      // the same), so a newcomer cannot slip in ahead of the queue.
      await new Promise<void>((resolve) => this.queue.push(resolve));
    } else {
      this.running++;
    }
    try {
      return await work();
    } finally {
      const next = this.queue.shift();
      if (next) next();
      else this.running--;
    }
  }
}
