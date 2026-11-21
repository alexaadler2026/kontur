# 022 · AGENTS.md: one rule file for every agent — a map, not an encyclopedia

Date: 2026-11-21 · Task: before roadmap 1c · PR: — · Commits: `0b8b9ae` … (this entry)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- Правила для AI-агентов переехали из `CLAUDE.md` в **`AGENTS.md`**. Смысл не изменился;
  единственная правка текста: «Claude writes the code» → «The agent writes the code».
- `CLAUDE.md` теперь — одна строка-импорт `@AGENTS.md` и пояснение. Правил «только для
  Claude Code» в старом тексте не нашлось, поэтому больше там ничего нет.
- В `AGENTS.md` новый раздел **«Map, not encyclopedia»**: не длиннее ~150 строк,
  подробности — в `docs/` (ADR, планы, дизайн, глоссарий, бизнес-процессы) по ссылке.
- Проверка в CI: `pnpm check:agents-md` (скрипт `tools/check-agents-md.mjs`, 17 строк).
  Больше 150 строк → ошибка с подсказкой, куда вынести текст.
- В `next-steps.md` и `roadmap.md` (задача 15): перед задачей 15 — сессия навыка
  grill-with-docs; `SKILL.md` прочитать целиком до установки. Команда проверки CI
  заменена на `gh run list --limit 3` (в PowerShell `curl` — это `Invoke-WebRequest`).

**Термины.**

- **AGENTS.md** — открытый формат: файл в корне репозитория с инструкциями для любых
  агентов-программистов (Codex, Cursor, Copilot и др.). Один файл вместо отдельного для
  каждого инструмента.
- **Импорт `@путь`** — синтаксис Claude Code: строка `@AGENTS.md` в `CLAUDE.md` подставляет
  содержимое файла в контекст сессии.
- **Контекст** — всё, что модель «видит» в начале работы: инструкции, файлы, переписка.
  Он ограничен, и каждая лишняя строка правил вытесняет полезное.

**Зачем это нужно (аналогия из жизни).**
Новому сотруднику дают **схему офиса** на одной странице: где кухня, где бухгалтерия, к
кому идти с вопросом. Никто не вручает ему в первый день все регламенты компании на
800 страницах — он их не прочитает, а важное утонет. `AGENTS.md` — такая схема;
регламенты (ADR, планы, дизайн) лежат в своих папках, схема на них показывает.

