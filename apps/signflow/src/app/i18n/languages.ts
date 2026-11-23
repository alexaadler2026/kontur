import config from '../../../public/i18n/languages.json';

/**
 * The UI languages come from ONE config, public/i18n/languages.json (ADR-0006).
 * Transloco and the start language read it here; tools/i18n-check reads the same file.
 * It is bundled into the app (imported), the translations themselves are fetched over HTTP.
 */
export const SOURCE_LANG: string = config.source;
export const LANGS: string[] = config.languages.map(
  (language) => language.code,
);

const LOCALES = new Map(
  config.languages.map((language) => [language.code, language.locale]),
);

/**
 * The Intl locale of a UI language (de → de-DE, en → en-GB, ru → ru-RU), from
 * languages.json; an unknown language gets German's.
 */
export function localeOf(lang: string): string {
  return LOCALES.get(lang) ?? (LOCALES.get(SOURCE_LANG) as string);
}

/**
 * Start language (ADR-0006): the first browser language the app has, else German.
 * Only the language part counts: "ru-RU" → "ru", "en-US" → "en" (our en is en-GB).
 * The saved choice comes first once the app has a language switcher.
 */
export function startLang(browserLangs: readonly string[]): string {
  for (const browserLang of browserLangs) {
    const code = browserLang.toLowerCase().split('-')[0];
    if (LANGS.includes(code)) {
      return code;
    }
  }
  return SOURCE_LANG;
}
