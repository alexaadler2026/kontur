# 031 · Task 5a: PostgreSQL, Prisma and tests on a real database

Date: 2026-11-22 · Task: roadmap 5, part 5a, [ADR-0014](../adr/0014-production-deployment.md), [ADR-0009](../adr/0009-environments-and-configuration.md), [ADR-0008](../adr/0008-api-conventions-and-money.md) · PR: — · Commits: after `500a439`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- У `signflow-api` появилась база **PostgreSQL 18** и **Prisma 7.10.1**. Первая миграция
  создаёт таблицу `users`: `id`, `email`, `created_at`, `updated_at`.
- **`compose.dev.yaml`**: Postgres и Mailpit для разработки, одной командой.
- **Интеграционные тесты** (цель `test-integration`, в CI обязательна). Каждый файл
  поднимает чистую базу в Docker, применяет все миграции и проверяет:
  - id — UUIDv7, его создаёт база;
  - e-mail уникален без учёта регистра;
  - немецкие и русские слова сортируются правильно;
  - схема совпадает с миграциями.
- Новая обязательная настройка **`DATABASE_URL`**, без умолчания: в ней пароль.

Термины:

- **ORM (Prisma)** — библиотека, через которую код работает с базой объектами
  TypeScript, а не строками SQL. `prisma.user.create(...)` вместо `INSERT INTO users`.
- **Миграция** — файл SQL, который меняет структуру базы на один шаг. Все миграции по
  порядку дают текущую схему. Они лежат в репозитории, как код.
- **`schema.prisma`** — описание таблиц для Prisma. Из него генерируется
  типизированный клиент, и по нему Prisma пишет новые миграции.
- **Docker-образ / контейнер** — готовая упаковка программы (здесь Postgres) и её
  запущенный экземпляр.
- **Testcontainers** — библиотека, которая из теста запускает контейнер (настоящий
  Postgres), даёт его адрес и удаляет контейнер после теста.
- **Collation (правило сравнения строк)** — по нему база решает, что «Äpfel» стоит рядом
  с «apfel», а не после «Zebra».
- **`citext`** — расширение PostgreSQL: тип текста, который сравнивается без учёта
  регистра.

**Зачем это нужно (аналогия из жизни).**
Тест на моке — это примерка костюма на манекене. Интеграционный тест — примерка на
живом человеке. Только живой человек покажет, что рукав на самом деле короткий.
Testcontainers каждый раз приводит **нового** человека: чистую базу, на которую
накатываются все миграции, как при первом выкате на сервер.

**Как это работает, шаг за шагом.**

1. **Образ `postgres:18.7-trixie`** (решение владельца) записан в одну константу
   `src/database/postgres-image.ts`.
   - **Не alpine.** В alpine библиотека musl без настоящих локалей, и строки
     сортируются по байтам: «Zebra» оказывается раньше «apfel», а «Ёж» — раньше «Еда».
     В Debian работают локали glibc. Тест сортировки это доказывает: мутация «образ
     alpine» его ломает.
   - **18** — потому что в нём есть встроенная функция `uuidv7()`. ADR-0008 требует,
     чтобы id создавала база.
   - Тег точный, с названием дистрибутива (`trixie`): образ не сменится сам. Unit-тест
     проверяет, что `compose.dev.yaml` использует тот же тег.
2. **Prisma 7** устроена иначе, чем 6:
   - генератор `prisma-client` пишет обычный TypeScript (ESM) в
     `src/generated/prisma`. Код **не коммитится**: его создаёт цель `prisma-generate`, от
     неё зависят `build`, `typecheck` и `test-integration`;
   - в Prisma 7 нет движка запросов на Rust. Запросы идут через драйвер `pg`
     (`@prisma/adapter-pg`);
   - `prisma.config.ts` нужен только CLI. Сам API получает `DATABASE_URL` через
     `loadConfig()`.
