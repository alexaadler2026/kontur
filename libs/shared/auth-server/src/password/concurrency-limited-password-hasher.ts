import type { PasswordHasher } from './password-hasher.js';

/**
 * The queue is full: the call was refused at once, nothing was hashed. The API answers
 * 503 `server.unavailable` with Retry-After (owner, 2026-11-23).
 */
export class PasswordHasherBusyError extends Error {
  constructor() {
    super('Password hasher busy: queue full');
    this.name = 'PasswordHasherBusyError';
  }
}

/**
 * Runs at most `limit` hash/verify calls of the wrapped hasher at the same time; the rest
 * wait in a first-come-first-served queue (owner, 2026-11-23). One Argon2id call takes
 * 46 MiB (ADR-0010), so without a limit a burst of sign-ins could take all the server's
 * memory (4 GB, ADR-0014). At most `maxQueue` calls wait; one more is refused at once
 * with PasswordHasherBusyError — a flood from many IPs must not delay every real user's
 * sign-in without bound (owner, 2026-11-23).
 */
export class ConcurrencyLimitedPasswordHasher implements PasswordHasher {
  private running = 0;
  private readonly queue: (() => void)[] = [];

  constructor(
    private readonly inner: PasswordHasher,
    private readonly limit: number,
    private readonly maxQueue = Number.POSITIVE_INFINITY,
  ) {
    if (!Number.isInteger(limit) || limit < 1) {
      throw new RangeError('limit must be a positive integer');
    }
    if (
      maxQueue !== Number.POSITIVE_INFINITY &&
      (!Number.isInteger(maxQueue) || maxQueue < 0)
    ) {
      throw new RangeError('maxQueue must be an integer of at least 0');
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
      if (this.queue.length >= this.maxQueue)
        throw new PasswordHasherBusyError();
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
