import { DOCUMENT } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import {
  effect,
  type EnvironmentProviders,
  inject,
  Injectable,
  Injector,
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
import { STARTUP_TIMEOUT_MS } from '../startup-timeout';
import { TranslocoKonturIntl } from './kontur-intl';
import { LANGS, SOURCE_LANG, startLang } from './languages';
import { readSavedLang } from './saved-language';

/** Fetches public/i18n/<lang>.json, one small file per language, only when needed. */
@Injectable({ providedIn: 'root' })
class HttpTranslationLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    return this.http.get<Translation>(`i18n/${lang}.json`);
  }
}

/**
 * A missing key is an error in the console (ADR-0006). Development and tests show the key
 * itself, so a gap in en/ru is seen, not quietly filled. Production shows the German text
 * when German has the key.
 *
 * Why here and not Transloco's `useFallbackTranslation`: that option makes `load('ru')`
 * fetch ru.json and de.json together (forkJoin, bypassing the cache) — a second de.json
 * next to ours, and a failed de.json would fail Russian too. German is loaded by
 * loadStartLanguage, in parallel; this handler only reads it.
 */
@Injectable({ providedIn: 'root' })
class ReportingMissingHandler implements TranslocoMissingHandler {
  // Lazy: TranslocoService itself depends on this handler.
  private readonly injector = inject(Injector);
  private readonly showGerman = !isDevMode();

  handle(
    key: string,
    data: TranslocoMissingHandlerData,
    params?: Record<string, unknown>,
  ): string {
    console.error(`Missing translation for '${key}' (${data.activeLang})`);
    if (this.showGerman && data.activeLang !== SOURCE_LANG) {
      const transloco = this.injector.get(TranslocoService);
      // Checked first: translating a key German lacks would call this handler again.
      if (key in transloco.getTranslation(SOURCE_LANG)) {
        return transloco.translate(key, params, SOURCE_LANG);
      }
    }
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

async function tryLoad(
  transloco: TranslocoService,
  lang: string,
): Promise<boolean> {
  try {
    await firstValueFrom(
      transloco.load(lang).pipe(timeout(STARTUP_TIMEOUT_MS)),
    );
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
  const view = inject(DOCUMENT).defaultView;
  const lang = startLang(
    view?.navigator.languages ?? [],
    // A getter: in private mode even reading window.localStorage throws.
    view ? readSavedLang(() => view.localStorage) : null,
  );

  // Both files are requested at once, with the same STARTUP_TIMEOUT_MS: one deadline,
  // so the worst case is 10 s, not 10 + 10 (owner, 2026-11-22). The cost: de.json is
  // also fetched for en/ru — a few KB, and production needs it as the fallback anyway.
  const start = tryLoad(transloco, lang);
  const fallback =
    lang === SOURCE_LANG ? start : tryLoad(transloco, SOURCE_LANG);

  // The start language arrived → start in it; German keeps loading in the background.
  if (await start) {
    transloco.setActiveLang(lang);
    return;
  }
  // Otherwise German, if it arrived; else keys. Each failure was logged by tryLoad.
  await fallback;
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
          // Off everywhere: the German fallback for a missing key lives in
          // ReportingMissingHandler (production only), see its comment.
          useFallbackTranslation: false,
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
