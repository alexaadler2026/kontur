# 020 · Task 1a: signflow-api on Nest 12, health endpoint, committed OpenAPI 3.1 contract

Date: 2026-11-21 · Task: roadmap 1 (end-to-end slice), part 1a · PR: — · Commits: see `git log` after `b264ed4`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Появился первый сервер — `apps/signflow-api`. Он отвечает на один запрос:
`GET /api/v1/health/live` → `{"status":"ok","version":"0.1.0"}`. Версия берётся из
`apps/signflow-api/package.json`. Из кода сервера генерируется **контракт** —
файл `libs/signflow/api-contract/openapi.json` (формат OpenAPI 3.1). Он лежит в
репозитории, и любое изменение API видно в pull request как изменение этого файла.

Термины:

- **NestJS** — фреймворк для сервера на TypeScript; устроен похоже на Angular: модули,
  контроллеры, DI.
- **DI (внедрение зависимостей)** — класс не создаёт то, что ему нужно, а получает это
  готовым от фреймворка. Здесь контроллер получает строку версии по токену `APP_VERSION`.
- **Контроллер** — класс, методы которого отвечают на HTTP-запросы (`@Get('live')`).
- **DTO (Data Transfer Object)** — класс, описывающий форму данных запроса или ответа
  (`HealthDto`).
- **OpenAPI** — стандартное описание HTTP API в JSON: какие адреса есть, что они принимают
  и что возвращают. По нему в задаче 1c сгенерируется Angular-клиент.
- **ESM** — современный формат модулей JavaScript (`import`/`export`). Nest 12 выпускается
  **только** в ESM.
- **ValidationPipe** — встроенный в Nest «фильтр на входе»: проверяет тело запроса по
  декораторам class-validator и отклоняет лишние поля.

**Зачем это нужно (аналогия из жизни).**
`openapi.json` — это договор между кухней (сервер) и залом (фронтенд). Повар не пишет
договор вручную: его составляет автомат по тому, что реально готовит кухня. Договор
подшит в папку (репозиторий), поэтому любое изменение меню видно при проверке. Health
— это как ответ «я на месте» по рации: по нему мониторинг и скрипт выката понимают, что
сервер жив.

**Как это работает, шаг за шагом.**

1. `HealthDto` описывает ответ: `status` (только `'ok'`, плюс `@IsIn(['ok'])`) и
   `version` (строка, в JSDoc пример `@example "0.1.0"`).
2. `HealthController.live()` возвращает `{ status: 'ok', version }`. Версию в него
   внедряет `AppModule`: провайдер `APP_VERSION` вызывает `readAppVersion()`, а она
   читает `package.json`, лежащий на папку выше `src/`. Эта раскладка одинакова и в
   исходниках, и в `dist/` (там `package.json` пишет `generatePackageJson`).
3. `configureApp()` — общая настройка: префикс `/api/v1` (ADR-0008) и глобальный
   `ValidationPipe`. Её вызывают три места: сервер (`main.ts`), скрипт контракта
   (`openapi.ts`) и HTTP-тесты. Поэтому все три видят одни и те же адреса.
4. **Плагин компилятора `@nestjs/swagger`** во время сборки читает типы полей,
   декораторы class-validator и JSDoc и дописывает в классы описание схемы. Без него
   у `HealthDto` в документе не было бы свойств.
5. `nx run signflow-api:openapi` собирает приложение (`tsc` с этим плагином),
   запускает `dist/.../openapi.js`. Скрипт создаёт приложение **без открытия порта**,
   строит документ (`setOpenAPIVersion('3.1.0')`), сортирует ключи (`sortKeys`), чтобы
   файл менялся только при изменении API, и пишет `openapi.json`.
6. `openapi.json` добавлен в `.prettierignore`: это сгенерированный файл, как
   `tokens.css`. Иначе Prettier переформатировал бы его, и будущий `api:check`
   (задача 2) сравнивал бы с другим текстом.

**Главная трудность: Nest 12 + сборка + тесты.**

