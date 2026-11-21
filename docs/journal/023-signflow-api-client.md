# 023 · Task 1c: generated API client (Orval), MSW mocks from examples, the API status line

Date: 2026-11-21 · Task: roadmap 1 (end-to-end slice), part 1c, [ADR-0007](../adr/0007-api-contract.md) · PR: — · Commits: see `git log` after `e361804`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
На стартовой странице SignFlow — `<main>`, заголовок `<h1>SignFlow</h1>` и строка
«API: OK, Version 0.1.0». Данные идут по всей цепочке: `signflow-api` →
`openapi.json` → **сгенерированный** Angular-клиент → экран. У строки три состояния со
своими текстами на de/en/ru: проверка, OK, недоступен.

Термины:

- **Orval** — генератор: читает `openapi.json` и пишет TypeScript-код клиента и моков.
- **`httpResource`** — способ Angular загрузить данные по HTTP прямо в сигналы:
  `value()`, `hasValue()`, `error()`, `isLoading()`.
- **MSW (Mock Service Worker)** — подменяет ответы сервера на уровне сети. Компонент в
  тесте делает настоящий HTTP-запрос, MSW отвечает вместо сервера.
- **Хендлер (handler)** — правило MSW: «на `GET */api/v1/health/live` ответь вот этим».
- **`example`** — пример значения поля в контракте OpenAPI.

**Зачем это нужно (аналогия из жизни).**
Контракт — это чертёж розетки, клиент — вилка, отлитая автоматом по этому чертежу.
Руками вилку не делают: если чертёж изменится, автомат отольёт новую, и она
гарантированно подойдёт. Моки — это тестовый стенд с розеткой, собранной по тому же
чертежу.

**Шаг 0: проверка до кода (детерминированные моки).**
ADR-0007 требует, чтобы моки брали значения из `example`, а не случайные данные.

- В Orval 8.48 опция называется **`useExamples: true`** (у генератора `msw`).
- Первая генерация показала: `version` взят из примера (`"0.1.0"`), а у `status` примера
  не было — Orval подставил `faker.helpers.arrayElement(['ok'])` и импорт
  `@faker-js/faker`. Решение — точнее контракт: в `HealthDto` добавлен JSDoc
  `@example "ok"` → в `openapi.json` появился `"example": "ok"` → мок стал
  `{status: "ok", version: "0.1.0"}` без faker.
- **Защита на будущее:** `@faker-js/faker` в проекте не установлен. Если у поля не будет
  примера, сгенерированный мок снова импортирует faker — и сборка упадёт с
  `Cannot find module '@faker-js/faker'`. **Мутация:** убрали `@example "ok"` → Nx сам
  перегенерировал клиент (кэш зависит от `openapi.json`) → тесты SignFlow красные с этой
  ошибкой. Вернули — зелёные.
- MSW: Orval требует `msw >=2`, установлена **3.0.7**. В MSW 3 опция «падать на запросе
  без хендлера» называется `onUnhandledFrame: 'error'` (была `onUnhandledRequest`).
- `msw/node` перехватывает запросы `HttpClient` в тестовом раннере Angular — проверено
  тестами.

**Как это работает, шаг за шагом.**

1. **`libs/signflow/api-client`** (теги `scope:signflow`, `type:data-access`,
   `platform:web`). `orval.config.ts`: `client: 'angular'`, режим
   `retrievalClient: 'both'` — чтение через `getHealthLiveResource()` (httpResource),
   запись через сервисы `HttpClient`; моки `{ type: 'msw', useExamples: true }`.
2. Цель **`generate`** пишет `src/generated/` (в `.gitignore`). Кэш Nx зависит от
   `openapi.json` и `orval.config.ts`. От `generate` зависят все цели, которые читают
   клиент: `lint` и `typecheck` библиотеки; `lint`, `test`, `build`, `serve` у `signflow`
   (`^generate`); `e2e` — через `serve-static` → `build`.
3. Две точки входа: `@adlersoft/signflow-api-client` (клиент и модели) и
   `@adlersoft/signflow-api-client/mocks` (MSW-хендлеры). Так MSW никогда не попадёт в
   сборку приложения.
4. Границы модулей: `type:data-access` теперь может зависеть от `type:contract`.
5. **`ApiStatus`**: `@if (health.hasValue())` → «API: OK, Version …», `@else if
(health.error())` → «API nicht erreichbar», иначе → «API wird geprüft …».
   `<p role="status">` — скринридер вежливо зачитает смену «проверка → OK».
6. **`Home`** на маршруте `''`: `<main>`, `<h1>SignFlow</h1>`, `<sf-api-status />`.
   У маршрута `title: 'SignFlow'` — заголовок вкладки (WCAG 2.4.2), как в `index.html`.
