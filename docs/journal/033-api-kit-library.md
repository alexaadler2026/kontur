# 033 · Task 6a: `libs/shared/api-kit` — the first server library

Date: 2026-11-23 · Task: roadmap 6, part 6a, [ADR-0007](../adr/0007-api-contract.md), [ADR-0008](../adr/0008-api-conventions-and-money.md) · PR: — · Commits: after `8772b97`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- Появилась первая серверная библиотека **`libs/shared/api-kit`** (пакет
  `@adlersoft/api-kit`). В неё переехал код ошибок RFC 9457 из `signflow-api`:
  - реестр кодов;
  - `ProblemException`;
  - глобальный фильтр;
  - превращение ошибок полей;
  - `ProblemDetailsDto`.

  Второй API (Belegscan) возьмёт его оттуда же.

- **Постоянный тест границ** `pnpm check:module-boundaries` (шаг в CI) доказывает:
  фронтенд не может импортировать серверную библиотеку, а API может.
- **План поменялся по ходу, решение владельца:** библиотека получила свою сборку и стала
  пакетом pnpm workspace.

Термины:

- **Buildable library** (собираемая библиотека) — у неё своя цель `build`, которая кладёт
  готовые `.js` и `.d.ts` в `dist`. Приложение берёт уже собранный код, а не исходники.
- **pnpm workspace** — несколько пакетов в одном репозитории. pnpm делает в
  `node_modules` ссылку на папку пакета, и импорт `@adlersoft/api-kit` работает как
  импорт любого пакета из npm.
- **`.d.ts`** — файл только с типами, без кода. Компилятор приложения проверяет по нему
  типы.
- **`rootDir`** — папка, внутри которой должны лежать все исходники одной компиляции.

**Зачем это нужно (аналогия из жизни).**

- Библиотека — это общая кухня двух ресторанов. Соусы (формат ошибок, позже деньги и
  страницы) готовят в одном месте и по одному рецепту, поэтому у SignFlow и Belegscan
  ошибки выглядят одинаково.
- Тест границ — охранник на двери кухни: официант из зала (браузер) туда не войдёт, а
  повар (API) войдёт.

**Как это работает, шаг за шагом.**

1. **Проба до переноса.** По плану библиотека не должна была иметь своей сборки: её
   исходники компилировал бы `tsc` приложения. Пробная библиотека с одной константой
   показала, что так не выйдет:
   - `TS6059: File '…/libs/shared/api-kit/src/index.ts' is not under 'rootDir'`;
   - в Nx 24 у `@nx/js:tsc` нет опции «встроить библиотеку»;
   - даже скомпилированный `node main.js` не нашёл бы `@adlersoft/api-kit`: псевдонимы
     `paths` из tsconfig знает только компилятор, Node о них не знает.

   Пробу я откатил, а выбор отдал владельцу. Он выбрал вариант A.

2. **Своя сборка.** `api-kit:build` (`@nx/js:tsc`) собирает `src/` в
   `libs/shared/api-kit/dist` с `declaration: true` и тем же плагином `@nestjs/swagger`.
   Плагин работает во время компиляции, поэтому описания DTO из комментариев попадают в
   OpenAPI, как и раньше. Проверено: `api-check` после переноса без единого отличия.
3. **Пакет.**
   - `libs/shared/api-kit/package.json`: имя `@adlersoft/api-kit`, `exports` → `dist`;
   - `pnpm-workspace.yaml`: `packages: ['libs/shared/*']`;
   - корневой `package.json`: `"@adlersoft/api-kit": "workspace:*"`;
   - после `pnpm install` есть ссылка `node_modules/@adlersoft/api-kit → libs/shared/api-kit`.

   Node, `tsc` и Vitest находят пакет обычным поиском по `node_modules`.

4. **Порядок сборки.** У `build`, `test`, `typecheck` и `test-integration` в `signflow-api`
   есть `dependsOn: ["^build"]`, то есть «сначала собери то, от чего я завишу». На чистой
   машине CI сначала соберёт `api-kit`, иначе `dist` библиотеки не будет. Это проверено
   на чистом клоне (см. ниже).
5. **Импорты.** В `signflow-api` четыре файла теперь пишут
   `import { … } from '@adlersoft/api-kit'`. HTTP-тест `problem.http.spec.ts` остался в
   приложении: он поднимает весь API.