- `@nx/nest` 24.0.6 требует Nest ниже 12, поэтому приложение создано генератором
  `@nx/node`, а Nest 12 поставлен вручную. Лишнее от генератора (сборка esbuild, `tsx`,
  inferred-плагины vitest) убрано: цели в `project.json` записаны явно, как у `tools/*`.
- Nest нужны `emitDecoratorMetadata` (запись типов параметров для DI и валидации) и
  плагин swagger. Быстрые транспиляторы (esbuild, oxc у Vite) не умеют ни того, ни
  другого. Поэтому сборка — обычный `tsc` (`@nx/js:tsc`, `module: nodenext`).
- В тестах та же проблема: Vitest по умолчанию транспилирует быстро и без плагина.
  Решение — маленький Vite-плагин `apps/signflow-api/vite-plugin-tsc.mts`: он
  компилирует каждый файл настоящим TypeScript и **тем же** плагином swagger. Опции
  плагина читаются из `project.json`, то есть записаны в одном месте. Итог: тесты
  выполняют тот же JavaScript, что и сборка.
- В `beforeAll` поднимается целое Nest-приложение; при холодном старте трёх файлов
  параллельно это дольше 10 секунд, поэтому `hookTimeout: 30_000` (с комментарием).

**Тесты (красные первыми).**

- `health.controller.spec.ts` — unit: `new HealthController('1.2.3').live()` →
  `{ status: 'ok', version: '1.2.3' }`. Первый прогон: красный
  (`Cannot find module './health.controller.js'`), потом зелёный.
- `health.http.spec.ts` — HTTP-уровень через `@nestjs/testing` + supertest: 200, JSON,
  версия вида `x.y.z`; без префикса `/health/live` → 404. Красный первым (нет
  `AppModule`).
- `openapi-document.spec.ts` — документ: `openapi: 3.1.0`; `operationId: getHealthLive`;
  схема `HealthDto` (`enum: ["ok"]`, `example`, `required`). Отдельный **тестовый DTO
  внутри теста** (`NullableProbeDto`) проверяет nullable: библиотека пишет
  `type: ["string","null"]` и нигде не пишет `nullable`. В `HealthDto` временных полей нет.
- **Мутации** (записаны, чтобы доказать, что тест схемы ловит ошибку):
  `status: string` + `@IsIn` → зелёный (enum даёт `@IsIn`); `status: 'ok'` без
  `@IsIn` → зелёный (enum даёт литеральный тип); ни того, ни другого → **красный**.
  Значит, enum в схеме действительно вычисляет плагин, а тест это проверяет.

**Границы модулей (ADR-0007).** Добавлено третье измерение тегов `platform:*`:
`platform:web` зависит только от web и neutral, `platform:server` — только от server и
neutral, `type:contract` не зависит ни от чего. Теги: `signflow-api` —
`platform:server`, `signflow-api-contract` — `platform:neutral`, `signflow` и `libs/ui`
— `platform:web`. Правила заработают по-настоящему в 1c, когда появится
`api-client`, который импортирует контракт.

**Какие были альтернативы и почему отказались.**

- `@nx/nest`: не поддерживает Nest 12.
- Сборка esbuild (вариант генератора): нет `emitDecoratorMetadata` и плагина swagger.
- Тесты через `unplugin-swc`: SWC даёт метаданные декораторов, но не запускает
  TypeScript-плагин; пришлось бы генерировать отдельный `metadata.ts`
  (`PluginMetadataGenerator` из `@nestjs/cli`) — ещё один сгенерированный файл и ещё
  один инструмент.
- Явные `@ApiProperty` на каждом поле вместо плагина: дублирование — `@IsIn(['ok'])` и
  `@ApiProperty({ enum: ['ok'] })` могут разойтись. ADR-0007 выбирает «один класс —
  валидация, тип и схема».
- Версионирование Nest (`enableVersioning`) вместо префикса: ADR-0008 фиксирует простой
  префикс `/api/v1`; префикс проще объяснить.

