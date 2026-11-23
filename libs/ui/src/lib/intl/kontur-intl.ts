import {
  Injectable,
  type Provider,
  type Signal,
  signal,
  type Type,
} from '@angular/core';

/**
 * Built-in accessibility strings of the library (ADR-0006, contract header). Components
 * get every visible text as input; only the few texts they own (the name of a Tag's remove
 * button, the close button of an Alert, later "1–7 von 12" in Pagination) come from here,
 * and the locale for the few numbers it formats itself (the percent of k-progress).
 *
 * - The library ships German (default), English and Russian — the product UI languages.
 * - An app replaces the provider with its own implementation on top of its i18n library
 *   (pattern: Angular Material's MatPaginatorIntl): provideKonturIntl(AppKonturIntl).
 * - Members are signals, so components re-render when the app switches the language.
 *
 * libs/ui never imports an i18n library (ESLint no-restricted-imports).
 */
@Injectable({ providedIn: 'root', useFactory: () => new KonturIntlDe() })
export abstract class KonturIntl {
  /** Action of the remove button of k-tag; the tag text is added to the name. */
  abstract readonly removeLabel: Signal<string>;
  /** Name of the close button of k-alert ("Schließen" in the Alert mockup). */
  abstract readonly closeLabel: Signal<string>;
  /**
   * BCP 47 locale of the UI language, for Intl formats ("68 %" in de, "68%" in en).
   * Not LOCALE_ID: that is fixed at bootstrap and cannot follow a language switch.
   */
  abstract readonly locale: Signal<string>;
}

/** Deutsch — the default. "Entfernen" is the text of the Tag mockup. */
@Injectable()
export class KonturIntlDe extends KonturIntl {
  readonly removeLabel = signal('Entfernen').asReadonly();
  readonly closeLabel = signal('Schließen').asReadonly();
  readonly locale = signal('de-DE').asReadonly();
}

/** English (en-GB). */
@Injectable()
export class KonturIntlEn extends KonturIntl {
  readonly removeLabel = signal('Remove').asReadonly();
  readonly closeLabel = signal('Close').asReadonly();
  readonly locale = signal('en-GB').asReadonly();
}

/** Русский. */
@Injectable()
export class KonturIntlRu extends KonturIntl {
  readonly removeLabel = signal('Удалить').asReadonly();
  readonly closeLabel = signal('Закрыть').asReadonly();
  readonly locale = signal('ru-RU').asReadonly();
}

/** Replaces the built-in strings: `providers: [provideKonturIntl(KonturIntlEn)]`. */
export function provideKonturIntl(intl: Type<KonturIntl>): Provider {
  return { provide: KonturIntl, useClass: intl };
}
