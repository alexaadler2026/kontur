import { LANGS, SOURCE_LANG, startLang } from './languages';

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
  });
});
