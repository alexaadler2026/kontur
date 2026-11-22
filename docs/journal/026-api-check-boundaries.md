# 026 · Task 2: api-check in CI, platform tags everywhere, boundary checks

Date: 2026-11-22 · Task: roadmap 2, [ADR-0007](../adr/0007-api-contract.md) · PR: — · Commits: `e8481af`…

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

1. **`api-check`.** CI падает, если закоммиченный `openapi.json` не совпадает с тем, что
   на самом деле описывают DTO сервера.
2. **Теги.** У **каждого** проекта Nx теперь ровно один тег каждой оси: `scope:*` (чей
   продукт), `type:*` (какой слой), `platform:*` (где выполняется код). Новый шаг CI
   следит, чтобы проект без тега не проскочил.
3. **Правило для e2e:** e2e-проекты могут импортировать только `type:util`.
4. **«Фронтенд не может импортировать серверную библиотеку»** доказано записанной
   мутацией. Постоянный тест появится в задаче 6.

Термины:

- **Тег Nx** — метка в `project.json`. По меткам правило lint
  `@nx/enforce-module-boundaries` решает, кому от кого можно зависеть.
- **Граница модулей (module boundary)** — правило вида «проекты с тегом A могут
  импортировать только проекты с тегами B, C».
- **Граф проектов Nx** — список всех проектов и связей между ними, который Nx строит сам.

**Зачем это нужно (аналогия из жизни).**
`api-check` — это сверка чертежа с готовой деталью. Если инженер поменял деталь, а
чертёж не перерисовал, приёмка не подписывается. Теги — это пропуска в здании: правила
«кому в какое крыло можно» работают только у тех, у кого есть пропуск. Человек без
пропуска проходит куда угодно. Поэтому отдельная проверка следит, чтобы пропуск был у
каждого.

**Что уже было до задачи 2 (1a, 1c).**
Три оси тегов у проектов SignFlow и `libs/ui`; правила `platform:web` / `platform:server`;
`type:contract` ни от чего не зависит; `data-access` может читать контракт. Клиент
генерируется по хэшу контракта и разойтись с ним не может. Строка про сгенерированные типы
уже в `AGENTS.md`.

**Как это работает, шаг за шагом.**

1. **`signflow-api:api-check`**: `openapi.js … --check` строит документ в памяти (тем же
   кодом, что и `openapi`) и сравнивает со строкой файла. Если файлы разные — код выхода 1
   и подсказка:
   ```
   libs/signflow/api-contract/openapi.json is out of date (first difference at line 16).
     committed: "example": "0.1.0",
     generated: "example": "9.9.9",
   Run: pnpm nx run signflow-api:openapi — and commit the file.
   ```
   Перед сравнением `\r\n` заменяется на `\n`: на Windows git может отдать файл с другими
   переводами строк.
2. Во `inputs` цели входит и сам `openapi.json`, а у `signflow-api` в
   `implicitDependencies` — проект контракта. Поэтому ручная правка контракта тоже
   запускает проверку в `nx affected` и не берётся из кэша.
3. В CI `api-check` идёт в одном шаге с `lint test typecheck build build-storybook`, как
   записано в ADR («runs with lint on every affected build»).
4. **Теги `platform:*`.** `belegscan`, `ui-storybook` → `platform:web`. e2e-проекты,
   `tokens`, `i18n-check` → **`platform:server`**.
   - **Почему e2e — `server`, а не `neutral` (решение владельца).** Ось `platform`
     отвечает на вопрос «где выполняется этот код». Тест Playwright управляет браузером,
     но сам код теста бежит в **Node**: он использует `node:fs` (читает `package.json`
     API), `node:http` (`rawGet`). В браузере такой код не запустится. `neutral` значит
     «работает где угодно», как JSON контракта. Код, которому нужны API Node, — это
     `server`. То же с `tokens` и `i18n-check`: это Node-скрипты сборки.
   - Последствие: правило `platform:server` → только `server`/`neutral`. Случайный импорт
     браузерного кода из e2e теперь — ошибка lint.
5. **`type:e2e` → только `type:util`.** e2e общаются с приложением через браузер и HTTP,
   а не через `import`. Импорт компонента в e2e был бы ошибкой проектирования.
