import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  checkTranslations,
  flattenKeys,
  type Translations,
} from './check-translations.mts';
import { findTranslationFolders } from './find-folders.mts';

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
    expect(checkTranslations(valid())).toEqual([]);
  });

  it('reports a key missing in a translation and a key that de does not have', () => {
    const files = valid();
    delete (files['ru']['list'] as Translations)['title'];
    (files['en']['list'] as Translations)['extra'] = 'Extra';

    expect(checkTranslations(files)).toEqual([
      'en: extra key "list.extra" (not in de)',
      'ru: missing key "list.title"',
    ]);
  });

  it('reports a message that is not valid ICU', () => {
    const files = valid();
    (files['de']['list'] as Translations)['count'] =
      '{count, plural, one {# Dokument} other {# Dokumente}'; // missing closing brace

    const problems = checkTranslations(files);

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatch(/^de: "list\.count" is not valid ICU: /);
  });

  it('reports a plural without all CLDR forms of its language (ru needs few and many)', () => {
    const files = valid();
    (files['ru']['list'] as Translations)['count'] =
      '{count, plural, one {# документ} other {# документов}}';

    expect(checkTranslations(files)).toEqual([
      'ru: "list.count" plural misses CLDR forms: few, many',
    ]);
  });

  it('checks plurals nested inside other ICU arguments', () => {
    const files = valid();
    (files['ru']['list'] as Translations)['title'] =
      '{kind, select, signed {{n, plural, one {# подписан} other {# подписано}}} other {Документы}}';

    expect(checkTranslations(files)).toEqual([
      'ru: "list.title" plural misses CLDR forms: few, many',
    ]);
  });

  it('reports a missing language file', () => {
    const files = valid();
    delete files['en'];

    expect(checkTranslations(files)).toEqual(['en: file missing']);
  });
});

describe('translation folders of the repo', () => {
  const folders = findTranslationFolders();

  it('finds the folders (guard: a check over zero folders proves nothing)', () => {
    expect(folders).toEqual(
      expect.arrayContaining(['apps/ui-storybook/src/i18n']),
    );
  });

  for (const folder of folders) {
    it(`${folder}: de, en and ru are complete and valid`, () => {
      const root = new URL(`../../../${folder}/`, import.meta.url);
      const files = Object.fromEntries(
        readdirSync(root)
          .filter((name) => name.endsWith('.json'))
          .map((name) => [
            name.replace('.json', ''),
            JSON.parse(
              readFileSync(new URL(name, root), 'utf8'),
            ) as Translations,
          ]),
      );

      expect(checkTranslations(files)).toEqual([]);
    });
  }
});