3. **Скрипты установки запрещены** (`allowBuilds: false` для `prisma`, `@prisma/engines`,
   `ssh2`, `cpu-features`, `protobufjs`). Скрипт установки исполняет чужой код на
   машине при `pnpm install`. Я проверил, что без него всё работает: CLI сам скачивает
   движок схемы при первом запуске. `ssh2` и `cpu-features` (необязательное ускорение
   SSH у Testcontainers) не нужны: Docker доступен локально.
4. **Таблица `users`.** `id` — UUID со значением по умолчанию `uuidv7()`. `email` имеет
   тип `CITEXT` с уникальным индексом. Даты — `TIMESTAMPTZ(3)`, время с часовым поясом.
5. **E-mail без учёта регистра — почему `citext`, а не перевод в нижний регистр.**
   Владелец поставил условия: `migrate diff` остаётся чистым и есть тест «Anna@…, затем
   anna@… → конфликт». Сравнение вариантов:
   - уникальный индекс по `lower(email)`: Prisma не умеет описывать индексы по
     выражению. `migrate diff` всегда видел бы «лишний» индекс, то есть условие владельца
     нарушено;
   - переводить в нижний регистр в коде: правило держится, только пока весь код через
     это место проходит. Ручной SQL или будущий импорт его обойдут, а база не защитит;
   - **`citext`**: правило держит **база**, для любого запроса. Prisma понимает тип
     (`@db.Citext`), и `diff` чистый. E-mail хранится как введён, `Jonas.Weber@…`, а ищется
     в любом регистре.
   - Цена: расширение `citext` Prisma не создаёт, его `CREATE EXTENSION` дописан в
     миграцию руками (с комментарием).
6. **Настройки.**
   - `DATABASE_URL` обязательна, умолчания нет, она должна начинаться с `postgresql://`.
     В сообщении об ошибке значения нет: тест с паролем `Geheim-Pass`.
   - `AppModule.forRoot(config)` кладёт настройки под DI-токен `APP_CONFIG`.
   - HTTP-тесты и генератор контракта передают `offlineConfig()` с адресом в никуда:
     порт 1 на своей машине. Prisma подключается **только при первом запросе**, а эти
     тесты запросов не делают. Поэтому `nx test` по-прежнему работает без Docker.
7. **`test-integration`** (`*.int-spec.ts`, свой `vitest.integration.config.mts`):
   - `startTestDatabase()` поднимает контейнер и запускает `prisma migrate deploy`, ту же
     команду, что на сервере (ADR-0014). Это и есть «все миграции применяются к пустой
     базе в CI»;
   - `schema.int-spec.ts`: Prisma проигрывает миграции во второй пустой базе (shadow) и
     сравнивает результат со `schema.prisma`. Схему поменяли без миграции → красный, с
     подсказкой, какой SQL не хватает.
8. **`compose.dev.yaml`**: порты только на `127.0.0.1`, пароль локальный и безобидный,
   такой же, как в `.env.example`. `nx serve` подставляет этот адрес только для
   dev-цели.

**Тесты: красный первым и мутации.**

- Интеграционный тест красный первым: клиента Prisma нет («Cannot find module
  '../generated/prisma/client.js'»). Тесты настроек красные первыми: 6 из 15.
- Итог: integration 5/5, unit `signflow-api` 36/36.
- Мутации, каждая красная:
  1. образ `18.7-alpine` → тест сортировки;
  2. в миграции `TEXT` вместо `CITEXT` → тест регистра, поиск и `migrate diff`;
  3. поле в схеме без миграции → `migrate diff` (и запросы клиента, который ждёт новую
     колонку).
- **Изменённые тесты** (требование изменилось: появилась обязательная настройка):
  - в тестах `loadConfig` к входным данным добавлен `DATABASE_URL`;
  - в четырёх HTTP-тестах `imports: [AppModule]` заменён на
    `AppModule.forRoot(offlineConfig())`.

  Проверки в тестах не менялись.

**Один нераскрытый сбой — записываю честно.** В первом полном прогоне упал один из 5
интеграционных тестов. Потом было ещё четыре прогона, в том числе та же
последовательность и параллельно с unit-тестами, и все 5/5. Какой тест упал, неизвестно:
сохранилась только сводка. Возможная причина — тайм-аут под нагрузкой (diff-тест сам
идёт ~14 с из 30). Без причины я ничего не меняю. Правило то же, что для сбоя воркера
Vitest: повторится в CI — отдельная задача до следующей фичи, с полным логом.