**Что может сломаться и как починить.**

- Симптом: в `openapi.json` у DTO нет свойств → Причина: файл назван не `*.dto.ts`
  (плагин смотрит только `.dto.ts`, `.entity.ts`, `.controller.ts`) → Переименовать.
- Симптом: `summary` пустой → Причина: обычный `//`-комментарий стоит ближе к методу, чем
  JSDoc → Переносить служебные комментарии внутрь метода.
- Симптом: `Hook timed out` в тестах → медленный холодный старт; посмотреть, не
  выросло ли число файлов с полным приложением.
- Симптом: `format:check` ругается на `openapi.json` → файл убрали из
  `.prettierignore`; вернуть.
- Симптом: в `dist/apps/signflow-api/package.json` пустые `dependencies` — сейчас не
  мешает (сервер запускается из корня репозитория); для Docker-образа в задаче 22
  проверить отдельно.

**Вопрос с собеседования по этой теме.**

- В: Почему ваш NestJS собирается `tsc`, а не esbuild/SWC, раз они быстрее?
- О: Nest берёт типы параметров конструктора из `emitDecoratorMetadata`, а схему
  OpenAPI нам пишет плагин компилятора `@nestjs/swagger`, которому нужен type checker
  TypeScript. esbuild не умеет первое, ни esbuild, ни SWC не запускают TypeScript-плагины.
  Для API из нескольких файлов скорость сборки не важна, а одинаковая компиляция в сборке
  и в тестах важна: тесты проверяют тот же код, что уходит на сервер.

## 🇬🇧 What and why (full)

**What was done.** The first backend, `apps/signflow-api` (NestJS 12), answers
`GET /api/v1/health/live` with `{"status":"ok","version":"0.1.0"}`; the version comes from
the app's `package.json`. `nx run signflow-api:openapi` generates the contract
`libs/signflow/api-contract/openapi.json` (OpenAPI 3.1.0, sorted keys), which is committed
so every API change is a reviewable diff (ADR-0007).

**Why (real-life analogy).** The spec is the contract between kitchen and dining room,
written automatically from what the kitchen actually cooks and filed in the repository.
The health endpoint is the "I'm here" on the radio that monitoring and the deploy script
listen for.

**How it works, step by step.**

1. `HealthDto` — `status: 'ok'` with `@IsIn(['ok'])`, `version: string` with a JSDoc
   `@example`.
2. `HealthController.live()` returns status and the version injected via the
   `APP_VERSION` token; `readAppVersion()` reads the `package.json` one folder above
   `src/` — the same layout in sources and in `dist/` (`generatePackageJson`).
3. `configureApp()` sets the `/api/v1` prefix (ADR-0008) and a global `ValidationPipe`
   (`whitelist`, `forbidNonWhitelisted`, `transform`); the server, the OpenAPI script and
   the HTTP tests all use it.
4. The `@nestjs/swagger` compiler plugin turns types, class-validator decorators and JSDoc
   into schema metadata at compile time.
5. The `openapi` target builds with `tsc` + plugin, then runs `openapi.js`, which creates
   the app without listening, builds the document, sorts keys and writes the file. The
   file is in `.prettierignore` (generated, like `tokens.css`).

**Nest 12 specifics.** Nest 12 is ESM-only. `@nx/nest` 24.0.6 requires Nest <12, so the
app was generated with `@nx/node` and Nest installed by hand; the generator's esbuild
build, `tsx` and inferred Vitest plugins were removed in favour of explicit targets.
Nest needs `emitDecoratorMetadata` and the swagger plugin, so the build is plain `tsc`
(`@nx/js:tsc`, `module: nodenext`). Tests use a small Vite plugin
(`vite-plugin-tsc.mts`) that compiles every file with the TypeScript compiler and the same
plugin options (read from `project.json`), so tests run exactly what the build emits.
`hookTimeout` is 30 s because `beforeAll` boots a full Nest app on a cold, parallel start.

