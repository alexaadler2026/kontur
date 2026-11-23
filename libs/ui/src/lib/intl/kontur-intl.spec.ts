import { TestBed } from '@angular/core/testing';
import {
  KonturIntl,
  KonturIntlDe,
  KonturIntlEn,
  KonturIntlRu,
  provideKonturIntl,
} from './kontur-intl';

// KonturIntl.locale (owner, 2026-11-23, Progress.md): numbers the library formats itself —
// the percent of k-progress — go through Intl with the locale of the UI language.

describe('KonturIntl.locale', () => {
  it.each([
    [KonturIntlDe, 'de-DE'],
    [KonturIntlEn, 'en-GB'],
    [KonturIntlRu, 'ru-RU'],
  ])('%o → %s', (intl, locale) => {
    TestBed.configureTestingModule({ providers: [provideKonturIntl(intl)] });

    expect(TestBed.inject(KonturIntl).locale()).toBe(locale);
  });

  it('without a provider: German (the default language)', () => {
    expect(TestBed.inject(KonturIntl).locale()).toBe('de-DE');
  });
});
