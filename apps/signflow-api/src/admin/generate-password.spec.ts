import { checkPassword } from '@adlersoft/auth-server';
import { describe, expect, it } from 'vitest';
import { generatePassword } from './generate-password.js';

// Owner, 2026-11-24: create-admin --generate-password makes the password itself —
// 24+ characters, passing our password rules (ADR-0010) — so nothing has to be typed.

describe('generatePassword', () => {
  const email = 'aigul@firma.kg';
  const samples = Array.from({ length: 200 }, () => generatePassword(email));

  it('at least 24 characters', () => {
    for (const password of samples)
      expect(password.length).toBeGreaterThanOrEqual(24);
  });

  it('passes the password rules', () => {
    for (const password of samples)
      expect(checkPassword(password, { email })).toEqual([]);
  });

  it('random: no two of 200 are the same', () => {
    expect(new Set(samples).size).toBe(samples.length);
  });

  it('only characters that survive any terminal and keyboard (no spaces, ASCII)', () => {
    for (const password of samples) expect(password).toMatch(/^[A-Za-z0-9-]+$/);
  });
});
