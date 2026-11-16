# 014 · ADR-волны 1 и 2 в репозитории: как их читать

Date: 2026-11-16 · Task: перенос принятой архитектуры (без плана) · Commits: (this entry)

## 🇷🇺 Что и зачем

**Что сделано.** Архитектура волн 1 и 2, которую владелец подготовил вместе с Fable, теперь лежит в репозитории:

| Что                                                  | Где                                                         |
| ---------------------------------------------------- | ----------------------------------------------------------- |
| Решения (ADR 0007–0020, английский, MADR)            | `docs/adr/` + строки в `docs/adr/README.md`                 |
| Схема архитектуры и план задач каждой волны          | `docs/plans/architecture-wave1.md`, `architecture-wave2.md` |
| Объяснения простыми словами, вопросы с собеседования | `docs/architecture/` (+ `README.md`)                        |
| Термины (RU \| DE \| EN)                             | `docs/glossary.md`, раздел «Architecture terms»             |
| Вопросы юристу (1–32, сквозная нумерация)            | `docs/legal-questions.md`                                   |

Кроме того:

- в CLAUDE.md строка про `libs/shared/api-types` заменена правилом из ADR-0007: типы API **генерируются** из `openapi.json`, руками их не пишем;
- в `business-processes.md` внесены «Demo starten» (ADR-0019) и автоматическая разблокировка подписанта через 24 часа (ADR-0016).

**Как читать ADR-волну (порядок).**

1. **Схема в `architecture-waveN.md`** — сначала общая картина: какие части есть и как они связаны.
2. **Объяснение в `docs/architecture/waveN-explanations.md`** — по каждому ADR: что решили, новые понятия, аналогия, что может сломаться.
3. **Сам ADR** — когда нужна точность: варианты, причины, последствия. ADR — источник правды; объяснение и схема только помогают его понять.
4. **План задач в конце `architecture-waveN.md`** — что делаем, в каком порядке и как проверяем (колонка «готово, когда…»).

**Зачем так (аналогия).** ADR — это закон, объяснение — комментарий к закону, план — график строительства. Спорный вопрос решают по закону, но читать удобнее начинать с комментария.

**Статусы, на которые стоит обратить внимание.**

- 0013 — «Accepted, library pending spike»: PDF-библиотеку выберем после пробной задачи.
- 0015 — «Accepted, provider pending deliverability test»: почтового провайдера выберем после теста доставки.

**Что заметил при переносе (не менял, решает владелец).** В `business-processes.md` §0 строки «Данные: сбрасываются регулярно (например, каждую ночь)» и «Хостинг: бесплатный [открыто]» расходятся с ADR-0019: песочница на 24 часа у каждого посетителя, отдельный платный сервер.

**Как проверено.**

- Текст перенесённых файлов совпадает с архивами: сравнивал без учёта пробелов и разметки, потому что Prettier выровнял только таблицы.
- 32 вопроса юристу, нумерация 1–32 без пропусков.
- В глоссарий добавлено 51 + 31 термин.

## 🇬🇧 What and why

**What was done.** The accepted architecture waves 1 and 2 are now in the repo:

- ADR 0007–0020 in `docs/adr/` (with index rows);
- diagrams and task plans in `docs/plans/architecture-wave{1,2}.md`;
- Russian explanations in `docs/architecture/`;
- terms in the glossary (RU | DE | EN);
- legal questions 1–32 in `docs/legal-questions.md`.

CLAUDE.md now says that API types are generated from the OpenAPI spec (ADR-0007). The business processes mention "Demo starten" (ADR-0019) and the automatic 24-hour unlock (ADR-0016).

**How to read a wave.** Diagram → explanation → ADR (the source of truth) → task plan. The ADR is the law, the explanation is the commentary, the plan is the construction schedule.

**Noticed, not changed.** Two rows in business processes §0 ("data reset nightly", "free hosting") disagree with ADR-0019; this is the owner's decision.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Architektur der Wellen 1 und 2 liegt jetzt im Repository: die ADRs 0007 bis 0020, Diagramme und Aufgabenpläne, Erklärungen auf Russisch, neue Fachbegriffe im Glossar und Fragen an einen Juristen. Man liest eine Welle in dieser Reihenfolge: zuerst das Diagramm, dann die Erklärung, dann das ADR selbst und zum Schluss den Aufgabenplan. Das ADR ist die maßgebliche Quelle. In CLAUDE.md steht jetzt: API-Typen werden aus der OpenAPI-Spezifikation generiert, nicht von Hand geschrieben.

### Fachwortschatz

| Deutsch                           | English                      | Русский               |
| --------------------------------- | ---------------------------- | --------------------- |
| die Architekturentscheidung (ADR) | architecture decision record | архитектурное решение |
| die Welle                         | wave                         | волна                 |
| der Aufgabenplan                  | task plan                    | план задач            |
| die maßgebliche Quelle            | source of truth              | источник правды       |
| die Rechtsfrage                   | legal question               | юридический вопрос    |