**Почему «карта, а не энциклопедия».** Так команда OpenAI описала свой опыт в статье
[Harness engineering](https://openai.com/index/harness-engineering/): короткий `AGENTS.md`
(около 100 строк) работает как оглавление, а источник истины — структурированная папка
`docs/`. Один большой файл правил трудно проверять: он устаревает, правила в нём
противоречат друг другу, и агент тратит на него контекст. У нас то же: решения уже живут
в ADR, порядок — в `roadmap.md`, термины — в глоссарии. Лимит в CI не даёт файлу
незаметно разрастись.

**Как проверили, что Claude Code видит правила через импорт.**

1. Новая сессия без инструментов (не может читать файлы сама):
   `claude -p --tools "" -- "…what is the maximum line count of this repository's agent
rules file… If your context has no such rule, answer exactly: NO SUCH RULE."`
   → ответ по-русски (тоже правило из `AGENTS.md`) цитирует раздел «Map, not
   encyclopedia»: ~150 строк, подробности в `docs/adr`, `docs/plans`, … Этот раздел есть
   **только** в `AGENTS.md`.
2. Контроль: строка `@AGENTS.md` временно убрана → тот же вопрос → `NO SUCH RULE`.
   Строку вернули. Значит, правила приходят именно через импорт.
3. Вручную (для владельца, в этой задаче не запускали): новая сессия → `/memory` → в
   списке должен быть `AGENTS.md` как подключённый файл.

**Доказательство проверки длины (мутация).** `pnpm check:agents-md` на настоящем файле:
`AGENTS.md: 109 lines (limit 150) — ok`. Временно дописали строки до 150 → `ok`;
до 151 → `AGENTS.md has 151 lines (limit 150). Move details to docs/ (…) and link them.`,
код выхода 1 (шаг CI падает). Файл вернули.

**Какие были альтернативы и почему отказались.**

- Оставить всё в `CLAUDE.md`: другие агенты его не читают.
- Символическая ссылка `CLAUDE.md → AGENTS.md`: на Windows ссылки в git требуют прав и
  настройки; импорт проще и виден в тексте.
- Отдельный проект в `tools/` с unit-тестами для проверки длины: для 17 строк лишнее
  (решение владельца); доказательство — записанная мутация.

**Что может сломаться и как починить.**

- Симптом: Claude Code «не знает» правил → в `CLAUDE.md` пропала строка `@AGENTS.md`.
- Симптом: CI падает на шаге «AGENTS.md stays short» → перенести подробности в `docs/`,
  в `AGENTS.md` оставить ссылку в одну строку.

**Вопрос с собеседования по этой теме.**

- В: Как вы даёте AI-агенту правила проекта и почему не одним большим файлом?
- О: Короткий `AGENTS.md` — карта: цели, рабочие правила и ссылки на ADR, планы, дизайн
  и глоссарий. Подробности — в `docs/`, где у каждого документа свой хозяин и своя
  история. Большой файл съедает контекст, устаревает и противоречит сам себе; поэтому у
  нас лимит 150 строк проверяется в CI. Claude Code читает `CLAUDE.md`, поэтому там
  только импорт `@AGENTS.md`, — проверено новой сессией и контрольным запуском без импорта.

## 🇬🇧 What and why (short)

**What was done.** Agent rules moved from `CLAUDE.md` to `AGENTS.md` (the shared format
read by Codex, Cursor, Copilot and others), unchanged in meaning except "Claude writes the
code" → "The agent writes the code". `CLAUDE.md` only imports `@AGENTS.md`. A new section
"Map, not encyclopedia" caps the file at ~150 lines with details in `docs/`; CI enforces it
with `pnpm check:agents-md`. `next-steps.md` and `roadmap.md` (task 15) record a
grill-with-docs session before task 15 (read its `SKILL.md` in full before installing). The
CI check command is now `gh run list --limit 3`.

**Why.** Following OpenAI's [Harness engineering](https://openai.com/index/harness-engineering/):
a short AGENTS.md is a table of contents, the structured `docs/` is the system of record.
A big rule file eats context, goes stale and cannot be checked.

**Verification.** A fresh `claude -p --tools ""` session (no file access) quoted the new
section; with the import line removed it answered `NO SUCH RULE`. Length check mutation:
150 lines pass, 151 lines exit 1 with the hint.

**Interview question.** Q: How do you give an AI agent your project rules? A: A short
AGENTS.md as a map — goals, working rules, links to ADRs, plans, design and glossary;
details live in `docs/`. A 150-line limit is checked in CI. Claude Code gets the same file
through an `@AGENTS.md` import, verified with a fresh session and a control run.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Regeln für KI-Agenten stehen jetzt in `AGENTS.md`. Diese Datei lesen viele Werkzeuge,
nicht nur Claude Code. `CLAUDE.md` enthält nur noch einen Import dieser Datei. Die Regeln
sollen eine Landkarte sein, kein Lexikon: höchstens 150 Zeilen, die Details stehen in
`docs/`. Ein kleines Skript prüft die Länge in der CI. Wir haben mit einer neuen Sitzung
geprüft, dass Claude Code die Regeln über den Import wirklich sieht.

### Fachwortschatz

| Deutsch             | English                  | Русский                    |
| ------------------- | ------------------------ | -------------------------- |
| die Landkarte       | map                      | карта                      |
| das Nachschlagewerk | encyclopedia / reference | энциклопедия, справочник   |
| der Import          | import                   | импорт (подключение файла) |
| der Kontext         | context                  | контекст                   |
| die Zeilengrenze    | line limit               | лимит строк                |
| die Anweisung       | instruction              | инструкция                 |
