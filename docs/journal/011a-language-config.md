# 011a · Список языков — в конфиге, а не в коде

Date: 2026-11-15 · Task: замечание владельца к 011 · [ADR-0006](../adr/0006-i18n-transloco.md) · Commits: (this entry)

## 🇷🇺 Что и зачем

**Что сделано.**

- **Было.** После 011 список языков был зашит в коде в трёх местах:
  - в `tools/i18n-check` (`LOCALES = {de, en, ru}`, поиск папок по `de.json`);
  - в `locale.ts` Storybook;
  - в пунктах тулбара в `preview.ts`.
- **Стало.** Источник один — `apps/ui-storybook/src/i18n/languages.json`:
  - `source` — исходный язык;
  - по одной строке на язык: `code`, `locale`, `name`.

  Его читают тулбар, Transloco, Intl-форматы и тест паритета.

- **Добавить кыргызский** = файл `ky.json` + одна строка `{ "code": "ky", "locale": "ky-KG", "name": "Кыргызча" }`. Код не меняется.

**Зачем (аналогия).** Меню в кафе печатают из одной таблицы блюд. Если новое блюдо приходится вписывать от руки в три разных меню, одно рано или поздно забудут. Теперь «таблица» одна.

**Что ещё ловит тест паритета.**

- Язык есть в конфиге, а файла нет → `ky: file missing`.
- Файл есть, а в конфиге его нет → `ky: file is not listed in languages.json`. Раньше такой файл просто молча игнорировался бы.
- Исходный язык не входит в список, или локаль записана неверно (`en_GB` вместо `en-GB`) → ошибка конфига.
- Плюралы проверяются по правилам CLDR локали из конфига. Для `ky-KG` это `one` и `other`, для `ru-RU` — `one`, `few`, `many`, `other`. Список форм не захардкожен, его даёт `Intl.PluralRules`.

**Почему тесты поменялись.** Изменилось требование: «список языков — из конфига». Поэтому `checkTranslations(files, source)` стал `checkTranslations(files, config)`, и старые тесты передают конфиг. Ожидания старых тестов не менялись. Добавлено 5 новых тестов. Порядок такой:

1. Сначала новые тесты: 12 упали на старой функции.
2. Потом реализация: 14 из 14 зелёные.
3. Мутация: добавил `ky` только в конфиг, без файла → `ky: file missing`, тест красный. После этого откатил.

**Что может сломаться.** Если добавить язык в конфиг приложения, но не в `KonturIntl`, встроенные фразы библиотеки останутся на языке по умолчанию. Для нового языка приложение даёт свою реализацию `KonturIntl` (это записано в ADR).

**Вопрос с собеседования.**

- **В:** Как сделать, чтобы новый язык не требовал правок кода?
- **О:** Держать список языков в одном конфиге, из которого читают и приложение (переключатель, i18n-библиотека, локаль форматов), и проверка в CI. Тогда новый язык — это данные (файл перевода и строка в конфиге), а CI сам проверит его полноту по правилам CLDR.

## 🇬🇧 What and why

**What.**

- After 011, the language list was hard-coded in three places: the i18n check, the Storybook locale helpers and the toolbar items.
- Now there is one config, `languages.json`, read by all of them.
- Adding Kyrgyz = `ky.json` + one line in the config; no code changes.

**What the check now also catches.**

- A configured language without its file.
- A file without a config line.
- An invalid source or locale in the config.
- Plural forms are checked by the CLDR rules of the configured locale.

**Why tests changed.** The requirement changed: the list now comes from the config. The function signature changed from `checkTranslations(files, source)` to `checkTranslations(files, config)`.

- Old expectations stay the same; 5 tests were added.
- Red first: 12 failures against the old function.
- Mutation: a config-only `ky` made the check fail.

**Interview question.**

- **Q:** How do you add a language without code changes?
- **A:** One config read both by the app and by CI. A new language is data: the translation file plus a config line. CI checks it with the CLDR rules of its locale.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Liste der Sprachen stand vorher an drei Stellen im Code. Jetzt steht sie nur in einer Datei: `languages.json`. Der Sprachumschalter, Transloco, die Formate und der Test in der CI lesen dieselbe Datei. Für eine neue Sprache, zum Beispiel Kirgisisch, braucht man nur eine Übersetzungsdatei und eine Zeile in der Konfiguration. Der Test prüft auch, ob eine Datei fehlt oder ob es eine Datei ohne Eintrag gibt. Die Pluralformen prüft er nach den CLDR-Regeln der Locale.

### Fachwortschatz

| Deutsch                 | English            | Русский                    |
| ----------------------- | ------------------ | -------------------------- |
| die Konfigurationsdatei | configuration file | файл конфигурации          |
| die Sprachliste         | language list      | список языков              |
| fest im Code verdrahtet | hard-coded         | захардкожено, зашито в код |
| die Ausgangssprache     | source language    | исходный язык              |
| der Eintrag             | entry              | запись, строка             |
