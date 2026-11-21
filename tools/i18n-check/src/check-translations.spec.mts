import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkTranslations,
  CONFIG_FILE,
  flattenKeys,
  type LanguageConfig,
  type Translations,
} from './check-translations.mts';
import { findTranslationFolders } from './find-folders.mts';

// The language list comes from the folder's languages.json (ADR-0006), never from this tool.
const config = (): LanguageConfig => ({
  source: 'de',
  languages: [
    { code: 'de', locale: 'de-DE', name: 'Deutsch' },
    { code: 'en', locale: 'en-GB', name: 'English (en-GB)' },
    { code: 'ru', locale: 'ru-RU', name: 'Русский' },
  ],
});

// ICU plural for documents, correct in all three languages (ru: one / few / many).
const docs = {
  de: '{count, plural, one {# Dokument} other {# Dokumente}}',
  en: '{count, plural, one {# document} other {# documents}}',
  ru: '{count, plural, one {# документ} few {# документа} many {# документов} other {# документа}}',
};
const valid = (): Record<string, Translations> => ({
  de: { list: { count: docs.de, title: 'Dokumente' } },
  en: { list: { count: docs.en, title: 'Documents' } },
  ru: { list: { count: docs.ru, title: 'Документы' } },
});

describe('flattenKeys', () => {
  it('turns nested JSON into dotted keys', () => {
    expect([...flattenKeys({ a: { b: 'x', c: { d: 'y' } }, e: 'z' })]).toEqual([
      ['a.b', 'x'],
      ['a.c.d', 'y'],
      ['e', 'z'],
    ]);
  });
});

describe('checkTranslations', () => {
  it('a complete, valid set has no problems', () => {
    expect(checkTranslations(valid(), config())).toEqual([]);
  });

  it('reports a key missing in a translation and a key that de does not have', () => {
    const files = valid();
    delete (files['ru']['list'] as Translations)['title'];
    (files['en']['list'] as Translations)['extra'] = 'Extra';

    expect(checkTranslations(files, config())).toEqual([
      'en: extra key "list.extra" (not in de)',
      'ru: missing key "list.title"',
    ]);
  });

  it('reports a message that is not valid ICU', () => {
    const files = valid();
    (files['de']['list'] as Translations)['count'] =
      '{count, plural, one {# Dokument} other {# Dokumente}'; // missing closing brace

    const problems = checkTranslations(files, config());

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^de: "list\.count" is not valid ICU: /);
  });

  it('reports a plural without all CLDR forms of its language (ru needs few and many)', () => {
    const files = valid();
    (files['ru']['list'] as Translations)['count'] =
      '{count, plural, one {# документ} other {# документов}}';

    expect(checkTranslations(files, config())).toEqual([
      'ru: "list.count" plural misses CLDR forms: few, many',
    ]);
  });

  it('checks plurals nested inside other ICU arguments', () => {
    const files = valid();
    (files['ru']['list'] as Translations)['title'] =
      '{kind, select, signed {{n, plural, one {# подписан} other {# подписано}}} other {Документы}}';

    expect(checkTranslations(files, config())).toEqual([
      'ru: "list.title" plural misses CLDR forms: few, many',
    ]);
  });

  it('reports a missing language file', () => {
    const files = valid();
    delete files['en'];

    expect(checkTranslations(files, config())).toEqual(['en: file missing']);
  });
});

describe('language list from languages.json (adding a language = one JSON file + one line)', () => {
  const withKyrgyz = (): LanguageConfig => {
    const result = config();
    result.languages.push({ code: 'ky', locale: 'ky-KG', name: 'Кыргызча' });
    return result;
  };

  it('a language added to the config needs its file', () => {
    expect(checkTranslations(valid(), withKyrgyz())).toEqual([
      'ky: file missing',
    ]);
  });

  it('the new language is checked like the others, with its own CLDR plural rules', () => {
    const files = valid();
    files['ky'] = {
      list: {
        count: '{count, plural, one {# документ} other {# документ}}', // ky: one, other
        title: 'Документтер',
      },
    };
    expect(checkTranslations(files, withKyrgyz())).toEqual([]);

    delete (files['ky']['list'] as Translations)['title'];
    expect(checkTranslations(files, withKyrgyz())).toEqual([
      'ky: missing key "list.title"',
    ]);
  });

  it('a translation file that the config does not list is reported, not silently ignored', () => {
    const files = valid();
    files['ky'] = valid()['de'];

    expect(checkTranslations(files, config())).toEqual([
      `ky: file is not listed in ${CONFIG_FILE}`,
    ]);
  });

  it('the source language must be one of the configured languages', () => {
    expect(checkTranslations(valid(), { ...config(), source: 'fr' })).toEqual([
      `${CONFIG_FILE}: source "fr" is not in languages`,
    ]);
  });

  it('an invalid locale in the config is reported', () => {
    const broken = config();
    broken.languages[1].locale = 'en_GB'; // underscore: not a BCP 47 tag

    expect(checkTranslations(valid(), broken)).toEqual([
      `${CONFIG_FILE}: "en" has an invalid locale "en_GB"`,
    ]);
  });
});

describe('translation folders of the repo', () => {
  const folders = findTranslationFolders();

  it('finds the folders (guard: a check over zero folders proves nothing)', () => {
    expect(folders).toEqual(
      expect.arrayContaining([
        'apps/signflow/public/i18n',
        'apps/ui-storybook/src/i18n',
      ]),
    );
  });

  for (const folder of folders) {
    it(`${folder}: every language of ${CONFIG_FILE} is complete and valid`, () => {
      const root = new URL(`../../../${folder}/`, import.meta.url);
      const read = (name: string): unknown =>
        JSON.parse(readFileSync(new URL(name, root), 'utf8'));
      const files = Object.fromEntries(
        readdirSync(root)
          .filter((name) => name.endsWith('.json') && name !== CONFIG_FILE)
          .map((name) => [
            name.replace('.json', ''),
            read(name) as Translations,
          ]),
      );

      expect(
        checkTranslations(files, read(CONFIG_FILE) as LanguageConfig),
      ).toEqual([]);
    });
  }
});
