# Состояние работы и следующие шаги

Снимок на **2026-11-22**: задачи 1–5 сделаны; следующая — задача 6 по `roadmap.md` (`libs/shared/api-kit`, сначала план). Этот файл нужен, чтобы продолжить без
старой переписки. Порядок задач задаёт [`roadmap.md`](roadmap.md); здесь — только где мы
остановились.

## 1. Что сделано последним

| Что                                                                                                                                                                                                                 | Где                                                                                                                                                             | Журнал                                                |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| ADR-0021 — формы на Signal Forms; прототип «Forms/Sign-in» в Storybook (правило показа ошибок, ошибки сервера из Problem Details, общая ошибка формы)                                                               | [`docs/adr/0021-forms-signal-forms.md`](../adr/0021-forms-signal-forms.md), `apps/ui-storybook/src/forms-prototype/`, `apps/ui-storybook-e2e/src/forms.spec.ts` | [015](../journal/015-forms-signal-forms.md)           |
| Перенос волны 3 (ADR 0023–0028, план, объяснения, термины, вопросы юристу 33–38) и сводный roadmap; сверка roadmap с волной 1 и исправления по решениям владельца                                                   | [`architecture-wave3.md`](architecture-wave3.md), [`roadmap.md`](roadmap.md), `docs/architecture/wave3-explanations.md`                                         | [016](../journal/016-architecture-wave3-roadmap.md)   |
| Kontur v4.4 в `docs/design` (Alert, экраны входа Anmelden); ключи ошибок в дизайне приведены к `errors.<code>`                                                                                                      | `docs/design/components/Alert.md`, `docs/design/screens/signflow/Anmelden.md`                                                                                   | —                                                     |
| ADR-0010: код блокировки входа `auth.throttled` (429, `Retry-After` в секундах → минуты вверх), один ключ `errors.auth.throttled` без заголовка                                                                     | [`docs/adr/0010-authentication.md`](../adr/0010-authentication.md)                                                                                              | —                                                     |
| ADR-0022 — иконки через `@lucide/angular ~1.73.0`; иконки `libs/ui` переведены на пакет; форма иконки — по Lucide, пути в макетах иллюстративные                                                                    | [`docs/adr/0022-icons-lucide-angular.md`](../adr/0022-icons-lucide-angular.md), `libs/ui/package.json` (peerDependency)                                         | [017](../journal/017-icons-lucide.md)                 |
| UI-17 — `k-alert` (InlineAlert + Banner), `KonturIntl.closeLabel`; Alert.md и контракт исправлены (`@for … track`, `closeLabel`, видимостью владеет хост)                                                           | `libs/ui/src/lib/alert/`, `apps/ui-storybook-e2e/src/alert.spec.ts`, `docs/design/components/Alert.md`                                                          | [018](../journal/018-alert.md)                        |
| Forms/Sign-in: общая ошибка — `k-alert` (повтор через `@for … track`), тексты en/ru по дизайну; ADR-0021 «Open for design» закрыт                                                                                   | `apps/ui-storybook/src/forms-prototype/sign-in.stories.ts`, `apps/ui-storybook-e2e/src/forms.spec.ts`                                                           | [019](../journal/019-sign-in-alert.md)                |
| Задача 1a: `signflow-api` на Nest 12 (ESM, `tsc` + плагин swagger, и в тестах), `GET /api/v1/health/live`, контракт `openapi.json` 3.1; теги `platform:*`; ADR-0007 «Results»; `/health/ready` перенесён в задачу 5 | `apps/signflow-api/`, `libs/signflow/api-contract/`, `docs/adr/0007-api-contract.md`, `docs/plans/roadmap.md`                                                   | [020](../journal/020-signflow-api-health-contract.md) |
| Задача 1b: Transloco в SignFlow — старт по языку браузера, `<html lang>`, адаптер `KonturIntl`; файл перевода не загрузился → приложение всё равно стартует (de или ключи) + `console.error`                        | `apps/signflow/src/app/i18n/`, `apps/signflow/public/i18n/`, `apps/signflow-e2e/src/smoke.spec.ts`                                                              | [021](../journal/021-signflow-transloco.md)           |

