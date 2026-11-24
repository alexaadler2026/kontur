import config from '../../../public/i18n/languages.json';
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

  // Owner, 2026-11-24: the switch shows each language's own name (nativeName), never the
  // region code — "English", not "English (en-GB)". The locale stays a separate field.
  it('each language has a self-name without a region code', () => {
    expect(config.languages.map((l) => l.nativeName)).toEqual([
      'Deutsch',
      'English',
      'Русский',
    ]);
    for (const language of config.languages) {
      expect(language.nativeName).not.toContain(language.locale);
    }
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
