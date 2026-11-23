/**
 * How passwords are stored and checked (ADR-0010). The rest of the code depends on this
 * interface only, so the implementation (today Node's built-in Argon2id) can be replaced
 * in one place.
 */
export interface PasswordHasher {
  /** One-way hash with a fresh random salt, as a self-describing string. */
  hash(password: string): Promise<string>;
  /** True when `password` matches the stored string. */
  verify(stored: string, password: string): Promise<boolean>;
  /** True when the stored string was made with other parameters: hash again at login. */
  needsRehash(stored: string): boolean;
}