6. **Тест границ** (`tools/check-module-boundaries.mjs`):
   - ESLint через Node API проверяет пробную строку
     `import { ProblemFilter } from '@adlersoft/api-kit'`, будто она лежит в
     `apps/signflow/src`. Ожидается ошибка `@nx/enforce-module-boundaries`;
   - та же строка в `apps/signflow-api/src` ошибки давать не должна;
   - импорт идёт **по имени пакета**, как в настоящем коде. `nx graph` показывает связь
     `signflow-api → api-kit (static)`.

**Красный первым и мутация.**

- `check:module-boundaries` был красным до появления библиотеки: «expected an
  @nx/enforce-module-boundaries error, got none». Импорт неизвестного пакета ничем не
  запрещён.
- Мутация: в `eslint.config.mjs` для `platform:web` разрешил всё (`['*']`) → тест
  красный, с тем же сообщением. Правило восстановлено, тест зелёный.
- Перенос `problem/` — рефакторинг, и красного теста у него нет. Защита — неизменный
  `api-check` и зелёные тесты (unit, интеграционные 10/10, e2e) до и после.

**Что ещё нашлось в прогоне (не из-за 6a).**

- `ui:test` упал с `Worker exited unexpectedly`. Это тот же сбой воркера Vitest, что в
  журналах 026 и 032, третий раз локально. Отдельный перезапуск дал 106/106. Записано в
  `next-steps.md`.
- e2e «Russian browser … never en» один раз прошёл только со второй попытки: `de.json`
  ещё не пришёл, а тест уже сверял список. Приложение работает как задумано (вариант C:
  стартует на ru, de догружается в фоне), а тест проверяет слишком рано. Тест я **не
  менял**: вопрос передан владельцу.

**Какие были альтернативы и почему отказались.**

- **Webpack для API** (так делает Nest CLI): сам вклеивает библиотеки. Но вывод ESM при
  Nest 12, который выходит только как ESM, требует много настройки, и пришлось бы
  заменить работающую сборку.
- **Оставить `problem/` в приложении** до второго API: нарушает решение владельца из
  задачи 3.
- **`paths` в tsconfig + `rootDir` на весь репозиторий**: собрать можно, но Node не
  понимает `paths`, и пришлось бы переписывать импорты после сборки.

**Что может сломаться и как починить.**

- `Cannot find module '@adlersoft/api-kit'` (Node) или `TS2307` → нет `dist` библиотеки.
  Запустить `pnpm nx run api-kit:build`. Цели с `^build` делают это сами.
- Изменения в `api-kit` не видны в `nx serve signflow-api` → нужна пересборка
  библиотеки; приложение использует `dist`, а не исходники.
- Предупреждение Nx «package @adlersoft/api-kit not found» → появляется, пока в diff
  есть новая строка корневого `package.json`. Тогда Nx считает затронутыми все проекты:
  ошибка в безопасную сторону, после коммита пропадает.
- Docker (задача 22): `generatePackageJson` приложения не перечисляет `api-kit`, поэтому
  Dockerfile должен сам собрать и скопировать библиотеку. Записано в `next-steps.md`.

**Вопрос с собеседования по этой теме.**

- В: Как вы делите код между двумя Node-приложениями в Nx-монорепо и как не даёте
  фронтенду импортировать серверный код?
- О: Общий серверный код лежит в собираемой библиотеке. Это пакет pnpm workspace со
  своей сборкой `tsc` (с теми же трансформерами, что у приложения) и `exports` на `dist`.
  Приложения зависят от него как от обычного пакета, а Nx через `^build` собирает его
  первым. Границы задают теги `platform:web` / `platform:server` в
  `@nx/enforce-module-boundaries`. Постоянный тест в CI линтит пробный импорт из
  фронтенда и ждёт ошибку; мутация правила делает тест красным.

## 🇬🇧 What and why (full)

**What was done.**

- The first server library, `libs/shared/api-kit` (`@adlersoft/api-kit`). The RFC 9457
  code moved into it from `signflow-api`: the code registry, `ProblemException`, the
  filter, the field-error mapping and `ProblemDetailsDto`.
