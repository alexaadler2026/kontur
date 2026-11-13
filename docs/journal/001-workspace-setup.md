# 001 · Фундамент монорепозитория

Date: 2026-11-13 · Task: 001 (план: `docs/plans/001-workspace-setup.md`) · PR: — (push ещё не сделан) · Commits: `5239917`…(эта запись)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Создан пустой, но полностью рабочий «каркас» всего портфолио. Фич пока нет, но уже есть:

- git-репозиторий с историей из понятных коммитов;
- **Nx-монорепозиторий**: один репозиторий, в котором живут несколько приложений и библиотек;
- два приложения, **SignFlow** и **Belegscan**. Они запускаются, но показывают пустую страницу. Страницы появятся через роутинг в следующих задачах;
- библиотека компонентов **`@adlersoft/kontur-ui`** (`libs/ui`), пока пустая, но уже собирается в npm-пакет;
- **Storybook**, витрина компонентов, со страницей «Introduction»;
- проверки на каждом шаге:
  - Prettier — форматирование;
  - ESLint — правила кода и границы модулей;
  - Vitest — unit-тесты;
  - Playwright — e2e-тесты в настоящем браузере, вместе с **axe** (автоматической проверкой доступности);
- **Husky**: перед каждым коммитом проверяет формат, а также проверяет сообщение коммита;
- **CI на GitHub Actions**: после push все проверки повторяются на сервере GitHub;
- документация: две ADR (scope npm и выбор Nx/pnpm), глоссарий DE/EN/RU, этот журнал.

**Зачем это нужно (аналогия из жизни).**
Это как построить фундамент и провести коммуникации до того, как ставить стены. Вода (CI), электричество (тесты) и план этажей (границы модулей) прокладываются один раз в самом начале. Иначе потом придётся долбить стены в готовом доме.

Husky — охранник на проходной: он не пустит в историю коммит с неотформатированным кодом или сообщением вроде «fix stuff». CI — контролёр на выходе с завода: ни одна коробка не уедет клиенту, пока он её не проверил.

**Как это работает, шаг за шагом.**

1. **pnpm** ставит все пакеты по одному lock-файлу (`pnpm-lock.yaml`), поэтому у всех и в CI стоят одни и те же версии. Скрипты установки пакетов pnpm запускает только для разрешённых в `pnpm-workspace.yaml` (`allowBuilds`). Это защита от вредоносных пакетов.
2. **Nx** читает `project.json` каждого проекта и строит **граф проектов**, то есть знает, кто от кого зависит. Команда `nx affected -t test` запускает тесты только у проектов, которые затронуло изменение.
3. **Теги** (`scope:signflow`, `type:app` …) и правило ESLint `@nx/enforce-module-boundaries` превращают архитектуру в ошибку линтера. Например, если SignFlow попробует импортировать код Belegscan, `nx lint` упадёт. Мы проверили это вручную, получили ошибку и откатили изменение.
4. **Приложения** — **standalone** (без NgModule) и **zoneless**. Zoneless значит, что Angular узнаёт об изменениях от **signals** (реактивных переменных), а не через zone.js, который перехватывал все события браузера. Корневой компонент `App` содержит только `<router-outlet />`, то есть место, куда роутер вставляет страницы. Стоит **OnPush**: компонент перерисовывается только при изменении его входных данных или signals.
5. **Тесты.** Unit-тест проверяет, что оболочка не рендерит ничего, кроме router-outlet. Сначала он упал на сгенерированном `nx-welcome` («red»), потом прошёл после чистки («green»). E2E-тест открывает приложение в Chromium, проверяет `<title>` и `lang="de"` и прогоняет axe по правилам WCAG 2.1 A/AA.
6. **libs/ui** собирается **ng-packagr** в стандартный формат Angular-пакета (`dist/libs/ui`), готовый к публикации на npm.
7. **Storybook** берёт настройки сборки из маленького хост-приложения `apps/ui-storybook`, а stories ищет в `libs/ui/src`. Компоненты и их stories живут вместе, витрина живёт отдельно.
8. **Husky** ставит git-хуки при `pnpm install` (скрипт `prepare`):
   - `pre-commit` запускает `nx format:check --uncommitted`;
   - `commit-msg` запускает commitlint (правила Conventional Commits).
9. **CI** (`.github/workflows/ci.yml`):
   - checkout с полной историей → pnpm → Node из `.nvmrc` → `pnpm install --frozen-lockfile`;
   - `nx-set-shas` определяет, с каким коммитом сравнивать;
   - format → `affected` lint/test/build/build-storybook → Playwright e2e;
   - при падении Playwright-отчёт сохраняется как артефакт.

**Какие были альтернативы и почему отказались.**

