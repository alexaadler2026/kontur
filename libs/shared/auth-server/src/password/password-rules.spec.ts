import { describe, expect, it } from 'vitest';
import { checkPassword } from './password-rules.js';

const email = 'aigul.sadykova@firma.kg';
const ok = 'Grüne Berge über Bischkek'; // 25 characters, not common, no context words

describe('checkPassword (ADR-0010, NIST SP 800-63B rev. 4)', () => {
  it('accepts a long passphrase without context words', () => {
    expect(checkPassword(ok, { email })).toEqual([]);
  });

  it('needs at least 15 characters (no second factor in v1)', () => {
    expect(checkPassword('a'.repeat(14) + 'Z', { email })).toEqual([]);
    expect(checkPassword('Kurzes Passwor', { email })).toEqual(['too_short']); // 14
  });

  it('allows at most 128 characters', () => {
    const long = 'Grüne Berge über Bischkek '.repeat(5); // 130
    expect(checkPassword(long.slice(0, 128), { email })).toEqual([]);
    expect(checkPassword(long, { email })).toEqual(['too_long']);
  });

  it('counts characters, not UTF-16 units: 15 emoji are 15 characters', () => {
    expect(checkPassword('🔑'.repeat(15), { email })).toEqual([]);
    expect(checkPassword('🔑'.repeat(14), { email })).toEqual(['too_short']);
  });

  it('counts after NFC: u + U+0308 is one character', () => {
    // Built from code points so no editor can silently turn it into the composed form.
    const uUmlaut = 'u' + String.fromCharCode(0x0308);
    expect(uUmlaut).toHaveLength(2);
    // 14 × "ü" written as two code points each: 28 code points, 14 characters.
    expect(checkPassword(uUmlaut.repeat(14), { email })).toEqual(['too_short']);
  });

  it('rejects a common password from the list, ignoring case', () => {
    expect(checkPassword('1q2w3e4r5t6y7u8i9o0p', { email })).toEqual([
      'common',
    ]);
    expect(checkPassword('1Q2W3E4R5T6Y7U8I9O0P', { email })).toEqual([
      'common',
    ]);
  });

  it('rejects a password that contains the whole e-mail address, ignoring case', () => {
    expect(
      checkPassword('mein AIGUL.SADYKOVA@FIRMA.KG ist sicher', { email }),
    ).toContain('contains_email');
  });

  it('rejects a password that contains the part of the e-mail before @', () => {
    expect(checkPassword('Aigul.Sadykova und Berge', { email })).toEqual([
      'contains_email',
    ]);
  });

  it('ignores a local part shorter than 3 characters (otherwise "a@…" forbids every "a")', () => {
    expect(checkPassword(ok, { email: 'gr@firma.kg' })).toEqual([]);
    expect(checkPassword(ok, { email: 'grü@firma.kg' })).toEqual([
      'contains_email',
    ]);
  });

  it.each(['signflow', 'BelegScan', 'KONTUR'])(
    'rejects a password that contains the product name "%s"',
    (word) => {
      expect(checkPassword(`mein ${word} Passwort 2026`, { email })).toEqual([
        'contains_product',
      ]);
    },
  );

  it('reports every problem at once', () => {
    expect(checkPassword('signflow', { email })).toEqual([
      'too_short',
      'contains_product',
    ]);
  });
});