Потом: правила агентов перенесены в `AGENTS.md` (`CLAUDE.md` — импорт `@AGENTS.md`),
проверка длины `pnpm check:agents-md` в CI — журнал [022](../journal/022-agents-md.md).

Затем задача 1c: Orval-клиент, MSW-моки из `example`, строка статуса API — журнал
[023](../journal/023-signflow-api-client.md).

Затем гонка кэша Angular — журнал [024](../journal/024-angular-cache-race.md); задача 1d (e2e против настоящего API) — журнал [025](../journal/025-signflow-e2e-real-api.md).

Затем задача 2: `api-check` в CI, теги `platform:*` у всех проектов, правило `type:e2e`,
`pnpm check:project-tags` — журнал [026](../journal/026-api-check-boundaries.md).

Затем 3a: Problem Details на сервере — журнал [027](../journal/027-problem-details-server.md); 3b: код ошибки → перевод — журнал [028](../journal/028-error-codes-translated.md); 4a: настройки API — журнал [029](../journal/029-api-settings.md); 4b: настройки на фронте — журнал [030](../journal/030-frontend-settings.md); 5a: PostgreSQL и Prisma — журнал [031](../journal/031-postgres-prisma.md); 5b: готовность и ошибки базы — журнал [032](../journal/032-readiness-and-database-errors.md).

Последний коммит работы: `docs: allow only identifiers in urls and log readiness changes only`.

**Проверки после журнала 026 (локально):**

- `pnpm nx run-many -t lint test typecheck build build-storybook api-check` — зелёные,
  12 проектов (первый прогон после `nx reset` — разовый тайм-аут запуска воркера vitest в
  `belegscan:test`, повтор зелёный, см. журнал 026);
- `CI=true pnpm nx run-many -t e2e` (после 1d) — signflow 8 + belegscan 3 + Storybook 37
  зелёные (включая axe);
- `pnpm check:agents-md`, `check:angular-builders`, `check:project-tags` — ok;
- `pnpm nx format:check --all` — без замечаний;
- `node_modules/nx/dist/bin/nx.js` SHA-256 начинается с `2a1c0e6bcf0c3d72` (как ожидается).

## 2. Что не запушено

Владелец пушит сам. Запушено всё до `0de5f5d` (журнал 032; задача 5 принята 2026-11-23).
Не запушены: правило о URL (ADR-0008, AGENTS.md) и заметка к задаче 24.

После push: проверить CI — `gh run list --limit 3` (в PowerShell `curl` — псевдоним
`Invoke-WebRequest`, поэтому не `curl`; без `gh` — `curl.exe -s "https://api.github.com/repos/alexaadler2026/kontur/actions/runs?per_page=3"`).

## 3. Что дальше, по порядку

1. ~~UI-17 Alert~~ — сделано (журнал 018).
2. ~~Forms/Sign-in на `k-alert`, тексты по дизайну~~ — сделано (журнал 019). Ключи
   `forms.signIn.*` остаются до задачи 8. Блокировка входа в задаче 8: `k-alert` warning
   **без заголовка**, один ключ `errors.auth.throttled` (ICU, `minutes`).
