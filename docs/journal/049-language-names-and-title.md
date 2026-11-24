# 049 · Самоназвания языков и заголовок вкладки из i18n

Date: 2026-11-24 · Task: решения владельца после 8-3 · PR: — · Commits: `9467c62`, `a1fa007`, `7426e74`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**1. Самоназвания языков.** Переключатель показывал «English (en-GB)». Владелец решил, что
нужны **самоназвания**, то есть имя языка на самом этом языке: Deutsch, English, Русский.
Код региона пользователю не показывается.

- В `languages.json` название теперь отдельное поле `nativeName`.
- Поле `locale` (`en-GB`) осталось отдельно: оно задаёт формат дат и чисел (Intl), а не
  подпись в списке.
- Тест переключателя изменился вместе с требованием: было `'English (en-GB)'`, стало
  `'English'`. Новый тест проверяет все три названия и то, что ни одно не содержит свой
  `locale`.

**2. Заголовок вкладки.** Он и раньше менялся при смене языка: `translateSignal` — это
сигнал, который пересчитывается при смене языка. Но окончание « – SignFlow» дописывалось
в коде.

- Теперь вся строка — один перевод `auth.pageTitle`: «Anmelden – SignFlow», «Sign in –
  SignFlow», «Вход – SignFlow». Переводчик может поменять и порядок слов, и тире.
- Тест входа загружает все три файла переводов, переключает язык на en и ru и проверяет
  заголовок.
- **Честно про «красный» шаг:** новые тесты прошли сразу, потому что поведение уже было.
  Поэтому красным шагом стала мутация. Заголовок, который ставится один раз и больше не
  меняется, валит оба теста.

**4–5. Документы.**

- В `next-steps.md` добавлено: вернуть автоперезапуск API (watch), вынести `form-errors.ts`,
  когда он понадобится Belegscan.
- Туда же записан один нестабильный прогон `error-messages.spec.ts`: 1 падение из 5
  прогонов. Его ещё предстоит разобрать.
- В `AGENTS.md` два правила:
  - исправление проверяется настоящей командой владельца и по тому, что видит человек;
  - GUI, клавиатура и буфер обмена владельца — только после его явного «да».

**Аналогия.** Табличка на двери пишется на языке того, кто её читает: «Русский», а не
«Russian (ru-RU)».

**Что может сломаться.** Новый язык без `nativeName` покажет в списке пустую строку. Тест на
`languages.json` это поймает.

**Вопрос с собеседования.**

- В: Почему заголовок вкладки — один ключ перевода, а не «перевод + суффикс в коде»?
- О: Порядок слов и знаки препинания зависят от языка. Склейка в коде закрепляет
  немецкий порядок. Один ключ отдаёт всю строку переводчику.

## 🇬🇧 What and why (full)

**1. Self-names.** The switch now shows Deutsch, English, Русский from the separate
`nativeName` field. `locale` stays for Intl formats. The switch test changed with the
requirement; a new test checks the names and that none contains its locale.

**2. Tab title.** It already followed a language switch, but " – SignFlow" was glued in
code. Now the whole title is the `auth.pageTitle` translation. New tests switch to en/ru;
they passed at once, so the red step was a mutation: a title set once, not reactive,
fails both.

**4–5. Docs.**

- `next-steps.md`: bring back API watch, move `form-errors.ts` when Belegscan needs it.
  One flaky `error-messages.spec.ts` run is recorded.
- `AGENTS.md`: verify with the real command by what the person sees; the owner's GUI,
  keyboard and clipboard only after his explicit yes.

**Analogy.** A door sign is written in its reader's language.

**What can break.** A new language without `nativeName` would show an empty option; the
`languages.json` test catches it.

**Interview question.** Q: Why one translation key for the whole title? A: Word order and
punctuation depend on the language; gluing in code fixes the German order.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Sprachauswahl zeigt jetzt die Eigennamen der Sprachen: Deutsch, English, Русский. Der
Regionscode wie „en-GB“ wird nicht mehr angezeigt. Dafür gibt es in `languages.json` ein
eigenes Feld `nativeName`. Der Titel des Browser-Tabs kommt jetzt vollständig aus der
Übersetzung und wechselt mit der Sprache. Die neuen Tests waren sofort grün, weil das
Verhalten schon da war; deshalb haben wir mit einer Mutation geprüft. In `AGENTS.md` steht
jetzt: Eine Korrektur wird mit dem echten Befehl geprüft.

### Fachwortschatz

| Deutsch           | English             | Русский             |
| ----------------- | ------------------- | ------------------- |
| der Eigenname     | self-name (endonym) | самоназвание        |
| der Regionscode   | region code         | код региона         |
| der Seitentitel   | page title          | заголовок страницы  |
| die Mutation      | mutation            | мутация             |
| die Sprachauswahl | language switch     | переключатель языка |