7. **Dev-прокси** `apps/signflow/proxy.conf.json`: `/api` → `http://localhost:3333`.

**Тесты (красные первыми) и мутации.**

- `api-status.spec.ts` (Angular Testing Library + `msw/node`): сеть теста — файлы
  переводов и хендлеры, **сгенерированные Orval**; приложение настроено как настоящее
  (`provideHttpClient()`, `provideI18n()`). OK → «API: OK, Version 0.1.0» в
  `role="status"`; ответа нет (`delay('infinite')`) → «API wird geprüft …»; 500 →
  «API nicht erreichbar»; браузер `ru-RU` → «API: OK, версия 0.1.0». Красный первым: нет
  компонента.
- `app.routes.spec.ts`: на `/` есть `main`, `h1` «SignFlow», `status`; заголовок
  страницы «SignFlow». Красный первым: `Unable to find … role "main"`, `expected ''`.
- e2e: до 1d `GET /api/v1/health/live` подменяется через `page.route` — тело собрано из
  `example` полей `HealthDto` **прямо в `openapi.json`** (файл читается как данные;
  `signflow-e2e` объявляет контракт в `implicitDependencies`, чтобы `nx affected`
  запускал e2e при изменении контракта). **Красный прогон без подмены:** «Expected:
  API: OK, Version 0.1.0 · Received: API nicht erreichbar» — заодно видно, что
  состояние ошибки работает в настоящем браузере. С подменой 6/6, axe проходит.
- `signflow-api`: тест схемы дополнен `example: 'ok'` у `status` — требование изменилось
  (у поля появился пример для моков), изменение в том же коммите, что и DTO.

**Проверка «с нуля».** Удалили `src/generated/` и прогнали
`run-many -t lint test typecheck build` с **`--skip-nx-cache`**: `generate` выполнился
первым, всё зелёное. Важная деталь: одного `nx reset` мало — в Nx 24 кэш лежит в
домашней папке (`~/.nx/…`), и без `--skip-nx-cache` 26 из 28 задач пришли из кэша, то
есть ничего не проверили.

**Найдено по пути (не из-за 1c, исправление — отдельной задачей).** При свежем
параллельном прогоне `ui-storybook:build-storybook` иногда падает с `ENOENT …
.angular/cache/21.2.30/babel-webpack`. Причина в исходниках `@angular/build` 22
(`purge-cache.js`): каждая сборка Angular 22 удаляет из `.angular/cache` все папки,
кроме своей версии. Storybook собирается старым `build-angular` 21 и пишет как раз в
`21.2.30` — параллельная сборка SignFlow удаляет его кэш на ходу. Отдельно Storybook
собирается без ошибок.

**Какие были альтернативы и почему отказались.**

- Коммитить сгенерированный клиент: дифф PR раздувается кодом, который никто не читает;
  ADR-0007 — генерировать из закоммиченного контракта.
- faker-моки: случайные данные делают тесты нестабильными (ADR-0007).
- Подмена в e2e с захардкоженным `{status:'ok', version:'0.1.0'}`: разошлась бы с
  контрактом при первом изменении; поэтому тело берётся из `example`.
- Отдельная feature-библиотека для экрана: экран из одной строки; структура
  feature/data-access/ui появится с первым настоящим экраном.

**Что может сломаться и как починить.**

- Симптом: `Cannot find module '@faker-js/faker'` → у поля в DTO нет `@example`;
  добавить пример, а не faker.
- Симптом: `Cannot find module '@adlersoft/signflow-api-client'` в IDE → нет
  `src/generated/`; `pnpm nx run signflow-api-client:generate`.
- Симптом: на `nx serve signflow` строка «API nicht erreichbar» → не запущен API;
  `pnpm nx run-many -t serve -p signflow signflow-api`.
- Симптом: тест падает с ошибкой MSW о необработанном запросе → компонент делает новый
  запрос; добавить хендлер (лучше сгенерированный).

**Вопрос с собеседования по этой теме.**

- В: Как у вас фронтенд и бэкенд не расходятся по API?
- О: Контракт `openapi.json` генерируется из DTO сервера и коммитится; Angular-клиент и
  MSW-моки генерируются из него Orval'ом при каждой сборке (Nx кэширует по хешу
  контракта). Изменили поле на сервере — клиент изменился сам, и TypeScript покажет все
  места на фронте, которые сломались. Моки берут `example` из контракта, поэтому тесты
  детерминированы; если примера нет, сборка падает — мы это проверили мутацией.

## 🇬🇧 What and why (full)

**What was done.** The SignFlow start page shows `<main>`, `<h1>SignFlow</h1>` and the line
"API: OK, Version 0.1.0", fetched through the whole chain: signflow-api → openapi.json →
generated Angular client → screen. Three states with de/en/ru texts: checking, OK,
unreachable.