6. **`tools/check-project-tags.mjs`** (`pnpm check:project-tags`, шаг CI): у каждого
   проекта ровно один тег каждой оси, иначе ошибка с именем проекта.
   - Первая версия искала `project.json` в `apps/` и `libs/` и нашла 10 проектов. Nx
     показал 12: `tokens` и `i18n-check` лежат в `tools/`, и у обоих не было
     `platform:*`. Поэтому скрипт берёт список у Nx (`createProjectGraphAsync`), а не из
     папок: проект в новом месте не проскочит.
7. **Мутация для границы `platform` (вариант A).** Временная библиотека `tmp-server` с
   тегами `scope:signflow`, `type:util`, `platform:server` и временный файл в
   `apps/signflow`, который её импортирует. Lint красный, ошибка ровно одна:
   `A project tagged with "platform:web" can only depend on libs tagged with
"platform:web", "platform:neutral"`. Теги `scope` и `type` подобраны допустимыми,
   поэтому сработать могло только правило `platform`. Всё временное удалено. Постоянный
   тест — в задаче 6, когда появится первая настоящая серверная библиотека
   `libs/shared/api-kit` (пункт в `next-steps.md`).

**Доказательства (красный первым и мутации).**

- `api-check`: зелёный на чистом состоянии. (а) Пример в `HealthDto` изменён без
  перегенерации → красный, строка 16. (б) Контракт поправлен руками (`"ok"` → `"OK"`) →
  красный, строка 11. Вернули — зелёный.
- `check:project-tags`: первый запуск красный сам по себе — 5, а потом ещё 2 проекта без
  `platform:*`. После тегов: «12 projects … ok». Мутации: убрали `platform:web` у
  `belegscan` → `belegscan: needs exactly one platform:* tag`. Лишний `scope:signflow` у
  `ui` → `ui: needs exactly one scope:* tag`.
- Граница `platform`: записанная мутация, см. шаг 7.
- Полный прогон `lint test typecheck build build-storybook api-check` — 12 проектов
  зелёные. **Честно:** первый прогон сразу после `nx reset` упал на `belegscan:test` с
  `[vitest-pool-runner]: Timeout waiting for worker to respond`. Сами тесты не
  выполнялись; отдельно и при повторе всё зелёное. Это перегрузка машины при запуске
  воркера, с тегами не связано. Если повторится в CI — отдельная задача.

**Какие были альтернативы и почему отказались.**

- `api-check` через `git diff --exit-code` после `openapi`: перезаписывает файл в рабочей
  копии; сравнение в памяти ничего не трогает.
- Сделать `lint` зависимым от `api-check`: lint ждал бы сборки API; отдельная цель в
  том же шаге CI проще и кэшируется отдельно.
- Постоянный тест границы сейчас (вариант B): пришлось бы держать в репозитории
  ненастоящую библиотеку. Решили дождаться `api-kit`.
- Искать `project.json` по папкам: пропустил `tools/*` — заменили на граф Nx.

**Что может сломаться и как починить.**

- Симптом: `api-check` красный → поменяли DTO или контроллер → `pnpm nx run
signflow-api:openapi`, закоммитить `openapi.json`.
- Симптом: `check:project-tags` называет проект → добавить в его `project.json`
  недостающий тег (список осей — в `eslint.config.mjs`).
- Симптом: lint `A project tagged with "platform:…"` → импорт через границу; код,
  нужный обоим, вынести в `platform:neutral`.

**Вопрос с собеседования по этой теме.**

- В: Как вы не даёте фронтенду случайно импортировать серверный код в монорепозитории?
- О: Теги Nx по трём осям — продукт, слой, платформа — и правило
  `enforce-module-boundaries`: `platform:web` может зависеть только от `web` и `neutral`.
  Это ошибка lint, CI красный. Правило работает только для проектов с тегами, поэтому
  отдельный шаг CI по графу Nx проверяет, что у каждого проекта ровно один тег каждой
  оси. Само правило проверено мутацией: временная серверная библиотека, импорт из
  приложения — lint красный.

## 🇬🇧 What and why (full)

