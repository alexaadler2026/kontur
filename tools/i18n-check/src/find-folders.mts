import { existsSync, readdirSync } from 'node:fs';

const repoRoot = new URL('../../../', import.meta.url);

/**
 * Every translation folder of the apps (ADR-0006), as repo-relative POSIX paths:
 * `apps/<app>/public/i18n` (apps) and `apps/<app>/src/i18n` (the Storybook prototype),
 * if it contains the source file de.json.
 */
export function findTranslationFolders(): string[] {
  const apps = readdirSync(new URL('apps/', repoRoot), { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  return apps
    .flatMap((app) => [`apps/${app}/public/i18n`, `apps/${app}/src/i18n`])
    .filter((folder) => existsSync(new URL(`${folder}/de.json`, repoRoot)))
    .sort();
}
