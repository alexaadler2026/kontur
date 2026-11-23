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