**What was done.** (1) `api-check` fails CI when the committed `openapi.json` differs from
what the server DTOs describe. (2) Every Nx project has exactly one `scope:*`, `type:*` and
`platform:*` tag, enforced by a CI step. (3) `type:e2e` may depend on `type:util` only.
(4) "The frontend cannot import a server library" is proven by a recorded mutation; a
permanent test follows in task 6.

**Why (real-life analogy).** `api-check` compares the drawing with the finished part.
Tags are building passes: access rules only apply to people who carry a pass, so a
separate check makes sure everyone has one.

**Already in place (1a, 1c).** Three tag axes on the SignFlow projects and `libs/ui`;
platform rules; `type:contract` depends on nothing; the client is regenerated from the
contract hash; the AGENTS.md line about generated types.

**How it works, step by step.** `openapi.js --check` builds the spec in memory and
compares it with the file (line endings normalized), failing with the first differing
line and the regenerate command. The contract file is an input and an implicit dependency,
so a hand edit is caught by `nx affected`. CI runs `api-check` in the lint/test/build
step. `belegscan` and `ui-storybook` became `platform:web`; the e2e projects, `tokens` and
`i18n-check` became `platform:server`: `platform` says where the code runs, and test code
using `node:fs` and `node:http` runs in Node, not in a browser — `neutral` means "runs
anywhere", like the contract JSON. `tools/check-project-tags.mjs` reads the Nx project
graph; a first folder-based version found 10 projects while Nx had 12 (`tools/tokens`,
`tools/i18n-check`, both without a platform tag). Recorded mutation: a temporary
`platform:server` library (with allowed scope and type) imported from `apps/signflow`
fails lint with exactly the platform rule.

**Proof.** api-check: green; DTO changed without regenerating → red (line 16); spec edited
by hand → red (line 11); restored → green. Tag check: red on first run (7 projects without
a platform tag in total), green after tagging; mutations (tag removed, duplicate scope)
name the project. Full run green for 12 projects; honestly reported: the first run after
`nx reset` hit a one-off vitest worker start timeout in `belegscan:test`, green alone and
on rerun.

**Alternatives considered and why rejected.** `git diff --exit-code` after regenerating
(rewrites the working copy); `lint` depending on `api-check` (lint would wait for the API
build); a permanent boundary fixture library now (fake library; wait for `api-kit`);
folder scanning for projects (missed `tools/*`).

**What can break and how to fix it.** api-check red → run `nx run signflow-api:openapi`
and commit. Tag check names a project → add the missing tag. Boundary lint error → move
shared code to a `platform:neutral` library.

**Interview question on this topic.** Q: How do you stop the frontend from importing
server code in a monorepo? A: Nx tags on three axes and `enforce-module-boundaries`
(`platform:web` → `web`/`neutral` only), a CI step that every project carries one tag per
axis (from the project graph), and a mutation proving the rule fires.

## 🇩🇪 Kurzfassung (Niveau B1)

Die CI prüft jetzt, ob die gespeicherte Datei `openapi.json` noch zu den DTOs des Servers
passt; wenn nicht, schlägt der Build fehl und nennt die erste abweichende Zeile. Jedes
Nx-Projekt hat jetzt genau einen Tag für Produkt, Schicht und Plattform. E2E-Tests laufen
in Node und benutzen `node:fs`, deshalb haben sie die Plattform `server` und nicht
`neutral`. Ein neuer CI-Schritt meldet jedes Projekt ohne vollständige Tags mit seinem
Namen. Eine Mutation hat gezeigt: Importiert das Frontend eine Server-Bibliothek, meldet
Lint einen Fehler. Einen dauerhaften Test dafür schreiben wir in Aufgabe 6.

### Fachwortschatz

| Deutsch                | English             | Русский          |
| ---------------------- | ------------------- | ---------------- |
| die Modulgrenze        | module boundary     | граница модулей  |
| das Schlagwort (Tag)   | tag                 | тег (метка)      |
| der Projektgraph       | project graph       | граф проектов    |
| veraltet               | out of date         | устаревший       |
| neu erzeugen           | regenerate          | перегенерировать |
| die Laufzeitumgebung   | runtime environment | среда выполнения |
| die Abweichung         | difference          | расхождение      |
| die Zeitüberschreitung | timeout             | тайм-аут         |