- **Angular CLI с несколькими проектами.** Отказались: нет `affected`, нет правил границ модулей, нет генераторов для NestJS и Playwright.
- **Turborepo.** Отказались: хороший запускатель задач, но для Angular нет генераторов и нет правил границ.
- **Отдельные репозитории.** Отказались: общие типы и компоненты пришлось бы публиковать при каждом изменении, а версии бы расходились.
- **Jest или Vitest через AnalogJS.** Отказались: в Angular 22 есть официальный раннер `@angular/build:unit-test` на Vitest, лишний адаптер не нужен.
- **Готовый пресет `create-nx-workspace`.** Отказались: в Nx 24 он даёт либо несовместимую с Angular TS-схему, либо демо-магазин с SSR и Docker. Корень написан вручную, чтобы каждую строку можно было объяснить.
- **Scope `@kontur`.** Отказались (см. ADR-0000): его нельзя занять заранее, и имя уже используется другой UI-библиотекой.

**Что может сломаться и как починить.**

- **Ошибка `ERR_PNPM_IGNORED_BUILDS` при установке.**
  - Причина: у нового пакета есть install-скрипт, а pnpm его не разрешил.
  - Что делать: `pnpm approve-builds <пакет>`, только если пакету доверяешь. Решение запишется в `pnpm-workspace.yaml`.
- **Коммит отклонён: `husky - pre-commit script failed`.**
  - Причина: файл не отформатирован.
  - Что делать: `pnpm nx format:write`, затем `git add` и снова коммит. Учти: `format:write --uncommitted` не видит новые, ещё не добавленные в git файлы, их нужно сначала `git add`.
- **Коммит отклонён: `subject may not be empty`, `type may not be empty`.**
  - Причина: сообщение не в формате `тип: описание`.
  - Что делать: например, `feat(ui): add button`.
- **`Executable doesn't exist … chrome-headless-shell`.**
  - Причина: Playwright не скачал браузер. Локально мешает перехват HTTPS (`self-signed certificate`).
  - Что делать: мы используем `channel: 'chromium'`, ему нужен только полный Chromium (`pnpm exec playwright install chromium`).
- **`nx test ui` → `No tests found`.**
  - Причина: у пустой библиотеки нет spec-файлов, а builder Angular в этом случае падает. Поэтому target `test` у libs/ui появится в задаче 002 вместе с первым компонентом.
- **Команда Nx «висит» после успешного завершения (Windows).**
  - Причина: дочерний http-server от `serve-static` держит открытый вывод.
  - Что делать: подождать или остановить процесс. На результат проверок это не влияет. Если глючит daemon: `pnpm nx daemon --stop` или `NX_DAEMON=false`.

**Вопрос с собеседования по этой теме.**

- В: Как в монорепозитории не дать одной команде случайно зависеть от кода другой команды?
- О: Через теги проектов в Nx и правило ESLint `@nx/enforce-module-boundaries`. У каждого проекта есть тег области (`scope:signflow`, `scope:shared`) и тег слоя (`type:app`, `type:ui`, `type:util`). Правила описывают, кто от кого может зависеть: продукт — только от себя и от shared, слой — только от слоёв ниже. Нарушение становится ошибкой линтера в CI, а не замечанием на code review. Архитектура проверяется машиной при каждом push.

## 🇬🇧 What and why (full)

**What was done.**
An empty but fully working foundation for the whole portfolio:

- a git repository whose history tells a story;
- an **Nx monorepo** with two Angular 22 application shells (SignFlow, Belegscan);
- a publishable, still empty component library `@adlersoft/kontur-ui`;
- a Storybook host with an Introduction page;
- quality gates at every level:
  - Prettier for formatting;
  - ESLint with module boundaries;
  - Vitest for unit tests;
  - Playwright + axe for e2e and accessibility;
- Husky + commitlint on every commit;
- a GitHub Actions pipeline;
- ADR-0000 (npm scope), ADR-0001 (Nx + pnpm + test runners), a DE/EN/RU glossary and this journal.

**Why (real-life analogy).**
It is like pouring the foundation and laying the pipes and cables before building walls. Water (CI), electricity (tests) and the floor plan (module boundaries) are cheapest to install at the start; retrofitting them means breaking open finished walls.

Husky is the guard at the gate who stops badly formatted code and messages like "fix stuff". CI is the inspector at the factory exit: nothing ships before it has been checked.

**How it works, step by step.**

