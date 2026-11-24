import { LANGS, localeOf, SOURCE_LANG, startLang } from './languages';

describe('localeOf (the Intl locale of a UI language, from languages.json)', () => {
  it('de → de-DE, en → en-GB (European date order), ru → ru-RU', () => {
    expect(['de', 'en', 'ru'].map(localeOf)).toEqual([
      'de-DE',
      'en-GB',
      'ru-RU',
    ]);
  });

  it('an unknown language → the locale of German', () => {
    expect(localeOf('fr')).toBe('de-DE');
  });
});

describe('languages', () => {
  it('reads the languages from public/i18n/languages.json, German as source', () => {
    expect(SOURCE_LANG).toBe('de');
    expect(LANGS).toEqual(['de', 'en', 'ru']);
  });

  describe('startLang (ADR-0006: browser languages, then German)', () => {
    it('takes the first browser language that the app has', () => {
      expect(startLang(['ru-RU', 'de-DE'])).toBe('ru');
    });

    it('matches by the language part only: en-US means our en (en-GB)', () => {
      expect(startLang(['en-US'])).toBe('en');
    });

    it('skips languages the app does not have', () => {
      expect(startLang(['fr-FR', 'en-GB'])).toBe('en');
    });

    it('falls back to German when nothing matches or the list is empty', () => {
      expect(startLang(['fr-FR'])).toBe('de');
      expect(startLang([])).toBe('de');
    });

    // Task 8-3: the choice of the language switch, saved in localStorage, comes first.
    it('a saved choice comes before the browser languages', () => {
      expect(startLang(['ru-RU'], 'en')).toBe('en');
    });

    it('a saved value the app does not have (old or edited) is ignored', () => {
      expect(startLang(['ru-RU'], 'fr')).toBe('ru');
      expect(startLang(['ru-RU'], null)).toBe('ru');
    });
  });
});
