/** The product UI languages (ADR-0006). de is the default and the source language. */
export const LANGS = ['de', 'en', 'ru'] as const;
export type Lang = (typeof LANGS)[number];

/**
 * Language → locale for Intl formats (ADR-0006). `en` means **en-GB** (European date order,
 * as in docs/design/README.md), not en-US.
 */
export const LOCALES: Record<Lang, string> = {
  de: 'de-DE',
  en: 'en-GB',
  ru: 'ru-RU',
};

export function isLang(value: unknown): value is Lang {
  return LANGS.includes(value as Lang);
}

/**
 * Dates via Intl, not Angular's DatePipe: DatePipe reads LOCALE_ID, which is fixed at
 * bootstrap and cannot follow a runtime language switch.
 * de 12.11.2026 · en 12/11/2026 · ru 12.11.2026
 */
export function formatDate(date: Date, lang: Lang): string {
  return new Intl.DateTimeFormat(LOCALES[lang], {
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
  return new Intl.NumberFormat(LOCALES[lang], {
    style: 'currency',
    currency,
  }).format(amount);
}