**Tests (red first).** Unit test of the controller (red: module missing → green); HTTP
test with `@nestjs/testing` + supertest (200 JSON, semver version, 404 without the
prefix); document test (`3.1.0`, `operationId`, `HealthDto` schema with `enum`, `example`,
`required`) plus nullability on a test-only `NullableProbeDto`: written as
`type: ["string","null"]`, never `nullable`. Recorded mutations: `status: string` with
`@IsIn` → green; literal `'ok'` without `@IsIn` → green; neither → red. So the schema test
really depends on the plugin.

**Module boundaries.** New tag dimension `platform:*` (web → web/neutral, server →
server/neutral) and `type:contract` → nothing. Tags: `signflow-api` server, the contract
neutral, `signflow` and `libs/ui` web. The rules start to bite in 1c with the API client.

**Alternatives considered and why rejected.** `@nx/nest` (no Nest 12 support); esbuild
build (no decorator metadata, no TS plugins); `unplugin-swc` + a generated `metadata.ts`
(one more generated file and tool); explicit `@ApiProperty` everywhere (duplicates
validation, can drift); Nest URI versioning (ADR-0008 chose a plain prefix).

**What can break and how to fix it.** DTO without properties in the spec → file not named
`*.dto.ts`. Empty `summary` → a `//` comment sits between JSDoc and method. Hook timeout →
cold start got slower. `format:check` complains about `openapi.json` → it left
`.prettierignore`. Empty `dependencies` in the generated `dist` package.json → revisit for
the Docker image in task 22.

**Interview question on this topic.** Q: Why is your NestJS app compiled with `tsc` and
not esbuild/SWC? A: Nest relies on `emitDecoratorMetadata`, and our OpenAPI schema is
written by the `@nestjs/swagger` compiler plugin, which needs the TypeScript type checker.
esbuild cannot emit decorator metadata, and neither esbuild nor SWC run TypeScript plugins.
For a small API build speed does not matter; compiling tests and build the same way does.

## 🇩🇪 Kurzfassung (Niveau B1)

Wir haben den ersten Server gebaut: `signflow-api` mit NestJS 12. Er beantwortet die
Anfrage `GET /api/v1/health/live` mit dem Status `ok` und der Version aus der Datei
`package.json`. Aus dem Code entsteht automatisch die Schnittstellenbeschreibung
`openapi.json` im Format OpenAPI 3.1. Diese Datei liegt im Repository, deshalb sieht man
jede Änderung der API im Pull Request. NestJS 12 gibt es nur noch als ES-Module, und das
Nx-Plugin für Nest unterstützt diese Version noch nicht. Darum haben wir die Anwendung mit
`@nx/node` erzeugt und Nest von Hand installiert. Gebaut wird mit dem normalen
TypeScript-Compiler, weil Nest Decorator-Metadaten und das Swagger-Plugin braucht. Die
Tests kompilieren den Code auf dieselbe Weise. Drei Tests sind zuerst rot gelaufen und
dann grün geworden; Mutationen beweisen, dass der Schema-Test wirklich prüft.

### Fachwortschatz

| Deutsch                                      | English                    | Русский                    |
| -------------------------------------------- | -------------------------- | -------------------------- |
| die Schnittstelle (API)                      | interface (API)            | интерфейс (API)            |
| der Vertrag / die Schnittstellenbeschreibung | contract / API description | контракт / описание API    |
| der Endpunkt                                 | endpoint                   | конечная точка (адрес API) |
| die Abhängigkeitsinjektion                   | dependency injection       | внедрение зависимостей     |
| der Compiler                                 | compiler                   | компилятор                 |
| die Metadaten                                | metadata                   | метаданные                 |
| die Lebendigkeitsprüfung (Liveness)          | liveness check             | проверка «процесс жив»     |
| die Eingabeprüfung (Validierung)             | input validation           | проверка входных данных    |
| erzeugen / generieren                        | to generate                | генерировать               |
| die Modulgrenze                              | module boundary            | граница модулей            |
