import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  effect,
  type EnvironmentProviders,
  inject,
  Injectable,
  isDevMode,
  makeEnvironmentProviders,
  provideAppInitializer,
  provideEnvironmentInitializer,
} from '@angular/core';
import { provideKonturIntl } from '@adlersoft/kontur-ui';
import {
  provideTransloco,
  provideTranslocoFallbackStrategy,
  provideTranslocoMissingHandler,
  type Translation,
  type TranslocoFallbackStrategy,
  type TranslocoLoader,
  type TranslocoMissingHandler,
  type TranslocoMissingHandlerData,
  TranslocoService,
} from '@jsverse/transloco';
import { provideTranslocoMessageformat } from '@jsverse/transloco-messageformat';
import { firstValueFrom, timeout } from 'rxjs';
import { TranslocoKonturIntl } from './kontur-intl';
import { LANGS, SOURCE_LANG, startLang } from './languages';

/** Fetches public/i18n/<lang>.json, one small file per language, only when needed. */
@Injectable({ providedIn: 'root' })
class HttpTranslationLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`i18n/${lang}.json`);
  }
}

/** A missing key is an error in the console; the key itself is shown (ADR-0006). */
@Injectable({ providedIn: 'root' })
class ReportingMissingHandler implements TranslocoMissingHandler {
  handle(key: string, data: TranslocoMissingHandlerData): string {
    console.error(`Missing translation for '${key}' (${data.activeLang})`);
    return key;
  }
}

/**
 * Transloco would quietly load another language when a file fails. We decide that
 * ourselves in loadStartLanguage, in one visible place, so this strategy offers none.
 */
@Injectable({ providedIn: 'root' })
class NoLoadFallback implements TranslocoFallbackStrategy {
  getNextLangs(): string[] {
    return [];
  }
}

/** A hanging request must not keep the page blank forever. */
const LOAD_TIMEOUT_MS = 10_000;

async function tryLoad(
  transloco: TranslocoService,
  lang: string,
): Promise<boolean> {
  try {
    await firstValueFrom(transloco.load(lang).pipe(timeout(LOAD_TIMEOUT_MS)));
    return true;
  } catch (error) {
    console.error(`[i18n] Could not load "${lang}" (i18n/${lang}.json)`, error);
    return false;
  }
}

/**
 * Runs before the first render, so the user never sees keys instead of texts.
 * Working beats pretty: whatever fails, the promise resolves and the app starts —
 * in the start language, else in German, else with keys. Each failure is logged.
 */
async function loadStartLanguage(): Promise<void> {
  const transloco = inject(TranslocoService);
  const lang = startLang(
    inject(DOCUMENT).defaultView?.navigator.languages ?? [],
  );

  if (await tryLoad(transloco, lang)) {
    transloco.setActiveLang(lang);
    return;
  }
  if (lang !== SOURCE_LANG) {
    await tryLoad(transloco, SOURCE_LANG);
  }
  transloco.setActiveLang(SOURCE_LANG);
}

/** Transloco for SignFlow (ADR-0006): de, en, ru from languages.json; ICU messages. */
export function provideI18n(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideTransloco({
      config: {
        availableLangs: LANGS,
        defaultLang: SOURCE_LANG,
        fallbackLang: SOURCE_LANG,
        reRenderOnLangChange: true, // switch at runtime, no reload
        prodMode: !isDevMode(),
        // Retrying at once does not cure a 404 or a dropped connection.
        failedRetries: 0,
        missingHandler: {
          logMissingKey: true,
          // Development and tests: a key missing in en/ru is reported, not quietly
          // filled from de. Production: the German text is shown (ADR-0006).
          useFallbackTranslation: !isDevMode(),
        },
      },
      loader: HttpTranslationLoader,
    }),
    provideTranslocoMissingHandler(ReportingMissingHandler),
    provideTranslocoFallbackStrategy(NoLoadFallback),
    // ICU messages ({count, plural, …}) with the CLDR plural rules of the active language.
    provideTranslocoMessageformat(),
    provideAppInitializer(loadStartLanguage),
    // <html lang> always names the active language: screen readers pick the voice
    // from it (WCAG 3.1.1 Language of Page).
    provideEnvironmentInitializer(() => {
      const root = inject(DOCUMENT).documentElement;
      const transloco = inject(TranslocoService);
      effect(() => {
        root.lang = transloco.activeLang();
      });
    }),
    provideKonturIntl(TranslocoKonturIntl),
  ]);
}
