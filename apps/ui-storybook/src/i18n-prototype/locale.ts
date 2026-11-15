import config from '../i18n/languages.json';

/**
 * The UI languages come from ONE config, src/i18n/languages.json (ADR-0006). The toolbar,
 * Transloco and the Intl formats read it here; tools/i18n-check reads the same file.
 * Adding a language = one line in languages.json + one <code>.json translation file.
 *
 * Locales: `en` means **en-GB** (European date order, as in docs/design/README.md).
 */
export type Lang = string;

export const SOURCE_LANG: Lang = config.source;
export const LANGUAGES = config.languages;
export const LANGS: Lang[] = LANGUAGES.map((language) => language.code);

const LOCALES = new Map(
  LANGUAGES.map((language) => [language.code, language.locale]),
);

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && LOCALES.has(value);
}

function localeOf(lang: Lang): string {
  return LOCALES.get(lang) ?? (LOCALES.get(SOURCE_LANG) as string);
}

/**
 * Dates via Intl, not Angular's DatePipe: DatePipe reads LOCALE_ID, which is fixed at
 * bootstrap and cannot follow a runtime language switch.
 * de 12.11.2026 · en 12/11/2026 · ru 12.11.2026
 */
export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(localeOf(lang), {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
}

/**
 * Currency via Intl. de 1.234,56 € · en €1,234.56 · ru 1 234,56 €
 * Note: Intl uses non-breaking spaces (U+00A0 / U+202F) — compare with Intl's output or
 * normalise spaces in tests.
 */
export function formatCurrency(
  amount: number,
  lang: Lang,
  currency = 'EUR',
): string {
  return new Intl.NumberFormat(localeOf(lang), {
    style: 'currency',
    currency,
  }).format(amount);
}