3. **~~Задача 1~~ — сквозной срез, сделана (журналы 020–025); ~~задача 2~~ — `api-check` и
   границы Nx, сделана (журнал 026); ~~задача 3~~ — ошибки RFC 9457, сделана (журналы 027, 028). ~~задача 4~~ — настройки, сделана (журналы 029, 030). ~~задача 5~~ — PostgreSQL и Prisma, сделана (журналы 031, 032). Сейчас: задача 6** (сначала план).

   **~~5a — база, Prisma, тесты на базе~~ — сделано (журнал 031).** `postgres:18.7-trixie`
   (Debian, не alpine — сортировка), Prisma 7.10.1, `users` (id UUIDv7 от базы, `email`
   citext), `DATABASE_URL` без умолчания, `compose.dev.yaml` (Postgres + Mailpit),
   `test-integration` в CI, `migrate diff` пустой.

   **~~5b — готовность и ошибки базы~~ — сделано (журнал 032).** `GET /api/v1/health/ready`: база отвечает и последняя миграция
   репозитория применена → 200, иначе 503 `server.unavailable` (тексты утверждены: de
   «Der Dienst ist vorübergehend nicht verfügbar. Bitte versuchen Sie es später erneut.»,
   en «The service is temporarily unavailable. Please try again later.», ru «Сервис
   временно недоступен. Попробуйте позже.»). Ошибки Prisma: в ответе и логе нет значений
   из запроса (дубль e-mail — «секрет»). Проверку «хранилище доступно для записи»
   (ADR-0020) добавит задача файлового хранилища.
   План задачи 4 одобрен 2026-11-22. Описание — [`architecture-wave1.md`](architecture-wave1.md),
   порядок — `roadmap.md`.

   **~~4a — настройки API~~ — сделано (журнал 029).** `loadConfig()` (class-validator), только
   `PORT` (умолчание 3333), остановка запуска до Nest, lint против `process.env`,
   `.env.example` = схема, `GET /api/v1/config` → `{ version }`.

   **~~4b — фронт~~ — сделано (журнал 030).** `AppConfig` (сигнал) + `provideAppInitializer` через
   сгенерированный клиент; `/config` не ответил → приложение стартует, `AppConfig` «нет
   настроек», `console.error` (решение владельца). Тайм-аут 10 с. **Инициализаторы
   переводов и настроек — параллельно**: худший случай 10 с, а не 20; тест с фейковыми
   таймерами — оба запроса зависли → приложение отрисовалось примерно через 10 с.
   **Исправление после 4b (решение владельца, вариант C):** стартовый язык и `de.json`
   запрашиваются одновременно с одним сроком 10 с — худший случай 10 с для любого языка
   (журналы 021, 030).

   **~~3a — сервер~~ — сделано (журнал 027).** Реестр кодов, `ProblemFilter`,
   `ProblemDetailsDto` в контракте, 422 с `errors[]`, значение никогда не попадает в ответ
   и лог.

   **~~3b — фронт~~ — сделано (журнал 028).** `problemMessage()` в `libs/signflow/api-client`;
   незнакомый код: 4xx → `errors.generic.client`, 5xx → `errors.server.internal`, нет
   ответа → `errors.generic.network`; `i18n-check`: у каждого кода контракта есть
   `errors.<code>`; тест на de/en/ru. Валидация на экране — в задаче 8 (endpoint не
   придумываем). **Тексты (утверждены владельцем 2026-11-22), ключи `errors.*`:**
   - `validation.required`, `validation.email` — из Storybook-прототипа
     (`apps/ui-storybook/src/i18n`);
   - `validation.failed` (форма целиком): «Bitte überprüfen Sie Ihre Eingaben.» / «Please
     check your entries.» / «Проверьте введённые данные.»;
   - `validation.invalid` (одно поле): «Bitte überprüfen Sie diese Eingabe.» / «Please check
     this entry.» / «Проверьте, пожалуйста, это значение.»;
   - `request.malformed`: «Die Anfrage konnte nicht verarbeitet werden. Bitte laden Sie die
     Seite neu.» / «The request could not be processed. Please reload the page.» / «Запрос не
     удалось обработать. Обновите страницу.»;
   - `request.not_found`: «Der angeforderte Eintrag wurde nicht gefunden.» / «The requested
     item was not found.» / «Запрошенный объект не найден.»;
   - `server.internal` (и незнакомый 5xx): «Ein unerwarteter Fehler ist aufgetreten. Bitte
     versuchen Sie es später erneut.» / «An unexpected error occurred. Please try again
     later.» / «Произошла непредвиденная ошибка. Попробуйте позже.»;
   - `generic.client`: «Die Aktion konnte nicht ausgeführt werden. Bitte versuchen Sie es
     erneut.» / «The action could not be completed. Please try again.» / «Действие не
     удалось выполнить. Попробуйте ещё раз.»;
   - `generic.network`: «Keine Verbindung zum Server. Bitte prüfen Sie Ihre
     Internetverbindung.» / «No connection to the server. Please check your internet
     connection.» / «Нет связи с сервером. Проверьте подключение к интернету.»

   **Принятые находки (записаны в ADR-0007, «Results (task 1a)», и в журнал 020):**
   - `@nx/nest` 24.0.6 требует `@nestjs/* <12` → приложение создаётся генератором `@nx/node`,
     Nest 12 (`core`, `common`, `platform-express`, `swagger` 12) ставится вручную;
   - Prisma: тег `latest` — предрелиз `8.0.0-rc.34`; берём стабильную **`7.10.1`, версию
     закрепить**. В задачу 1 Prisma **не ставим** — целиком в задачу 5 вместе с Testcontainers;
   - `httpResource` в Angular 22 стабилен (`@publicApi 22.0`) — используем без оговорок.

   **~~1a — сервер и контракт~~ — сделано (журнал 020).** Как задумано: `apps/signflow-api` (Nest 12 на `@nx/node`),
   `GET /api/v1/health/live` → `HealthDto { status: 'ok'; version: string }`; версия — поле
   `version` из `apps/signflow-api/package.json` (`0.1.0`). Глобальный `ValidationPipe`,
   CLI-плагин `@nestjs/swagger`. Таргет `signflow-api:openapi` →
   `libs/signflow/api-contract/openapi.json` (ключи отсортированы; теги `scope:signflow`,
   `type:contract`, `platform:neutral`). Проверки: `@IsIn(['ok'])` попадает в схему как `enum`;
   документ объявляет `openapi: 3.1.0`; nullable по-новому (`type: [..., "null"]`) проверяется
   на **тестовом DTO внутри теста** — временных полей в `HealthDto` не добавлять. Тесты: unit
   контроллера (красный первым) и HTTP-уровень (`@nestjs/testing` + supertest).
   В `roadmap.md` `/health/ready` перенесён из задачи 53 в задачу 5 (в 53 — журналы JSON).

   **~~1b — Transloco в SignFlow~~ — сделано (журнал 021).** de по умолчанию, en, ru, ICU, без
   переключателя; старт по языку браузера; ошибка загрузки перевода не блокирует запуск.
   Решения владельца: Vite-плагин 020 (74 строки, с source maps) оставляем;
   `libs/shared/i18n` — когда i18n понадобится Belegscan; сохранённый выбор языка — с
   переключателем.

   **~~1c — Orval-клиент, MSW, экран~~ — сделано (журнал 023).** `libs/signflow/api-client`
   (Orval 8.48, `retrievalClient: 'both'`, MSW-моки `useExamples: true`, без faker; MSW 3.0.7),
   `generate` — зависимость lint/typecheck/test/build/serve (e2e — через build). Стартовая
   страница: `<main>`, `<h1>SignFlow</h1>`, строка статуса `role="status"`, `title: 'SignFlow'`.
   Тексты `apiStatus.*` утверждены владельцем (ru: «API: OK, версия {version}»). В
   `HealthDto` добавлен `@example "ok"`. В smoke e2e `/api/v1/health/live` подменён через
   `page.route` телом из `example` контракта — **в 1d убрать подмену**.

   **~~1d — e2e против настоящего API~~ — сделано (журнал 025). Задача 1 закрыта.** Собранный
   API — `signflow-api:serve-e2e` на **4310** (порты e2e: 4300 / 4301 / 4402 / 4310).
   Статика SignFlow на 4300 — временный `apps/signflow-e2e/static-server.mjs` (`/api` → 4310,
   файлы из `dist`, остальное → `index.html`; путь вне папки сборки → 404). `page.route`
   убран; версия в тесте — из `apps/signflow-api/package.json`.

   **~~Гонка кэша Angular (найдена в 1c)~~ — исправлено (журнал 024).** `@angular/build` 22
   (`purge-cache.js`) удалял `.angular/cache/21.2.30`, в который Storybook собирался через
   `build-angular` 21. Теперь `@angular-devkit/build-angular` закреплён на `22.2.7` в
   корневом `package.json` — одна версия, одна папка кэша. Правило — в разделе 5.

   **Решения на потом:**
   - **проверка опасных сочетаний настроек** (`REGISTRATION_MODE=sandbox` +
     `MAIL_TRANSPORT=provider` → запуск остановлен, ADR-0009) — в той из задач 27
     (`MAIL_TRANSPORT`) и 50 (`REGISTRATION_MODE`), что придёт второй (решение владельца
     2026-11-22);
   - ~~ошибки Prisma без значений в ответе и логе~~ и ~~`/health/ready`~~ — сделано в 5b
     (журнал 032); проверку «хранилище доступно для записи» в `/health/ready` добавляет
     задача файлового хранилища;
   - **в задаче 6 при переносе `problem/` в `api-kit`**: фильтр узнаёт ошибки базы по имени
     (`PrismaClient…`), без импорта сгенерированного клиента — так и оставить;
   - в задаче 22 сборка образа добавляет в ответ health поле `commit` (SHA), чтобы было видно,
     какая сборка работает на сервере (ADR-0014);
   - **в задаче 24 `Readiness` пишет в лог только смену состояния** («стал не готов:
     причина» / «снова готов»), а не каждый неудачный опрос: скрипт выката и внешний
     мониторинг опрашивают часто, и строка на каждый опрос забьёт лог (решение владельца
     2026-11-23; сейчас — строка на каждый 503, журнал 032);
   - **в задаче 22 движки Prisma (schema engine для `migrate deploy`) кладутся в образ при
     сборке**: контейнер при старте ничего не скачивает. Локально и в CI Prisma CLI
     скачивает движок при первом запуске (скрипты установки запрещены, журнал 031), а на
     сервере сети к binaries.prisma.sh может не быть, да и выкат не должен зависеть от
     чужого сервера (решение владельца 2026-11-23);
   - **в задаче 6 вместе с `libs/shared/api-kit` (первая серверная библиотека) —
     постоянный тест «импорт серверной библиотеки во фронтенд — ошибка lint»** (ESLint через
     Node API на файле-образце). В задаче 2 это доказано только записанной мутацией
     (журнал 026);
   - **в задаче 6 перенести `apps/signflow-api/src/problem/` (реестр кодов, фильтр,
     `ProblemDetailsDto`) в `libs/shared/api-kit`** (решение владельца в задаче 3, журнал 027);
   - **в задаче 22 e2e переходят на Docker-образы с Caddy, как в проде (ADR-0014):
     `apps/signflow-e2e/static-server.mjs` удалить**, цели `signflow:serve-static` и
     `signflow-api:serve-e2e` заменить запуском образов (журнал 025);
   - в задаче 22 проверить `dist/apps/signflow-api/package.json`: `generatePackageJson`
     сейчас пишет пустые `dependencies` (сервер запускается из корня репозитория, поэтому
     пока не мешает).

