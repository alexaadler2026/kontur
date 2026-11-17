# 016 · Волна 3 (Belegscan) и сводный roadmap в репозитории

Date: 2026-11-17 · Task: перенос принятой архитектуры (без плана) · Commits: 2fbc0a6, bf6ac9d, 524ccdf, a858734, (this entry)

## 🇷🇺 Что и зачем

**Что сделано.** Архитектура волны 3 (Belegscan) и общий план всех волн теперь лежат в репозитории — так же, как волны 1 и 2 в задаче 014:

| Что                                                      | Где                                                               |
| -------------------------------------------------------- | ----------------------------------------------------------------- |
| Решения ADR 0023–0028 (0023 — Proposed, ждёт спайка)     | `docs/adr/` + строки в `docs/adr/README.md`                       |
| Схема и план задач волны 3                               | `docs/plans/architecture-wave3.md`                                |
| Объяснения простыми словами, вопросы с собеседования     | `docs/architecture/wave3-explanations.md` (+ строка в оглавлении) |
| Термины волны 3 (RU \| DE \| EN)                         | `docs/glossary.md`, раздел «Architecture terms»                   |
| Вопросы юристу 33–38                                     | `docs/legal-questions.md`                                         |
| **Сводный план (roadmap)**: порядок, зависимости, рубежи | `docs/plans/roadmap.md`; ссылка на него в CLAUDE.md               |

Кроме того:

- в плане волны 2 задача 51 разделена на 51a/51b, в задачу 52 добавлена внешняя проверка доступности демо, абзац о порядке теперь ссылается на roadmap;
- в ADR-0027 уточнены две защиты при чтении XML из электронного счёта (см. ниже).

**Термины (одной фразой).**

- **Roadmap** (сводный план) — один файл, который говорит, в каком порядке делать задачи всех волн и что от чего зависит. Если план волны говорит иначе, прав roadmap.
- **Рубеж** (milestone) — точка, где появляется что-то работающее, что можно показать (например, «процесс 0 работает в демо»).
- **DOCTYPE** — заголовок XML-документа, в котором можно объявить «сущности» (entities) — подстановки текста.
- **Сущность XML** (entity) — сокращение, которое парсер разворачивает в текст. Опасна: может подтянуть внешний файл (XXE) или размножиться до гигабайт («billion laughs»).
- **`DOMParser`** — встроенный в браузер разборщик XML/HTML.

**Как читать roadmap вместе с планами волн.**

- **Что делает задача и как проверить** — в плане волны (`architecture-waveN.md`).
- **Когда её делать и после чего** — только в roadmap. В его разделе 2 перечислено, что изменилось относительно планов волн и почему.
- **Аналогия:** планы волн — это описания комнат в проекте дома, roadmap — график стройки. Что за комната, читаем в описании; когда её строить — в графике.

**Уточнение ADR-0027 простыми словами.**

- **DOCTYPE ищем в байтах, до разбора.** Сущности разворачиваются во время разбора. Если сначала разобрать файл, а потом проверить `document.doctype`, опасная подстановка уже случилась. Это как проверять посылку на взрывчатку после того, как её открыли.
- **`DOMParser` не бросает ошибку.** На сломанном XML он молча возвращает документ, внутри которого лежит элемент `<parsererror>`. Без явной проверки мы бы читали из «документа об ошибке» пустые поля. Поэтому ищем `<parsererror>` сами.

**Как перенос проверен.**

- Тексты из архивов и файлы в репозитории сравнил после одинакового форматирования Prettier: ADR, объяснения и roadmap совпадают байт в байт.
- Отличаются только места, которые я поменял намеренно:
  - строка 5 roadmap — имена файлов из архива заменены путями в репозитории;
  - в плане волны 3 разделы «Термины» и «Вопросы юристу» заменены ссылками, потому что их содержимое перенесено в общие документы.
- Шесть ADR волны 2 в новом архиве совпадают с репозиторием, поэтому изменился только план.

**Что может сломаться.**

- **Два источника порядка.** План волны и roadmap могут разойтись. Правило: прав roadmap; расхождения записываются в его раздел 2.
- **Неточные строки roadmap.** Строки задач 1–26 в roadmap записаны не из плана волны 1. Я сверил их и сообщил расхождения владельцу; исправлять их — решение владельца.