- A permanent boundary test, `pnpm check:module-boundaries` (a CI step).
- The plan changed: the library is a **buildable pnpm workspace package** (owner's choice).

**Why (real-life analogy).** One kitchen serves two restaurants, so the sauces (error
format, later money and pages) follow one recipe. The boundary test is the guard at the
kitchen door: the waiter (browser) stays out, the cook (API) goes in.

**How it works, step by step.**

1. **A probe before the move** showed that the planned "no own build" fails:
   - `tsc` rejects files outside the app's `rootDir` (`TS6059`);
   - Nx 24 cannot inline libraries;
   - Node cannot resolve tsconfig `paths`.
2. **`api-kit:build`** (`@nx/js:tsc`, same `@nestjs/swagger` plugin, `declaration: true`)
   writes to `libs/shared/api-kit/dist`. `api-check` stayed identical after the move.
3. **The package:** `package.json` with `exports` → `dist`; `pnpm-workspace.yaml` lists
   `libs/shared/*`; the root depends on `workspace:*`, and pnpm links the folder into
   `node_modules`.
4. **Build order:** `signflow-api` `build`, `test`, `typecheck` and `test-integration` have
   `dependsOn: ["^build"]`. Verified on a clean clone.
5. **Imports:** four files import from `@adlersoft/api-kit`. The HTTP spec stays in the app.
6. **Boundary test:** ESLint's Node API lints a probe importing the package by name. In
   `apps/signflow` it must fail with `@nx/enforce-module-boundaries`; in `apps/signflow-api`
   it must pass. `nx graph` shows `signflow-api → api-kit (static)`.

**Red first and mutation.**

- The check was red before the library existed.
- Mutation: allowing `['*']` for `platform:web` turns it red again.
- The move itself is a refactoring: unchanged `api-check`, with green unit, integration
  and e2e suites before and after.

**Found in the run (not caused by 6a).**

- The Vitest worker crash, third time locally (`ui:test`); 106/106 on rerun.
- The e2e test "Russian browser … never en" was flaky. It checks the list of loaded files
  before the background `de.json` has arrived. The app behaves as designed; the test was
  **not changed** and is with the owner.

**Alternatives considered and why rejected.**

- Webpack bundling: heavy ESM configuration, and it replaces a working build.
- Keeping `problem/` in the app: breaks the task-3 decision.
- `paths` plus a repo-wide `rootDir`: Node still cannot resolve the aliases.

**What can break and how to fix it.**

- `Cannot find module '@adlersoft/api-kit'` / `TS2307` → run `nx run api-kit:build`.
- Library changes not visible in `serve` → rebuild the library.
- Nx warning "package not found" → only while the root `package.json` line is uncommitted.
- Docker (task 22) must build and copy `api-kit`.

**Interview question on this topic.** Q: How do you share server code between two Node
apps in an Nx monorepo, and keep it out of the frontend? A: A buildable library as a pnpm
workspace package: its own `tsc` build with the same transformers, and `exports` pointing to
`dist`. Apps depend on it like any package, and `^build` builds it first. `platform:*` tags
in `@nx/enforce-module-boundaries` forbid web → server imports. A CI check lints a
frontend probe import and expects the error; a mutation of the rule turns the check red.

## 🇩🇪 Kurzfassung (Niveau B1)

Wir haben die erste Serverbibliothek `api-kit` angelegt. Sie enthält das gemeinsame
Fehlerformat beider APIs. Zuerst wollten wir die Bibliothek ohne eigenen Build nutzen. Ein
kurzer Versuch hat gezeigt, dass der TypeScript-Compiler und Node das nicht unterstützen.
Darum baut die Bibliothek jetzt selbst und ist ein pnpm-Workspace-Paket. Nx baut sie immer
zuerst, auch auf einem sauberen CI-Rechner. Ein neuer Test in der CI prüft, dass das
Frontend keinen Servercode importieren darf. Der Vertrag (OpenAPI) hat sich durch den Umzug
nicht verändert.

### Fachwortschatz

| Deutsch                 | English            | Русский                     |
| ----------------------- | ------------------ | --------------------------- |
| die baubare Bibliothek  | buildable library  | собираемая библиотека       |
| das Workspace-Paket     | workspace package  | пакет рабочего пространства |
| die Modulgrenze         | module boundary    | граница модулей             |
| die Abhängigkeit        | dependency         | зависимость                 |
| der Umzug (Refactoring) | move (refactoring) | перенос (рефакторинг)       |
| die Typdeklaration      | type declaration   | объявление типов (`.d.ts`)  |
| der saubere Klon        | clean clone        | чистый клон                 |
| der instabile Test      | flaky test         | нестабильный тест           |
