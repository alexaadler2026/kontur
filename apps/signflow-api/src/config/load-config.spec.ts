import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ConfigError, configKeys, loadConfig } from './load-config.js';

describe('loadConfig (ADR-0009)', () => {
  it('reads PORT as a number', () => {
    expect(loadConfig({ PORT: '4310' })).toEqual({ PORT: 4310 });
  });

  it('PORT may be missing: its default 3333 is the same everywhere and harmless', () => {
    expect(loadConfig({})).toEqual({ PORT: 3333 });
  });

  it('returns a frozen object: nobody changes the settings after the start', () => {
    expect(Object.isFrozen(loadConfig({}))).toBe(true);
  });

  it('reads only the settings of the schema, nothing else from the environment', () => {
    expect(
      loadConfig({ PORT: '4310', PATH: '/usr/bin', SECRET_X: 's3cr3t' }),
    ).toEqual({
      PORT: 4310,
    });
  });

  for (const value of ['abc', '', '0', '65536', '33.5']) {
    it(`PORT="${value}" stops the start with a message naming the variable, not the value`, () => {
      expect(() => loadConfig({ PORT: value })).toThrow(ConfigError);
      expect(() => loadConfig({ PORT: value })).toThrow(
        /PORT must be an integer from 1 to 65535/,
      );
      try {
        loadConfig({ PORT: value });
      } catch (error) {
        // The value is not repeated: another setting's value could be a secret.
        if (value) expect((error as Error).message).not.toContain(`"${value}"`);
      }
    });
  }
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