**Вопрос с собеседования.**

- **В:** Как вы безопасно читаете XML из загруженного пользователем файла в браузере?
- **О:**
  - **Размер.** Ограничиваю размер файла.
  - **DOCTYPE.** Отклоняю документ с DOCTYPE ещё в байтах, до разбора: без DOCTYPE нет сущностей, значит, нет XXE и «billion laughs».
  - **Ошибка разбора.** Явно проверяю `<parsererror>`, потому что `DOMParser` не бросает исключение.
  - **Корневой элемент.** Проверяю корневой элемент и пространство имён.
  - **Только чтение.** Результат разбора только читаю и никогда не вставляю в страницу.

## 🇬🇧 What and why

**What was done.** The wave 3 architecture (Belegscan) and the cross-wave roadmap are now in the repository, the same way as waves 1–2 in task 014:

- ADR 0023–0028 and index rows (0023 is Proposed, model pending the spike);
- `docs/plans/architecture-wave3.md`;
- `docs/architecture/wave3-explanations.md`;
- wave 3 terms in the glossary;
- legal questions 33–38;
- `docs/plans/roadmap.md`, linked from CLAUDE.md.

The wave 2 plan got the 51a/51b split, the uptime check in task 52 and a pointer to the roadmap.

**How to read it.**

- Wave plans say **what** a task is and how it is checked.
- The roadmap says **when** it is done and after what. Its section 2 lists every change against the wave plans.
- **Analogy:** room descriptions versus the construction schedule.

**ADR-0027 clarification.**

- **DOCTYPE on bytes.** The DOCTYPE check runs on the attachment's bytes before `DOMParser` is called. Entities are expanded during parsing, so `document.doctype` afterwards is too late.
- **`<parsererror>` checked explicitly.** `DOMParser` does not throw on broken XML; it returns a document containing `<parsererror>`.

**Verification.**

- Archive texts and repository files were compared after Prettier: identical except the intended edits (roadmap line 5 file names; terms and legal sections of the wave 3 plan replaced by links).
- The wave 1 reconciliation requested in the roadmap was reported to the owner as a list; nothing was changed.

**What can break.** The wave plans and the roadmap can drift apart. Rule: the roadmap wins, and changes are recorded in its section 2.

**Interview question.**

- **Q:** How do you parse untrusted XML safely in the browser?
- **A:**
  - Limit the size.
  - Reject any DOCTYPE in the raw bytes before parsing: no DOCTYPE means no entities, so no XXE and no billion laughs.
  - Check for `<parsererror>` explicitly.
  - Verify the root element and namespace.
  - Only read the result; never insert it into the page.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Architektur der Welle 3 (Belegscan) ist jetzt im Repository: sechs ADRs, ein Plan, Erklärungen, Fachbegriffe und Fragen an den Juristen. Neu ist auch ein gemeinsamer Fahrplan (Roadmap) für alle Wellen. Er bestimmt die Reihenfolge und die Abhängigkeiten der Aufgaben. Wenn ein Wellenplan etwas anderes sagt, gilt die Roadmap. In ADR-0027 steht jetzt genauer, wie wir XML aus E-Rechnungen sicher lesen. Ein DOCTYPE wird schon in den Bytes gesucht, vor dem Parsen. Außerdem prüfen wir das Element `<parsererror>`, weil `DOMParser` bei Fehlern keine Ausnahme wirft. Alle Texte wurden mit den Archiven verglichen.

### Fachwortschatz

| Deutsch                    | English        | Русский                |
| -------------------------- | -------------- | ---------------------- |
| der Fahrplan (die Roadmap) | roadmap        | сводный план (roadmap) |
| der Meilenstein            | milestone      | рубеж                  |
| die Abhängigkeit           | dependency     | зависимость            |
| die Reihenfolge            | order          | порядок                |
| die E-Rechnung             | e-invoice      | электронный счёт       |
| der XML-Parser             | XML parser     | разборщик XML          |
| die Entität                | entity         | сущность (XML)         |
| der Parserfehler           | parser error   | ошибка разбора         |
| der Abgleich               | reconciliation | сверка                 |
