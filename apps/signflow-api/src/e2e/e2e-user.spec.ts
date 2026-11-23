import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { parseE2eUser } from './e2e-user.js';

// Task 8-1, owner 2026-11-23: the e2e test account also follows the password rules of 7a
// (15+ characters, not a common password, no part of the e-mail, no product name).

const userFile = fileURLToPath(
  new URL('../../../signflow-e2e/src/support/e2e-user.json', import.meta.url),
);

describe('parseE2eUser', () => {
  it('the committed e2e account is valid and follows the password rules', () => {
    expect(parseE2eUser(readFileSync(userFile, 'utf8'))).toEqual({
      email: 'e2e.nutzer@beispiel.de',
      password: 'Kranich-Wolke-Tinte-2026',
    });
  });

  it('a password that breaks the rules stops the server, with the reasons', () => {
    const json = JSON.stringify({
      email: 'e2e.nutzer@beispiel.de',
      password: 'e2e.nutzer-signflow',
    });

    expect(() => parseE2eUser(json)).toThrow(
      'e2e account: the password breaks the password rules (contains_email, contains_product)',
    );
  });

  it.each([
    ['not JSON', '{'],
    ['no password', JSON.stringify({ email: 'e2e.nutzer@beispiel.de' })],
    ['not an e-mail', JSON.stringify({ email: 'nutzer', password: 'x' })],
  ])('%s → a clear error', (_case, json) => {
    expect(() => parseE2eUser(json)).toThrow(/^e2e account: /);
  });
});
