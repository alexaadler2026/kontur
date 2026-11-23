import { describe, expect, it } from 'vitest';
import {
  ConcurrencyLimitedPasswordHasher,
  PasswordHasherBusyError,
} from './concurrency-limited-password-hasher.js';
import type { PasswordHasher } from './password-hasher.js';

// Owner, 2026-11-23: one Argon2id hash takes 46 MiB; the server has 4 GB (ADR-0014). A burst
// of sign-ins must not run unlimited hashes at once — at most N, the rest wait their turn.

/** A hasher whose calls finish only when the test says so, and which counts overlap. */
function slowHasher() {
  let running = 0;
  let maxRunning = 0;
  const waiting: (() => void)[] = [];
  const work = async <T>(result: T): Promise<T> => {
    running++;
    maxRunning = Math.max(maxRunning, running);
    await new Promise<void>((resolve) => waiting.push(resolve));
    running--;
    return result;
  };
  const hasher: PasswordHasher = {
    hash: (password) => work(`hash:${password}`),
    verify: (stored, password) => work(stored === `hash:${password}`),
    needsRehash: () => false,
  };
  return {
    hasher,
    get running() {
      return running;
    },
    get maxRunning() {
      return maxRunning;
    },
    /** Lets every call started so far finish. */
    releaseAll() {
      waiting.splice(0).forEach((resolve) => resolve());
    },
  };
}

/** Lets pending promise callbacks run. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('ConcurrencyLimitedPasswordHasher', () => {
  it('10 verifications at once with a limit of 4: never more than 4 run, all 10 finish', async () => {
    const slow = slowHasher();
    const limited = new ConcurrencyLimitedPasswordHasher(slow.hasher, 4);

    const results = Array.from({ length: 10 }, (_, i) =>
      limited.verify('hash:pw', i % 2 === 0 ? 'pw' : 'wrong'),
    );
    await flush();
    expect(slow.running).toBe(4);

    // Release in rounds: each round frees the running ones, the queue moves up.
    for (let round = 0; round < 3; round++) {
      slow.releaseAll();
      await flush();
      expect(slow.running).toBeLessThanOrEqual(4);
    }

    expect(await Promise.all(results)).toEqual(
      Array.from({ length: 10 }, (_, i) => i % 2 === 0),
    );
    expect(slow.maxRunning).toBe(4);
  });

  it('hash() is limited the same way (registration, rehash at sign-in)', async () => {
    const slow = slowHasher();
    const limited = new ConcurrencyLimitedPasswordHasher(slow.hasher, 2);

    const results = Array.from({ length: 5 }, () => limited.hash('pw'));
    await flush();
    expect(slow.running).toBe(2);
    for (let round = 0; round < 3; round++) {
      slow.releaseAll();
      await flush();
    }

    expect(await Promise.all(results)).toEqual(Array(5).fill('hash:pw'));
    expect(slow.maxRunning).toBe(2);
  });

  it('first come, first served: waiting calls start in the order they arrived', async () => {
    const order: number[] = [];
    const gate: (() => void)[] = [];
    const hasher: PasswordHasher = {
      hash: async () => '',
      verify: async (stored) => {
        order.push(Number(stored));
        await new Promise<void>((resolve) => gate.push(resolve));
        return true;
      },
      needsRehash: () => false,
    };
    const limited = new ConcurrencyLimitedPasswordHasher(hasher, 1);

    const calls = [1, 2, 3].map((n) => limited.verify(String(n), 'pw'));
    for (let i = 0; i < 3; i++) {
      await flush();
      gate.shift()?.();
    }
    await Promise.all(calls);

    expect(order).toEqual([1, 2, 3]);
  });

  it('a failing call frees its place (the queue does not get stuck)', async () => {
    let calls = 0;
    const hasher: PasswordHasher = {
      hash: async () => '',
      verify: async () => {
        calls++;
        if (calls === 1) throw new Error('broken hash');
        return true;
      },
      needsRehash: () => false,
    };
    const limited = new ConcurrencyLimitedPasswordHasher(hasher, 1);

    await expect(limited.verify('x', 'pw')).rejects.toThrow('broken hash');
    await expect(limited.verify('x', 'pw')).resolves.toBe(true);
  });

  it('needsRehash is passed through without waiting (no hashing, just reading the string)', () => {
    const limited = new ConcurrencyLimitedPasswordHasher(
      { ...slowHasher().hasher, needsRehash: () => true },
      1,
    );
    expect(limited.needsRehash('anything')).toBe(true);
  });

  // Owner, 2026-11-23: a full queue answers at once instead of making everyone wait —
  // otherwise a flood from many IPs delays real users' sign-ins without bound.
  it('queue full: the next call fails at once with PasswordHasherBusyError, nothing is started', async () => {
    const slow = slowHasher();
    const limited = new ConcurrencyLimitedPasswordHasher(slow.hasher, 1, 2);

    const accepted = [1, 2, 3].map(() => limited.verify('hash:pw', 'pw'));
    await flush();
    expect(slow.running).toBe(1); // 1 running, 2 waiting

    await expect(limited.verify('hash:pw', 'pw')).rejects.toBeInstanceOf(
      PasswordHasherBusyError,
    );
    await expect(limited.hash('pw')).rejects.toBeInstanceOf(
      PasswordHasherBusyError,
    );

    for (let round = 0; round < 3; round++) {
      slow.releaseAll();
      await flush();
    }
    expect(await Promise.all(accepted)).toEqual([true, true, true]);
    expect(slow.maxRunning).toBe(1);
  });

  it('once the queue has room again, calls are accepted again', async () => {
    const slow = slowHasher();
    const limited = new ConcurrencyLimitedPasswordHasher(slow.hasher, 1, 0);

    const first = limited.verify('hash:pw', 'pw');
    await flush();
    await expect(limited.verify('hash:pw', 'pw')).rejects.toBeInstanceOf(
      PasswordHasherBusyError,
    );
    slow.releaseAll();
    await first;

    const second = limited.verify('hash:pw', 'pw');
    await flush();
    slow.releaseAll();
    expect(await second).toBe(true);
  });

  it('the queue length must be an integer of at least 0', () => {
    for (const maxQueue of [-1, 2.5]) {
      expect(
        () =>
          new ConcurrencyLimitedPasswordHasher(
            slowHasher().hasher,
            1,
            maxQueue,
          ),
      ).toThrow(RangeError);
    }
  });

  it('the limit must be a positive integer', () => {
    for (const limit of [0, -1, 1.5]) {
      expect(
        () => new ConcurrencyLimitedPasswordHasher(slowHasher().hasher, limit),
      ).toThrow(RangeError);
    }
  });
});
