import { COMMON_PASSWORDS } from './common-passwords.js';

/**
 * Password rules (ADR-0010, NIST SP 800-63B rev. 4). No composition rules ("one digit, one
 * symbol"): length and a blocklist protect better and annoy less.
 */
export const PASSWORD_MIN_LENGTH = 15; // without a second factor (none in v1)
export const PASSWORD_MAX_LENGTH = 128;
/** A shorter part before "@" is not checked: "a@…" would forbid every "a". */
export const EMAIL_LOCAL_PART_MIN_LENGTH = 3;
/** Product names: the first words people try (NIST "context-specific words"). */
export const PRODUCT_WORDS = ['signflow', 'belegscan', 'kontur'] as const;

export type PasswordProblem =
  'too_short' | 'too_long' | 'common' | 'contains_email' | 'contains_product';

const common = new Set(COMMON_PASSWORDS);
const fold = (text: string) => text.normalize('NFC').toLowerCase();

/** All problems of a new password, in a fixed order; empty when it is acceptable. */
export function checkPassword(
  password: string,
  context: { email: string },
): PasswordProblem[] {
  const folded = fold(password);
  // Characters = code points after NFC: an emoji or "ü" counts once.
  const length = [...password.normalize('NFC')].length;
  const email = fold(context.email);
  const localPart = email.split('@')[0];

  const problems: PasswordProblem[] = [];
  if (length < PASSWORD_MIN_LENGTH) problems.push('too_short');
  if (length > PASSWORD_MAX_LENGTH) problems.push('too_long');
  if (common.has(folded)) problems.push('common');
  if (
    folded.includes(email) ||
    ([...localPart].length >= EMAIL_LOCAL_PART_MIN_LENGTH &&
      folded.includes(localPart))
  ) {
    problems.push('contains_email');
  }
  if (PRODUCT_WORDS.some((word) => folded.includes(word))) {
    problems.push('contains_product');
  }
  return problems;
}
