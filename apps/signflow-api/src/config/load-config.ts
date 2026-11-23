import { plainToInstance, Type } from 'class-transformer';
import {
  getMetadataStorage,
  IsInt,
  Matches,
  Max,
  Min,
  validateSync,
} from 'class-validator';

/**
 * An integer setting from `min` to `max`: converted from text, and on a wrong value the
 * message names the variable and the range (never the value).
 */
function IntSetting(min: number, max: number): PropertyDecorator {
  return (target, key) => {
    const message = `${String(key)} must be an integer from ${min} to ${max}`;
    Type(() => Number)(target, key);
    IsInt({ message })(target, key);
    Min(min, { message })(target, key);
    Max(max, { message })(target, key);
  };
}

/**
 * Every setting of signflow-api (ADR-0009). Rules for adding one:
 * - read once at start, here — nowhere else reads process.env (lint rule);
 * - **a secret never has a default**;
 * - a default only when the value is the same in every environment and harmless;
 *   everything else is required: missing → the start stops;
 * - every setting is listed in apps/signflow-api/.env.example (checked by a test).
 */
class ConfigSchema {
  /** HTTP port. Default 3333: the same inside every container, and harmless. */
  @Type(() => Number)
  @IsInt({ message: 'PORT must be an integer from 1 to 65535' })
  @Min(1, { message: 'PORT must be an integer from 1 to 65535' })
  @Max(65535, { message: 'PORT must be an integer from 1 to 65535' })
  PORT = 3333;

  /**
   * PostgreSQL connection, `postgresql://user:password@host:port/database`. Holds a
   * password, so: required, no default, never printed.
   */
  @Matches(/^postgres(ql)?:\/\/\S+$/, {
    message: 'DATABASE_URL must be a postgresql:// URL',
  })
  DATABASE_URL!: string;

  /** A session ends after this many days without a request (sliding). ADR-0010: 7. */
  @Type(() => Number)
  @IsInt({ message: 'SESSION_IDLE_DAYS must be an integer from 1 to 365' })
  @Min(1, { message: 'SESSION_IDLE_DAYS must be an integer from 1 to 365' })
  @Max(365, { message: 'SESSION_IDLE_DAYS must be an integer from 1 to 365' })
  SESSION_IDLE_DAYS = 7;

  /** A session ends this many days after sign-in, however active. ADR-0010: 30. */
  @Type(() => Number)
  @IsInt({ message: 'SESSION_ABSOLUTE_DAYS must be an integer from 1 to 365' })
  @Min(1, { message: 'SESSION_ABSOLUTE_DAYS must be an integer from 1 to 365' })
  @Max(365, {
    message: 'SESSION_ABSOLUTE_DAYS must be an integer from 1 to 365',
  })
  SESSION_ABSOLUTE_DAYS = 30;

  // Sign-in throttling (ADR-0010; defaults by the owner, 2026-11-23).

  /** Failures of one (e-mail, IP) pair before the delay starts (1, 2, 4 … minutes). */
  @IntSetting(1, 100)
  LOGIN_PAIR_FREE_FAILURES = 5;

  /** The longest delay of one (e-mail, IP) pair, in minutes. */
  @IntSetting(1, 1440)
  LOGIN_PAIR_MAX_LOCK_MINUTES = 15;

  /** Failures of one IP across all accounts that make it wait (password spraying) … */
  @IntSetting(1, 100_000)
  LOGIN_IP_MAX_FAILURES = 50;

  /** … within this sliding window, in minutes. */
  @IntSetting(1, 1440)
  LOGIN_IP_WINDOW_MINUTES = 15;

  /** Requests per minute per IP on the sign-in endpoint, counted in memory. */
  @IntSetting(1, 100_000)
  AUTH_RATE_LIMIT_PER_MINUTE = 20;

  /** Argon2id hashes running at once (46 MiB each); the rest wait in a queue. */
  @IntSetting(1, 64)
  ARGON2_MAX_CONCURRENT = 4;

  /**
   * Calls that may wait for a place; one more gets 503 at once (owner, 2026-11-23).
   * 16 = four rounds of 4: with ~0.3 s per hash on the server, at most ~1.2 s of waiting.
   */
  @IntSetting(0, 10_000)
  ARGON2_MAX_QUEUE = 16;
}

/** The validated, immutable settings. Code gets this object, never process.env. */
export type AppConfig = Readonly<ConfigSchema>;

/** A wrong or missing setting. The message names the variables, never their values. */
export class ConfigError extends Error {}

/** Names of all settings, from the schema itself (used by the .env.example check). */
export function configKeys(): string[] {
  const rules = getMetadataStorage().getTargetValidationMetadatas(
    ConfigSchema,
    '',
    true,
    false,
  );
  return [...new Set(rules.map((rule) => rule.propertyName))];
}

/**
 * Reads, converts and validates the settings once. Only the schema's variables are read;
 * the rest of the environment is ignored. Throws ConfigError with one line per problem.
 */
export function loadConfig(
  env: Record<string, string | undefined> = process.env,
): AppConfig {
  const own = Object.fromEntries(
    configKeys()
      .filter((key) => env[key] !== undefined)
      .map((key) => [key, env[key]]),
  );
  const config = plainToInstance(ConfigSchema, own);
  const errors = validateSync(config);
  if (errors.length > 0) {
    // Our own messages only: class-validator's error objects also carry the value.
    const lines = [
      ...new Set(
        errors.flatMap((error) => Object.values(error.constraints ?? {})),
      ),
    ];
    throw new ConfigError(
      `Invalid configuration (ADR-0009):\n${lines.map((line) => `  ${line}`).join('\n')}`,
    );
  }
  return Object.freeze({ ...config });
}
