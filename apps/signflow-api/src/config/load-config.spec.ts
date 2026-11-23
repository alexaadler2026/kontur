import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ConfigError, configKeys, loadConfig } from './load-config.js';

// DATABASE_URL is required since task 5 (a secret: no default), so every case below has one.
const DATABASE_URL = 'postgresql://signflow:local@127.0.0.1:5432/signflow';
const DB = { DATABASE_URL };
// Session lifetimes since task 7b (ADR-0010): defaults 7 and 30 days.
const SESSION_DEFAULTS = { SESSION_IDLE_DAYS: 7, SESSION_ABSOLUTE_DAYS: 30 };
// Throttling and the Argon2 queue since task 7c (ADR-0010, owner's numbers 2026-11-23).
const THROTTLE_DEFAULTS = {
  LOGIN_PAIR_FREE_FAILURES: 5,
  LOGIN_PAIR_MAX_LOCK_MINUTES: 15,
  LOGIN_IP_MAX_FAILURES: 50,
  LOGIN_IP_WINDOW_MINUTES: 15,
  AUTH_RATE_LIMIT_PER_MINUTE: 20,
  ARGON2_MAX_CONCURRENT: 4,
  // Since task 7d (owner, 2026-11-23): a full queue answers 503 at once.
  ARGON2_MAX_QUEUE: 16,
};
const DEFAULTS = { ...SESSION_DEFAULTS, ...THROTTLE_DEFAULTS };

describe('loadConfig (ADR-0009)', () => {
  it('reads PORT as a number', () => {
    expect(loadConfig({ ...DB, PORT: '4310' })).toEqual({
      ...DB,
      ...DEFAULTS,
      PORT: 4310,
    });
  });

  it('PORT may be missing: its default 3333 is the same everywhere and harmless', () => {
    expect(loadConfig(DB)).toEqual({ ...DB, ...DEFAULTS, PORT: 3333 });
  });

  it('session lifetimes: defaults 7 and 30 days, both changeable (ADR-0010)', () => {
    expect(loadConfig(DB)).toMatchObject(SESSION_DEFAULTS);
    expect(
      loadConfig({
        ...DB,
        SESSION_IDLE_DAYS: '1',
        SESSION_ABSOLUTE_DAYS: '90',
      }),
    ).toMatchObject({ SESSION_IDLE_DAYS: 1, SESSION_ABSOLUTE_DAYS: 90 });
  });

  it('throttling defaults are the numbers of the owner, and each can be changed (ADR-0010)', () => {
    expect(loadConfig(DB)).toMatchObject(THROTTLE_DEFAULTS);
    expect(
      loadConfig({
        ...DB,
        LOGIN_IP_MAX_FAILURES: '100',
        ARGON2_MAX_CONCURRENT: '2',
      }),
    ).toMatchObject({ LOGIN_IP_MAX_FAILURES: 100, ARGON2_MAX_CONCURRENT: 2 });
  });

  it('ARGON2_MAX_CONCURRENT="0" stops the start (no hash could ever run)', () => {
    expect(() => loadConfig({ ...DB, ARGON2_MAX_CONCURRENT: '0' })).toThrow(
      'ARGON2_MAX_CONCURRENT must be an integer from 1 to 64',
    );
  });

  for (const key of ['SESSION_IDLE_DAYS', 'SESSION_ABSOLUTE_DAYS']) {
    for (const value of ['0', '366', '1.5', 'week']) {
      it(`${key}="${value}" stops the start`, () => {
        expect(() => loadConfig({ ...DB, [key]: value })).toThrow(
          `${key} must be an integer from 1 to 365`,
        );
      });
    }
  }

  it('returns a frozen object: nobody changes the settings after the start', () => {
    expect(Object.isFrozen(loadConfig(DB))).toBe(true);
  });

  it('reads only the settings of the schema, nothing else from the environment', () => {
    expect(
      loadConfig({ ...DB, PORT: '4310', PATH: '/usr/bin', SECRET_X: 's3cr3t' }),
    ).toEqual({ ...DB, ...DEFAULTS, PORT: 4310 });
  });

  for (const value of ['abc', '', '0', '65536', '33.5']) {
    it(`PORT="${value}" stops the start with a message naming the variable, not the value`, () => {
      expect(() => loadConfig({ ...DB, PORT: value })).toThrow(ConfigError);
      expect(() => loadConfig({ ...DB, PORT: value })).toThrow(
        /PORT must be an integer from 1 to 65535/,
      );
      try {
        loadConfig({ ...DB, PORT: value });
      } catch (error) {
        // The value is not repeated: another setting's value could be a secret.
        if (value) expect((error as Error).message).not.toContain(`"${value}"`);
      }
    });
  }

  const DATABASE_URL_RULE = 'DATABASE_URL must be a postgresql:// URL';

  it('DATABASE_URL missing: the start stops — a secret never has a default', () => {
    expect(() => loadConfig({})).toThrow(DATABASE_URL_RULE);
  });

  it('DATABASE_URL not a PostgreSQL URL: the message names it, never its value (it holds a password)', () => {
    const wrong = 'mysql://root:Geheim-Pass@db/signflow';
    expect(() => loadConfig({ DATABASE_URL: wrong })).toThrow(
      DATABASE_URL_RULE,
    );
    try {
      loadConfig({ DATABASE_URL: wrong });
    } catch (error) {
      expect((error as Error).message).not.toContain('Geheim');
    }
  });

  it('two wrong settings: one line each', () => {
    try {
      loadConfig({ PORT: 'abc' });
      expect.unreachable();
    } catch (error) {
      const lines = (error as Error).message.split('\n').slice(1);
      expect(lines).toEqual(
        expect.arrayContaining([
          '  PORT must be an integer from 1 to 65535',
          `  ${DATABASE_URL_RULE}`,
        ]),
      );
      expect(lines).toHaveLength(2);
    }
  });
});

describe('.env.example (ADR-0009: lists exactly the settings of the schema)', () => {
  const file = readFileSync(
    new URL('../../.env.example', import.meta.url),
    'utf8',
  );
  const listed = file
    .split('\n')
    .map((line) => /^([A-Z][A-Z0-9_]*)=/.exec(line.trim())?.[1])
    .filter((key): key is string => key !== undefined);

  it('has no setting twice', () => {
    expect(new Set(listed).size).toBe(listed.length);
  });

  it('lists every setting of the schema and nothing else', () => {
    expect([...listed].sort()).toEqual([...configKeys()].sort());
  });

  it('its values are valid settings', () => {
    const values = Object.fromEntries(
      file
        .split('\n')
        .map((line) => /^([A-Z][A-Z0-9_]*)=(.*)$/.exec(line.trim()))
        .filter((match) => match !== null)
        .map((match) => [match[1], match[2]]),
    );
    expect(() => loadConfig(values)).not.toThrow();
  });
});