**Какие были альтернативы и почему отказались.**

- TypeORM или Drizzle: Prisma указана в стеке репозитория (AGENTS.md, ADR-0007).
- Общая тестовая база для всех тестов: тесты видели бы строки друг друга и зависели бы
  от порядка. Одна база на файл чище.
- Запускать интеграционные тесты в цели `test`: тогда `nx test` требовал бы Docker на
  любой машине.
- Коммитить сгенерированный клиент: тысячи строк, которые меняются при обновлении
  Prisma. Его воспроизводит одна команда.

**Что может сломаться и как починить.**

- Симптом: `test-integration` падает сразу с ошибкой подключения к Docker → Docker
  Desktop не запущен.
- Симптом: красный «schema.prisma and prisma/migrations differ» → создать миграцию:
  `pnpm nx run signflow-api:prisma-migrate-dev --name=<что>` (нужен
  `docker compose -f compose.dev.yaml up -d`).
- Симптом: API не стартует, `DATABASE_URL must be a postgresql:// URL` → задать
  переменную.
- Симптом: `Cannot find module '../generated/prisma/client.js'` → не запущен
  `prisma-generate`. `nx build` и `nx typecheck` запускают его сами.

**Вопрос с собеседования по этой теме.**

- В: Как вы тестируете код, который работает с базой данных?
- О: Логику без базы — unit-тестами. Работу с базой — интеграционными тестами на
  настоящем PostgreSQL в Docker через Testcontainers, той же версии, что в production.
  Каждый файл получает чистую базу, на неё накатываются все миграции той же командой,
  что при деплое. Так CI проверяет и сами миграции. Отдельный тест сравнивает миграции
  со схемой ORM, и изменение схемы без миграции не пройдёт. Правила вроде «e-mail
  уникален без учёта регистра» держит база (`citext`), а не только код, и тест это
  доказывает.

## 🇬🇧 What and why (full)

**What was done.** `signflow-api` has PostgreSQL 18 and Prisma 7.10.1. The first
migration creates `users` (`id`, `email`, `created_at`, `updated_at`). `compose.dev.yaml`
runs Postgres and Mailpit for development. Integration tests (`test-integration`,
required in CI) give every file a fresh database in Docker with all migrations applied;
they prove UUIDv7 ids, case-insensitive unique e-mail, correct German/Russian sorting
and schema = migrations. A new required setting, `DATABASE_URL`, has no default.

**Why (real-life analogy).** A mock is a suit on a mannequin; an integration test is a
fitting on a real person. Testcontainers brings a new person each time: an empty
database with every migration applied, as on the first deployment.

**How it works, step by step.**

