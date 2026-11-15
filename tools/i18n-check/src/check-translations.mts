import { parse, type Token } from '@messageformat/parser';

/** One language file as parsed JSON: nested objects whose leaves are ICU message strings. */
export type Translations = Record<string, unknown>;

/** The language config of a translation folder; the app reads the same file (ADR-0006). */
export const CONFIG_FILE = 'languages.json';

/**
 * Contents of languages.json. Adding a language = one line here + one <code>.json file;
 * nothing in this tool or in the app code changes.
 */
export interface LanguageConfig {
  /** The language every other file is compared with (de). */
  source: string;
  /** code = file name and Transloco language; locale = Intl locale and CLDR plural rules. */
  languages: { code: string; locale: string; name: string }[];
}

/** Nested JSON → dotted keys: { list: { title: "…" } } → "list.title". */
export function flattenKeys(
  tree: Translations,
  prefix = '',
): Map<string, string> {
  const keys = new Map<string, string>();
  for (const [name, value] of Object.entries(tree)) {
    const key = prefix ? `${prefix}.${name}` : name;
    if (typeof value === 'string') keys.set(key, value);
    else if (value && typeof value === 'object') {
      for (const entry of flattenKeys(value as Translations, key)) {
        keys.set(...entry);
      }
    }
  }
  return keys;
}

/**
 * All problems of one translation folder, as readable lines; empty array = everything fine.
 * - the config is valid: the source is a configured language, every locale is a BCP 47 tag;
 * - every configured language has a file, and every file is a configured language;
 * - en and ru have exactly the keys of the source (de): nothing missing, nothing extra;
 * - every message parses as ICU (the same parser Transloco's messageformat uses at runtime);
 * - every plural has all CLDR categories of its language (ru: one, few, many, other) —
 *   taken from Intl.PluralRules, not hard-coded.
 */
export function checkTranslations(
  files: Record<string, Translations>,
  config: LanguageConfig,
): string[] {
  const problems: string[] = [];
  const { source } = config;
  const locales = new Map<string, string>();
  for (const { code, locale } of config.languages) {
    try {
      Intl.getCanonicalLocales(locale);
      locales.set(code, locale);
    } catch {
      problems.push(
        `${CONFIG_FILE}: "${code}" has an invalid locale "${locale}"`,
      );
    }
  }
  if (problems.length > 0) return problems;
  if (!locales.has(source)) {
    return [`${CONFIG_FILE}: source "${source}" is not in languages`];
  }
  for (const lang of Object.keys(files)) {
    if (!locales.has(lang)) {
      problems.push(`${lang}: file is not listed in ${CONFIG_FILE}`);
    }
  }
  const sourceFile = files[source];
  if (!sourceFile) return [...problems, `${source}: file missing`].sort();
  const sourceKeys = flattenKeys(sourceFile);

  for (const [lang, locale] of locales) {
    const file = files[lang];
    if (!file) {
      problems.push(`${lang}: file missing`);
      continue;
    }
    const keys = flattenKeys(file);

    if (lang !== source) {
      for (const key of sourceKeys.keys()) {
        if (!keys.has(key)) problems.push(`${lang}: missing key "${key}"`);
      }
      for (const key of keys.keys()) {
        if (!sourceKeys.has(key)) {
          problems.push(`${lang}: extra key "${key}" (not in ${source})`);
        }
      }
    }

    const required = new Intl.PluralRules(locale).resolvedOptions()
      .pluralCategories;
    for (const [key, message] of keys) {
      let tokens: Token[];
      try {
        tokens = parse(message, { strict: false });
      } catch (error) {
        problems.push(
          `${lang}: "${key}" is not valid ICU: ${(error as Error).message}`,
        );
        continue;
      }
      for (const cases of pluralCases(tokens)) {
        const missing = required.filter(
          (category) => !cases.includes(category),
        );
        if (missing.length > 0) {
          problems.push(
            `${lang}: "${key}" plural misses CLDR forms: ${missing.join(', ')}`,
          );
        }
      }
    }
  }
  return problems.sort();
}

/** The case keys of every `plural` in the message, also inside select/plural branches. */
function pluralCases(tokens: Token[]): string[][] {
  const found: string[][] = [];
  for (const token of tokens) {
    if (
      token.type === 'plural' ||
      token.type === 'select' ||
      token.type === 'selectordinal'
    ) {
      if (token.type === 'plural') found.push(token.cases.map((c) => c.key));
      for (const branch of token.cases)
        found.push(...pluralCases(branch.tokens));
    }
  }
  return found;
}
