# План задачи 001: фундамент монорепозитория

## Контекст (зачем)
Сейчас в папке лежат только `CLAUDE.md`, `docs/design/` (снапшот Kontur) и `docs/journal/TEMPLATE.md`.
Нет ни git, ни кода. Задача 001 создаёт «пустой, но работающий» скелет. В нём должно быть:
- 2 приложения, которые запускаются;
- библиотека UI;
- Storybook;
- CI, который проверяет каждое изменение;
- документация решений (ADR).

Фич в этой задаче нет. Цель: дальше каждая задача — это маленький PR поверх зелёного CI.

**Проверенные версии** (на 2026-11-13 через `npm view`): Nx 24.0.6, Angular 22.2.6
(Nx 24 поддерживает Angular < 23), Storybook 10.6.7 (поддерживает Angular < 23),
Playwright 1.65.0, pnpm 12.18.0, Node 24.11.0 (установлен).
pnpm и `gh` на машине **не установлены**. `gh` не нужен, потому что push не делаем.

**Твои решения:** npm-scope `@adlersoft` (пакет `@adlersoft/kontur-ui`); `setup-env.ps1` добавляем в `.gitignore`.

---

## Шаги

### Шаг 0. Подготовка (вне репозитория)
- `npm install -g pnpm@12.18.0`. pnpm ставится в `%APPDATA%\npm`, этот путь уже есть в PATH, права админа не нужны.
  **pnpm** — менеджер пакетов, как npm, но быстрее. Он хранит каждую версию пакета на диске один раз и строго не даёт использовать незаявленные зависимости.
- Проверка: `pnpm -v` должна вывести `12.18.0`.

### Шаг 1. git init + исходные файлы (коммит 1)
- `git init -b main` (ветка по умолчанию у тебя в git не задана, поэтому задаём явно).
- `.gitattributes`: `* text=auto eol=lf` и `*.png`/`*.woff2` как binary.
  Зачем: на Windows git иначе превращает переводы строк в CRLF, и Prettier в CI (Linux) будет падать на каждом файле.
- `.gitignore`: `node_modules`, `dist`, `.nx/cache`, `.nx/workspace-data`, `coverage`, `.env*`, `setup-env.ps1`, `test-results`, `playwright-report`, `storybook-static`.
- Коммит: `chore: initialize repository with project rules and Kontur design snapshot`
  (`CLAUDE.md`, `docs/design/**`, `docs/journal/TEMPLATE.md`).

### Шаг 2. Структура docs и ADR (коммит 2)
- `docs/adr/README.md`: что такое ADR, оглавление, шаблон MADR.
  **ADR** (Architecture Decision Record) — короткий документ «что решили, почему, какие были альтернативы».
- `docs/adr/0000-npm-scope-adlersoft.md`, в формате MADR, как ты просил:
  - Решение: scope `@adlersoft`; пакеты `@adlersoft/kontur-ui`, `@adlersoft/receipt-parser`, `@adlersoft/shared-api-types`.
  - Критерий выбора: scope гарантированно мой, авторство видно сразу.
  - Альтернативы:
    - `@kontur`: нельзя проверить заранее, плюс «Kontur» уже используется как имя UI-библиотеки (`@skbkontur/react-ui`);
    - `@adler`, `@adlerdev`: заняты другими пользователями npm.
  - Последствие: пути импорта во всём репо будут `@adlersoft/...`, а сменить их потом дорого.
- `docs/plans/001-workspace-setup.md`: копия этого плана.
- `docs/glossary.md`: таблица терминов с колонками **DE | EN | RU** и короткой поясняющей колонкой. Доменные термины (Umlauf, Beleg, TSE, …) беру только из `docs/design`, ничего не придумываю.
- `docs/journal/README.md`: пустое оглавление журнала.
- Коммит: `docs: add ADR process, ADR-0000 npm scope, plans, glossary and journal index`.

### Шаг 3. Nx-воркспейс на pnpm (коммит 3)
`create-nx-workspace` не умеет создавать воркспейс в непустой папке. Поэтому:
1. Генерирую его во временную подпапку внутри проекта:
   `pnpm dlx create-nx-workspace@24.0.6 .tmp-ws --preset=apps --pm=pnpm --nxCloud=skip --interactive=false`.
   Используем пустой пресет `apps`: Nx без приложений, приложения добавим сами.
   Подпапку внутри проекта беру потому, что путь к scratchpad содержит кириллицу («Александр»), и часть инструментов на таком пути может сломаться.
