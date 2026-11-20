import { readFileSync } from 'node:fs';

/** DI token for the API version string. */
export const APP_VERSION = Symbol('APP_VERSION');

/**
 * Reads `version` from the app's package.json.
 *
 * The file sits one folder above `src/` both in the sources
 * (apps/signflow-api/package.json) and in the build
 * (dist/apps/signflow-api/package.json, written by `generatePackageJson`).
 */
export function readAppVersion(): string {
  const packageJson = JSON.parse(
    readFileSync(new URL('../../package.json', import.meta.url), 'utf8'),
  ) as { version: string };
  return packageJson.version;
}