**Why (real-life analogy).** The contract is the socket drawing, the client is the plug
cast automatically from it, the mocks are a test bench built from the same drawing.

**Step 0: deterministic mocks.** Orval 8.48 calls the option `useExamples: true`. The first
run used `example` for `version` but faker for `status`, which had no example; adding
`@example "ok"` to the DTO made the mock `{status: "ok", version: "0.1.0"}` without faker.
`@faker-js/faker` is not installed, so a field without an example breaks the build —
proven by mutation (removing the example → `Cannot find module '@faker-js/faker'`). MSW
3.0.7 (Orval needs `>=2`); MSW 3 renamed the strict option to `onUnhandledFrame: 'error'`.

**How it works.** `libs/signflow/api-client` with `orval.config.ts` (`client: 'angular'`,
`retrievalClient: 'both'`, MSW mocks from examples). The `generate` target writes the
git-ignored `src/generated/`, cached by the contract's hash; every target that reads the
client depends on it (library lint/typecheck; signflow lint/test/build/serve via
`^generate`; e2e through `serve-static` → `build`). Two entry points keep MSW out of the
app bundle. `type:data-access` may now depend on `type:contract`. `ApiStatus` renders the
three states in a `role="status"` paragraph; `Home` on route `''` with `title: 'SignFlow'`
(WCAG 2.4.2). A dev proxy sends `/api` to `localhost:3333`.

**Tests (red first) and mutations.** Component tests with `msw/node` and the generated
handlers (OK, pending, 500, Russian); a route test (main, h1, status, page title). E2E
stubs `/api/v1/health/live` with the `example` values read from the committed contract
(declared as an implicit dependency); a red run without the stub showed the error state in
a real browser. The signflow-api schema test now expects `example: 'ok'` — the requirement
changed in the same commit.

**From scratch.** With `src/generated/` deleted and `--skip-nx-cache`, lint, test,
typecheck and build pass; `generate` runs first. `nx reset` alone is not enough: Nx 24
keeps its cache under `~/.nx`, and without `--skip-nx-cache` 26 of 28 tasks were replayed.

**Found on the way (not caused by 1c; separate fix).** In a fresh parallel run
`ui-storybook:build-storybook` can fail with `ENOENT … .angular/cache/21.2.30`: every
Angular 22 build purges all other version folders of `.angular/cache`
(`purge-cache.js`), and Storybook still builds with `build-angular` 21 into that folder.

**Alternatives considered and why rejected.** Committing generated code (noise; ADR-0007);
faker mocks (non-deterministic); a hard-coded e2e stub (drifts from the contract); a
feature library for a one-line screen (comes with the first real screen).

**What can break and how to fix it.** `@faker-js/faker` missing → add `@example` to the
DTO. Client module not found in the IDE → run `generate`. "API unreachable" on
`nx serve` → start the API too. MSW unhandled request → add a (generated) handler.

**Interview question on this topic.** Q: How do frontend and backend stay in sync? A: The
spec is generated from server DTOs and committed; the Angular client and MSW mocks are
generated from it on every build, cached by its hash. A server change regenerates the
client, and TypeScript shows every broken use. Mocks take the spec's examples, so tests
are deterministic, and a missing example fails the build — proven by mutation.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Startseite von SignFlow zeigt jetzt den Status der API mit ihrer Version. Der
Angular-Client wird von Orval aus der Datei `openapi.json` erzeugt und nicht von Hand
geschrieben. Auch die Mocks für die Tests entstehen aus derselben Datei; sie benutzen die
Beispielwerte aus dem Vertrag, keine Zufallsdaten. Fehlt ein Beispiel, bricht der Build ab –
das haben wir mit einer Mutation geprüft. Die Komponente zeigt drei Zustände: Prüfung, OK
und nicht erreichbar, in drei Sprachen. Alle Prüfungen laufen auch ohne erzeugten Code
und ohne Cache grün. Nebenbei haben wir einen Fehler im Build von Storybook gefunden, den
wir in einer eigenen Aufgabe beheben.

### Fachwortschatz

| Deutsch                      | English          | Русский                 |
| ---------------------------- | ---------------- | ----------------------- |
| der Codegenerator            | code generator   | генератор кода          |
| der erzeugte Client          | generated client | сгенерированный клиент  |
| der Beispielwert             | example value    | пример значения         |
| die Attrappe (der Mock)      | mock             | заглушка (мок)          |
| deterministisch              | deterministic    | детерминированный       |
| der Zwischenspeicher (Cache) | cache            | кэш                     |
| die Statusmeldung            | status message   | сообщение о статусе     |
| die Wettlaufsituation        | race condition   | гонка (состояние гонки) |