2. Переношу содержимое на уровень выше, без `node_modules` и `.git`. Удаляю `.tmp-ws`.
3. В `package.json` записываю `"packageManager": "pnpm@12.18.0"`, затем делаю `pnpm install`.
4. `pnpm add -D @nx/angular@24.0.6 @nx/storybook@24.0.6 @nx/playwright@24.0.6`. Версии Angular подтянутся как 22.2.6.
- `docs/adr/0001-nx-monorepo-with-pnpm.md`. Здесь фиксируются решения:
  - почему монорепо на Nx (а не Angular CLI multi-project или Turborepo);
  - почему pnpm;
  - тест-раннеры (Vitest для unit-тестов, Playwright для e2e);
  - Nx Cloud пока отключён.
- **Слияние, а не затирание.** `.gitignore` генератора объединяю с нашим из шага 1. `README.md` генератора не переношу, наш будет в шаге 9. Остальные конфликтующие файлы сливаю вручную.
- **Версия Node зафиксирована.** `.nvmrc` содержит `24`, в `package.json` добавляю `"engines": { "node": ">=24 <25" }`.
- **Strict.** Проверяю, что в `tsconfig.base.json` стоит `strict: true`, а в `angularCompilerOptions` — `strictTemplates: true`.
- Коммит: `chore: scaffold Nx 24 workspace with pnpm (ADR-0001)`.

### Шаг 3b. Husky + commitlint (отдельный коммит)
- `pnpm add -D husky @commitlint/cli @commitlint/config-conventional`, затем `pnpm exec husky init`. Скрипт `"prepare": "husky"` хуки ставит сам.
- `.husky/pre-commit`: `pnpm nx format:check --uncommitted`. Проверяет форматирование только изменённых файлов.
- `.husky/commit-msg`: `pnpm exec commitlint --edit "$1"`.
- `commitlint.config.mjs`: `extends: ['@commitlint/config-conventional']`.
- **Husky** — инструмент, который запускает скрипты на событиях git, например перед коммитом. **commitlint** проверяет, что сообщение коммита в формате `feat: …`.
- Коммит: `chore: add husky hooks with format check and commitlint`.

### Шаг 4. Приложения signflow и belegscan (коммит 4)
Для каждого приложения:
`nx g @nx/angular:application apps/<name> --style=css --routing --unitTestRunner=vitest --e2eTestRunner=playwright --bundler=esbuild --tags=scope:<name>,type:app`.
Точные значения флагов сверю с `--help` генератора перед запуском. Если чего-то нет, скажу тебе, а не буду подбирать молча.

- **Стили на CSS, а не SCSS.** Kontur — это чистые CSS custom properties, препроцессор не нужен.
- **Zoneless.** В Angular 22 это поведение по умолчанию: изменения отслеживают signals, а не zone.js.
- **Чистка сгенерированного.** Удаляю `NxWelcome` и демо-компоненты. В корне остаётся `App`: standalone, OnPush, внутри только `<router-outlet />`, маршруты пустые.
- **`index.html`:** `lang="de"`, `<title>SignFlow</title>` / `<title>Belegscan</title>`. Это имена продуктов, их не переводят. Видимого текста нет, поэтому правило i18n не нарушаем. Настоящий i18n — отдельная задача со своей ADR.
- **Тесты (сначала тест, потом код):**
  - unit: «приложение создаётся и содержит router-outlet»;
  - e2e smoke в `apps/<name>-e2e`: страница открывается, title правильный, **axe** без нарушений (`@axe-core/playwright`). **axe** — автоматическая проверка доступности.
- Коммит: `feat: add signflow and belegscan application shells`.

### Шаг 5. libs/ui (коммит 5)
- `nx g @nx/angular:library libs/ui --publishable --importPath=@adlersoft/kontur-ui --unitTestRunner=vitest --tags=scope:shared,type:ui`.
  `--publishable` означает сборку через ng-packagr в формат, готовый для npm.
- Удаляю демо-компонент. `index.ts` пока пустой (`export {};`) с комментарием «components come in task 002+».
  В Vitest включаю `passWithNoTests`, иначе пустая библиотека валит CI. Первым содержимым станут токены в задаче 002.
- Коммит: `feat(ui): add publishable @adlersoft/kontur-ui library skeleton`.

### Шаг 6. apps/ui-storybook (коммит 6)
- Это отдельный «хост»-проект для Storybook: `nx g @nx/angular:application apps/ui-storybook ...` + `nx g @nx/storybook:configuration ui-storybook --uiFramework=@storybook/angular`.
- Stories будут искаться в `libs/ui/src/**/*.stories.ts`. Так компоненты живут в библиотеке, а витрина отдельно, как указано в CLAUDE.md.
- Пока внутри одна MDX-страница «Introduction» на английском: это документация для разработчиков, а язык репозитория английский. На ней — что такое Kontur и ссылка на `docs/design`. Без единой страницы Storybook не собирается.
- Теги: `scope:shared,type:app`.
- Коммит: `feat(ui-storybook): add Storybook host for libs/ui`.

