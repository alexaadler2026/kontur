import { checkPassword } from '@adlersoft/auth-server';
import { randomInt } from 'node:crypto';

// Letters and digits without look-alikes (0/O, 1/l/I): the person may copy it by hand.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
const GROUPS = 4;
const GROUP_LENGTH = 6;

/**
 * A random password for create-admin --generate-password (owner, 2026-11-24):
 * 4 groups of 6 characters joined by "-", e.g. "Kp7m2Q-xR4tvN9-…" — 27 characters,
 * ~140 bits from node:crypto. ASCII only, no spaces: it survives every terminal and
 * keyboard. Checked by the same password rules as a typed one.
 */
export function generatePassword(email: string): string {
  for (;;) {
    const groups = Array.from({ length: GROUPS }, () =>
      Array.from(
        { length: GROUP_LENGTH },
        () => ALPHABET[randomInt(ALPHABET.length)],
      ).join(''),
    );
    const password = groups.join('-');
    // Practically never refused (a product name or the e-mail by chance); then once more.
    if (checkPassword(password, { email }).length === 0) return password;
  }
}