1. **pnpm installs from one lockfile.** Everyone and CI get identical versions. Dependency install scripts run only if allow-listed in `pnpm-workspace.yaml` (`allowBuilds`), which is a supply-chain safeguard.
2. **Nx builds a project graph** from each `project.json`. `nx affected -t test` runs only the projects touched by a change.
3. **Tags enforce the architecture.** Tags (`scope:*`, `type:*`) plus `@nx/enforce-module-boundaries` turn architecture rules into lint errors. This was verified by a temporary cross-scope import that failed lint and was then reverted.
4. **The apps are standalone and zoneless.** Change detection is driven by signals, not zone.js. The root `App` component is OnPush and renders only `<router-outlet />`.
5. **Tests were written test-first.** The unit test asserts the shell renders only the router outlet; it failed against the generated `nx-welcome` and passed after the cleanup. The Playwright smoke test checks the title and `lang="de"`, then runs axe with the WCAG 2.1 A/AA tags.
6. **`libs/ui` is packaged by ng-packagr** into the Angular Package Format (`dist/libs/ui`).
7. **Storybook compiles through a host app.** It uses the build configuration of `apps/ui-storybook` and loads stories from `libs/ui/src`.
8. **Husky installs the git hooks via `prepare`.** `pre-commit` runs `nx format:check --uncommitted`; `commit-msg` runs commitlint (Conventional Commits).
9. **CI runs the same checks on GitHub.** Steps: checkout with full history → pnpm → Node from `.nvmrc` → frozen install → `nx-set-shas` → format → affected lint/test/build/build-storybook → Playwright e2e. If e2e fails, the Playwright report is uploaded as an artifact.

**Alternatives considered and why rejected.**

- **Angular CLI multi-project workspace.** It has no affected detection and no boundary rules.
- **Turborepo.** It has no Angular generators and no boundary rules.
- **Separate repositories.** Shared code would need a release for every change, and versions would drift.
- **Jest or Vitest via AnalogJS.** Angular 22 ships an official Vitest-based runner, so no adapter is needed.
- **The `create-nx-workspace` presets as-is.** In Nx 24 they produce either a TS project-references setup that Angular does not support or a demo shop with SSR and Docker. The root was hand-curated so every line can be explained.
- **The `@kontur` scope.** It cannot be reserved in advance, and the name is already used by a UI library (ADR-0000).

**What can break and how to fix it.**

- **`ERR_PNPM_IGNORED_BUILDS`.** A new dependency has an install script. Run `pnpm approve-builds <pkg>`, and only if you trust the package.
- **The pre-commit hook fails.** Run `pnpm nx format:write`. New untracked files need `git add` first, because `--uncommitted` does not see them.
- **The commit-msg hook fails.** Use the `type(scope): subject` format.
- **The Playwright `chrome-headless-shell` is missing.** We use `channel: 'chromium'`, which needs only the full Chromium download.
- **`No tests found` for `libs/ui`.** This is why the `test` target is added together with the first component (task 002).
- **An Nx command keeps running after success on Windows.** A `serve-static` child keeps the output open. If the Nx daemon misbehaves, run `pnpm nx daemon --stop`.

**Interview question on this topic.**

- **Q:** How do you stop teams in a monorepo from depending on each other's code by accident?
- **A:** With Nx project tags and the `@nx/enforce-module-boundaries` lint rule. Every project gets a scope tag and a layer tag. The rules say that a product may depend only on itself and `shared`, and a layer only on the layers below it. A violation fails lint in CI, so the architecture is enforced by a machine instead of by review comments.

## 🇩🇪 Kurzfassung (Niveau B1)

In dieser Aufgabe haben wir das Fundament für das ganze Portfolio gebaut. Es gibt jetzt ein Nx-Monorepo mit zwei leeren Angular-Anwendungen, SignFlow und Belegscan, und eine leere Komponentenbibliothek `@adlersoft/kontur-ui`. Storybook zeigt eine Einführungsseite. Jede Änderung wird automatisch geprüft: Formatierung, Linting, Unit-Tests, Build und End-to-End-Tests mit einer Barrierefreiheitsprüfung (axe). Husky prüft vor jedem Commit das Format und die Commit-Nachricht. Die gleiche Prüfung läuft in GitHub Actions. Mit Tags und einer ESLint-Regel kann SignFlow keinen Code von Belegscan importieren. Die wichtigste Entscheidung war Nx mit pnpm: Nx prüft nur die betroffenen Projekte und macht die Architektur zu einer Lint-Regel.

### Fachwortschatz

| Deutsch                              | English                      | Русский                       |
| ------------------------------------ | ---------------------------- | ----------------------------- |
| das Monorepo                         | monorepo                     | монорепозиторий               |
| der Arbeitsbereich (Workspace)       | workspace                    | рабочее пространство          |
| die kontinuierliche Integration (CI) | continuous integration       | непрерывная интеграция        |
| die Abhängigkeit                     | dependency                   | зависимость                   |
| die Sperrdatei (Lockfile)            | lockfile                     | lock-файл                     |
| die Modulgrenze                      | module boundary              | граница модуля                |
| der Projektgraph                     | project graph                | граф проектов                 |
| betroffen (affected)                 | affected                     | затронутый                    |
| der Git-Hook                         | git hook                     | git-хук                       |
| die Commit-Nachricht                 | commit message               | сообщение коммита             |
| der Komponententest (Unit-Test)      | unit test                    | модульный тест                |
| der End-to-End-Test                  | end-to-end test              | сквозной (e2e) тест           |
| die Barrierefreiheit                 | accessibility                | доступность                   |
| die Architekturentscheidung (ADR)    | architecture decision record | запись архитектурного решения |
| veröffentlichen                      | to publish                   | опубликовать                  |