1. **`postgres:18.7-trixie`** (owner's decision), one constant in
   `src/database/postgres-image.ts`.
   - Not alpine: musl has no real locales, so alpine sorts by bytes. The sorting test
     fails there (mutation).
   - 18 for the built-in `uuidv7()` (ADR-0008).
   - The exact tag includes the distribution, so the image cannot change by itself. A
     unit test keeps `compose.dev.yaml` on the same tag.
2. **Prisma 7.**
   - The `prisma-client` generator writes ESM TypeScript to `src/generated/prisma`. It is
     not committed; the `prisma-generate` target creates it before
     build/typecheck/integration.
   - No Rust query engine: queries go through the `pg` driver adapter.
   - `prisma.config.ts` serves the CLI only; the API gets `DATABASE_URL` from
     `loadConfig()`.
3. **No install scripts.** `allowBuilds: false` for prisma, `@prisma/engines` and
   Testcontainers' optional SSH natives. Without them everything works: the CLI fetches
   its schema engine on first use.
4. **`users`**: UUID id defaulting to `uuidv7()`, `email CITEXT` with a unique index,
   `TIMESTAMPTZ(3)` dates.
5. **Why `citext`.**
   - A `lower(email)` index cannot be described in Prisma, so `migrate diff` would never
     be clean.
   - Lower-casing in code is bypassed by raw SQL and imports.
   - `citext` lets the database enforce the rule for every query; Prisma knows the type,
     and the diff stays clean. The e-mail is stored as typed. The extension is created by
     hand in the migration, because Prisma does not manage extensions.
6. **Settings.** `DATABASE_URL` is required, has no default, must start with
   `postgresql://` and is never printed. `AppModule.forRoot(config)` puts the settings
   under `APP_CONFIG`. HTTP unit tests and the contract generator use `offlineConfig()`.
   Prisma connects on the first query only, so `nx test` still needs no Docker.
7. **`test-integration`**: `startTestDatabase()` runs `prisma migrate deploy`, the
   production command (ADR-0014). `schema.int-spec.ts` replays the migrations in an empty
   shadow database and requires an empty `prisma migrate diff`.
8. **`compose.dev.yaml`**: ports on `127.0.0.1` only, a harmless local password (the same
   as `.env.example`). `nx serve` uses it for the dev target only.

**Red first and mutations.**

- Red first: the integration test (no Prisma client yet) and the config tests (6/15).
- Result: integration 5/5, unit 36/36.
- Mutations, each red:
  - alpine image → the sorting test;
  - `TEXT` instead of `CITEXT` → case tests and diff;
  - a schema field without a migration → diff.
- Changed tests (requirement changed, a new required setting): the `loadConfig` inputs
  gained `DATABASE_URL`, and four HTTP tests now import
  `AppModule.forRoot(offlineConfig())`. No assertion changed.

**Alternatives considered and why rejected.**

- TypeORM or Drizzle: Prisma is the repo's stack.
- One shared test database: order-dependent tests.
- Integration tests inside `test`: Docker everywhere.
- A committed generated client: thousands of churning lines.

**What can break and how to fix it.**

- Docker connection error → start Docker Desktop.
- "schema.prisma and prisma/migrations differ" → `nx run
signflow-api:prisma-migrate-dev --name=<what>`.
- The API stops on `DATABASE_URL` → set it.
- Missing generated client → run `prisma-generate` (build and typecheck do it).

**Interview question on this topic.** Q: How do you test database code? A: Integration
tests on a real PostgreSQL of the production version in Docker (Testcontainers). Each
file gets a fresh database migrated with the deployment command, so CI tests the
migrations too. A test compares migrations with the ORM schema. Rules such as a
case-insensitive unique e-mail are enforced by the database (`citext`) and proven by a
test.

## 🇩🇪 Kurzfassung (Niveau B1)

Die API hat jetzt eine Datenbank: PostgreSQL 18 mit Prisma 7. Die erste Migration
erstellt die Tabelle `users`. Für die Entwicklung startet `compose.dev.yaml` PostgreSQL
und Mailpit. Integrationstests starten für jede Testdatei eine neue, leere Datenbank in
Docker und spielen alle Migrationen ein. Sie prüfen: Die Datenbank erzeugt die ID als
UUIDv7, eine E-Mail-Adresse ist ohne Rücksicht auf Groß- und Kleinschreibung eindeutig,
deutsche und russische Wörter werden richtig sortiert, und Schema und Migrationen passen
zusammen. Wir nutzen das Debian-Image und nicht Alpine, weil Alpine Texte nur nach Bytes
sortiert. Die Einstellung `DATABASE_URL` ist Pflicht und hat keinen Standardwert, denn
sie enthält ein Passwort.

### Fachwortschatz

| Deutsch                     | English              | Русский             |
| --------------------------- | -------------------- | ------------------- |
| die Datenbank               | database             | база данных         |
| die Migration               | migration            | миграция            |
| der Integrationstest        | integration test     | интеграционный тест |
| das Image / der Container   | image / container    | образ / контейнер   |
| die Sortierreihenfolge      | collation            | порядок сортировки  |
| Groß- und Kleinschreibung   | upper and lower case | регистр букв        |
| eindeutig                   | unique               | уникальный          |
| das Schema                  | schema               | схема               |
| die Verbindungszeichenfolge | connection string    | строка подключения  |
