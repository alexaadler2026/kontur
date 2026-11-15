import { parse, type Token } from '@messageformat/parser';

/** One language file as parsed JSON: nested objects whose leaves are ICU message strings. */
export type Translations = Record<string, unknown>;

/** The product UI languages (ADR-0006) and the locale whose CLDR plural rules apply. */
const LOCALES: Record<string, string> = {
  de: 'de-DE',
  en: 'en-GB',
  ru: 'ru-RU',
};

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
 * - every language of LOCALES has a file;
 * - en and ru have exactly the keys of the source (de): nothing missing, nothing extra;
 * - every message parses as ICU (the same parser Transloco's messageformat uses at runtime);
 * - every plural has all CLDR categories of its language (ru: one, few, many, other) —
 *   taken from Intl.PluralRules, not hard-coded.
 */
export function checkTranslations(
  files: Record<string, Translations>,
  source = 'de',
): string[] {
  const problems: string[] = [];
  const sourceFile = files[source];
  if (!sourceFile) return [`${source}: file missing`];
  const sourceKeys = flattenKeys(sourceFile);

  for (const lang of Object.keys(LOCALES)) {
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

    const required = new Intl.PluralRules(LOCALES[lang]).resolvedOptions()
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
