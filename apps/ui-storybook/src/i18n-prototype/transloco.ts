import { type EnvironmentProviders, Injectable } from '@angular/core';
import {
  provideTransloco,
  provideTranslocoMissingHandler,
  type Translation,
  type TranslocoLoader,
  type TranslocoMissingHandler,
  type TranslocoMissingHandlerData,
} from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { LANGS, SOURCE_LANG } from './locale';

/**
 * Loads src/i18n/<lang>.json lazily: webpack turns the dynamic import into one small chunk
 * per language, fetched only when that language is first activated. Apps will load
 * public/i18n/<lang>.json over HTTP instead (ADR-0006).
 */
@Injectable({ providedIn: 'root' })
class StoryTranslationLoader implements TranslocoLoader {
  getTranslation(lang: string): Promise<Translation> {
    return import(`../i18n/${lang}.json`).then(
      (file: { default: Translation }) => file.default,
    );
  }
}

/**
 * Development / test behaviour (ADR-0006): a missing key is an error in the console — always,
 * not only when Angular's ngDevMode is on (Transloco's default handler checks ngDevMode,
 * which a production Storybook build turns off). The key itself is shown, so the gap is
 * visible on screen too. The e2e test fails on this message.
 */
@Injectable({ providedIn: 'root' })
class ReportingMissingHandler implements TranslocoMissingHandler {
  handle(key: string, data: TranslocoMissingHandlerData): string {
    console.error(`Missing translation for '${key}' (${data.activeLang})`);
    return key;
  }
}

/** Transloco for Storybook (the "app" of the prototype). libs/ui never imports this. */
export function provideStoryI18n(): EnvironmentProviders[] {
  return [
    ...provideTransloco({
      config: {
        availableLangs: [...LANGS],
        defaultLang: SOURCE_LANG,
        fallbackLang: SOURCE_LANG,
        reRenderOnLangChange: true, // switch at runtime, no reload
        prodMode: false,
        // No silent German fallback here: with useFallbackTranslation: true Transloco
        // resolves a key missing in ru/en from de WITHOUT calling the missing handler, so
        // nobody would notice. Production apps turn the fallback on (ADR-0006).
        missingHandler: { logMissingKey: true, useFallbackTranslation: false },
      },
      loader: StoryTranslationLoader,
    }),
    provideTranslocoMissingHandler(ReportingMissingHandler),
    // ICU messages ({count, plural, …}) with CLDR plural rules of the active language.
    provideTranslocoMessageformat(),
  ];
}
