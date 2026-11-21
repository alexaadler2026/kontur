# Состояние работы и следующие шаги

Снимок на **2026-11-21**: задачи 1a, 1b, AGENTS.md и 1c сделаны, следующая — 1d. Этот файл нужен, чтобы продолжить без
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

Затем гонка кэша Angular — журнал [024](../journal/024-angular-cache-race.md).

Последний коммит работы: `fix(deps): align @angular-devkit/build-angular with @angular/build 22`.

**Проверки после журнала 023 (локально, без `src/generated/` и с `--skip-nx-cache`):**

- `pnpm nx run-many -t lint test typecheck build` — зелёные, 11 проектов (`generate`
  выполняется первым; `signflow`: 18 тестов, `signflow-api`: 7); `build-storybook` — отдельно
  зелёный (параллельно — гонка кэша, см. раздел 3);
- `CI=true pnpm nx run-many -t e2e` — signflow 6 + belegscan 3 + Storybook 37 зелёные (включая axe);
- `pnpm nx format:check --all` — без замечаний;
- `node_modules/nx/dist/bin/nx.js` SHA-256 начинается с `2a1c0e6bcf0c3d72` (как ожидается).

## 2. Что не запушено

Владелец пушит сам. Запушено (по его слову от 2026-11-21) всё до `3cfcdb9` (журнал 021).
Не запушены: коммиты задачи AGENTS.md (журнал 022) и задачи 1c (журнал 023, с `74308a4`) и гонки кэша (журнал 024).

После push: проверить CI — `gh run list --limit 3` (в PowerShell `curl` — псевдоним
`Invoke-WebRequest`, поэтому не `curl`; без `gh` — `curl.exe -s "https://api.github.com/repos/alexaadler2026/kontur/actions/runs?per_page=3"`).

## 3. Что дальше, по порядку

1. ~~UI-17 Alert~~ — сделано (журнал 018).
2. ~~Forms/Sign-in на `k-alert`, тексты по дизайну~~ — сделано (журнал 019). Ключи
   `forms.signIn.*` остаются до задачи 8. Блокировка входа в задаче 8: `k-alert` warning
   **без заголовка**, один ключ `errors.auth.throttled` (ICU, `minutes`).
3. **Сейчас: задача 1** — сквозной срез. План одобрен владельцем 2026-11-17. Описание —
   [`architecture-wave1.md`](architecture-wave1.md), порядок — `roadmap.md`. Четыре части, у
   каждой свой PR и свой журнал. **1a (020), 1b (021), AGENTS.md (022) и 1c (023) сделаны;
   следующая — 1d (сначала план).**

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

   **1d — e2e против настоящего API (следующее).** Собранный API на порту **4310** (добавить
   в список портов e2e, журнал 008a: 4300 / 4301 / 4402), статика SignFlow с прокси `/api`;
   убрать `page.route` из `smoke.spec.ts`; axe.

   **~~Гонка кэша Angular (найдена в 1c)~~ — исправлено (журнал 024).** `@angular/build` 22
   (`purge-cache.js`) удалял `.angular/cache/21.2.30`, в который Storybook собирался через
   `build-angular` 21. Теперь `@angular-devkit/build-angular` закреплён на `22.2.7` в
   корневом `package.json` — одна версия, одна папка кэша. Правило — в разделе 5.

   **Решения на потом:**
   - `/health/ready` (база доступна, миграции применены) — в задаче 5: он нужен автооткату в
     задаче 24;
   - в задаче 22 сборка образа добавляет в ответ health поле `commit` (SHA), чтобы было видно,
     какая сборка работает на сервере (ADR-0014);
   - `api:check` в CI — задача 2. `openapi.json` уже в `.prettierignore`, его сравнивает
     `api:check`, а не Prettier;
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
- Не обходить правило минимального возраста пакетов pnpm (`minimumReleaseAgeExclude` не
  добавлять).

### Обновление зависимостей

- **`@angular/build` и `@angular-devkit/build-angular` обновляются вместе, на одну версию**
  (журнал 024). Оба закреплены точно (`22.2.7`, без `~`): `build-angular` тянет
  `@angular/build` ровно своей версии, а `~` дал бы им разъехаться. Разные версии → две
  папки в `.angular/cache` → сборка Angular удаляет чужую на ходу → Storybook падает с
  `ENOENT`. Проверка: `pnpm check:angular-builders` (и шаг CI); вручную —
  `pnpm why @angular/build` → `Found 1 version`.