4. **Перед задачей 15** (документ: модель, загрузка, отпечаток, список) — сессия навыка
   **grill-with-docs** из [`mattpocock/skills`](https://github.com/mattpocock/skills)
   (`skills/engineering/grill-with-docs/SKILL.md`): агент расспрашивает владельца о модели
   документа и обновляет `docs/glossary.md` и ADR. **Перед установкой прочитать `SKILL.md`
   целиком** — это чужие инструкции для агента, как пакет из npm. Там же решить: навык
   пишет `CONTEXT.md`, а глоссарий у нас — `docs/glossary.md`.
5. Перед задачей 8 владелец обещал прислать спецификацию и макет экрана входа — они уже
   пришли в v4.4 (Anmelden). «Passwort vergessen?», Datenschutz и Impressum в задаче 8 не
   выводятся (раздел «Not active yet» в `Anmelden.md`).

## 4. Открытые вопросы

- **Отложено до UI-6 и UI-10 (решить до написания кода).** В контракте ещё есть директивы в
  camelCase: `kTooltip`, `kMenuTriggerFor`, `kCell`, `kTableToolbar`. Lint `libs/ui` требует
  kebab-case. У директив, чей вход называется так же, как селектор (`[kTooltip]="text"`),
  Angular Material и CDK пишут camelCase (`matTooltip`, `cdkMenuTriggerFor`). Правило для них
  выбираем, когда дойдём до UI-6 (DataTable: `kCell`, `kTableToolbar`) и UI-10 (DropdownMenu:
  `kMenuTriggerFor`). У Tooltip отдельной задачи в roadmap пока нет.
- Закрыты владельцем ранее:
  - селектор строки действий Alert — `k-alert-actions`, контракт поправлен (`c6dbe35`),
    правило lint не меняем;
  - ключи ошибок сервера — `errors.<code>` (ADR-0008), формулировки — по дизайну;
  - блокировка — один ключ `errors.auth.throttled` без заголовка;
  - клиентские правила делят ключ с сервером (`errors.validation.*`, ADR-0021);
  - форма иконки — по Lucide, макеты не перерисовываем.
- Входящих материалов, которые ещё не перенесены, нет: архивы волн 2 и 3 и roadmap
  перенесены и удалены из корня.

## 5. Напоминания о правилах (из CLAUDE.md и решений владельца)

- План — для всего, что трогает больше 2 файлов; ждать одобрения.
- Red first для unit-тестов; для e2e — красный прогон или записанная мутация. У чистого
  рефакторинга красного теста нет: защита — одинаковые зелёные прогоны до и после.
- e2e локально только с `CI=true`.
- Не пушить; владелец пушит сам. Каждая задача — запись в `docs/journal/`.
- Если `nx.js` пропадёт во время прогона — остановиться и сообщить; восстановление
  `pnpm install --frozen-lockfile --force`.
- Сбой воркера Vitest (`Timeout waiting for worker to respond`, журнал 026): если
  повторится в CI — отдельная задача до следующей фичи (решение владельца 2026-11-22).
  Локально повторился 2026-11-23 (`Failed to start forks worker`, `signflow:test` при
  четырёх проектах параллельно; журнал 032, лог в `tmp/logs`). В CI пока не было.
- Не обходить правило минимального возраста пакетов pnpm (`minimumReleaseAgeExclude` не
  добавлять).
- **Полный вывод каждого прогона проверок — в файл** `tmp/logs/<ГГГГ-ММ-ДД_ЧЧ-ММ>-<цель>.log`
  (`tmp/` в `.gitignore`), а в чат — только выжимка из этого файла. Необъяснимый сбой
  должен быть разбираемым, а не «осталась одна строка сводки» (журнал 031; решение
  владельца 2026-11-23).

### Обновление зависимостей

- **`@angular/build` и `@angular-devkit/build-angular` обновляются вместе, на одну версию**
  (журнал 024). Оба закреплены точно (`22.2.7`, без `~`): `build-angular` тянет
  `@angular/build` ровно своей версии, а `~` дал бы им разъехаться. Разные версии → две
  папки в `.angular/cache` → сборка Angular удаляет чужую на ходу → Storybook падает с
  `ENOENT`. Проверка: `pnpm check:angular-builders` (и шаг CI); вручную —
  `pnpm why @angular/build` → `Found 1 version`.