### Шаг 7. Границы модулей (входит в коммит 6 или отдельный `chore`)
Правило `@nx/enforce-module-boundaries` в `eslint.config.mjs`:
- `type:app` → может зависеть от `type:ui` и `type:util`; от другого app нельзя;
- `type:ui` → только `type:ui` и `type:util`;
- `scope:signflow` → `scope:signflow` и `scope:shared`, то же для belegscan;
- `scope:shared` → только `scope:shared`.

Зачем: линтер не даст SignFlow случайно импортировать код Belegscan.

### Шаг 8. CI на GitHub Actions (коммит 7)
`.github/workflows/ci.yml`, запускается на `push` в main и на `pull_request`:
1. `actions/checkout` с `fetch-depth: 0`. Полная история нужна, чтобы Nx вычислил affected.
2. `pnpm/action-setup` (версию берёт из `packageManager`) и `actions/setup-node` (`node-version-file: .nvmrc`, кэш pnpm).
3. `pnpm install --frozen-lockfile`. Если lock-файл не совпадает с `package.json`, сборка падает.
4. `nrwl/nx-set-shas`: определяет, с каким коммитом сравнивать.
5. `pnpm nx format:check`.
6. `pnpm nx affected -t lint test build`.
7. `pnpm exec playwright install --with-deps chromium` и `pnpm nx affected -t e2e`.

Версии actions закрепляю мажором (`@v4` и т. п.), точные проверю перед записью.
**Affected** — Nx запускает проверки только для проектов, затронутых изменением.
- Коммит: `ci: add GitHub Actions pipeline (format, lint, test, build, e2e)`.

### Шаг 9. README и журнал (коммит 8)
- `README.md` в корне: что за проект, структура, команды запуска (`pnpm nx serve signflow` и т. д.), ссылки на ADR.
- `docs/journal/001-workspace-setup.md` по шаблону: RU полностью, EN полностью, DE кратко с Fachwortschatz. Добавляю строку в `docs/journal/README.md`.
- Коммит: `docs(journal): add entry 001 workspace setup`.

**Push не делаю.** Создать репозиторий на GitHub и сделать push — твой шаг, после него CI запустится по-настоящему.

---

## Про ограничение «≤ 400 строк»
Сгенерированный Nx-код и `pnpm-lock.yaml` это ограничение превысят. Это неизбежно для задачи-скелета.
Компенсирую так:
- разбиваю работу на 9 осмысленных коммитов, каждый можно прочитать отдельно;
- рукописного кода (конфиги, тесты, ADR) будет мало;
- в журнале объясню каждый сгенерированный файл, который тебе нужно понимать.

## Проверка (что запустишь руками)
| Команда | Ожидаемый результат |
| --- | --- |
| `pnpm -v` | `12.18.0` |
| `pnpm nx show projects` | `belegscan, belegscan-e2e, signflow, signflow-e2e, ui, ui-storybook` (порядок может отличаться) |
| `pnpm nx run-many -t lint test build` | все задачи `Successfully ran` |
| `pnpm nx run-many -t e2e` | smoke-тесты обоих приложений `passed`, включая axe |
| `pnpm nx serve signflow` → http://localhost:4200 | пустая страница без ошибок в консоли, вкладка «SignFlow» |
| `pnpm nx storybook ui-storybook` → http://localhost:4400 | открывается страница «Introduction» |
| `grep -n '"strict"' tsconfig.base.json` и `grep -rn strictTemplates apps/*/tsconfig.json libs/ui/tsconfig.json` | `"strict": true`; `"strictTemplates": true` в каждом проекте |
| `git commit --allow-empty -m "bad message"` | commitlint отклоняет коммит (`subject may not be empty` / `type may not be empty`) |
| `node -v` и `cat .nvmrc` | `v24.x` / `24` |
| `pnpm nx format:check` | без вывода, код выхода 0 |
| `git log --oneline` | 9 коммитов в формате conventional commits |
| Проверка границ: временно импортировать что-то из belegscan в signflow, запустить `pnpm nx lint signflow` | ошибка `@nx/enforce-module-boundaries`; затем откатываю |

CI на GitHub проверить можно только после твоего push. Локально запускаю те же команды.

## Вне задачи 001 (будет дальше)
- токены из `tokens.json` → CSS в libs/ui (002), включая кириллические сабсеты шрифтов с `unicode-range`;
- i18n: ADR с выбором подхода для runtime-переключения de/en/ru (Angular i18n vs Transloco vs ngx-translate), ICU-плюрализация для русского;
- `libs/receipt-parser` и `libs/shared/api-types`;
- бэкенды NestJS;
- PWA для Belegscan;
- шрифты.
