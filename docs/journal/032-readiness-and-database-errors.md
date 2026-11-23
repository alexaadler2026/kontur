# 032 · Task 5b: `/health/ready` and database errors without values

Date: 2026-11-23 · Task: roadmap 5, part 5b — task 5 complete, [ADR-0020](../adr/0020-monitoring-logs-health.md), [ADR-0008](../adr/0008-api-conventions-and-money.md) · PR: — · Commits: after `4158a7e`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- **`GET /api/v1/health/ready`** отвечает 200, только если база отвечает **и** применены
  все миграции этой сборки. Иначе 503 `server.unavailable`. Это новый код ошибки,
  переведённый на de/en/ru.
- **Ошибки базы не выдают присланные значения.** Ни в ответе, ни в логе. Раньше
  PostgreSQL мог процитировать значение прямо в лог.
- **Тест запуска с неверной настройкой стал быстрым:** `main.ts` сначала проверяет
  настройки, а Nest, Prisma и `pg` загружает только потом.
- **Разобран «необъяснимый» сбой из 5a** — помогло новое правило «полный лог в файл».

Термины:

- **Liveness / readiness** — два вопроса к серверу. «Ты жив?»: процесс отвечает.
  «Ты готов?»: можно слать пользователей, база и миграции на месте. Скрипт выката (задача 24) переключает трафик на новую версию только после «готов».
- **`_prisma_migrations`** — служебная таблица, куда `prisma migrate deploy` записывает
  каждую применённую миграцию.
- **Динамический `import()`** — загрузка модуля в момент выполнения строки, а не до
  старта файла, как у обычного `import`.

**Зачем это нужно (аналогия из жизни).**

- Readiness — табличка «Открыто» на двери. Свет в магазине может гореть (liveness), но
  пока товар не разложен (миграции не применены), табличку не переворачивают.
- Ошибка базы со значением в логе — как врач, который диктует диагноз в коридоре. Лог
  читают люди и программы, хранится он 14 дней. Поэтому в логе номер случая (`traceId`)
  и код (`P2002`), а не персональные данные.

**Как это работает, шаг за шагом.**

1. **`Readiness`** (`src/health/readiness.ts`):
   - при старте читает имена папок `prisma/migrations/<время>_<имя>`. Это миграции,
     с которыми собрана **эта** версия. В сборку папка копируется через `assets` цели
     `build`;
   - на запрос: есть ли таблица `_prisma_migrations` (`to_regclass`), и все ли миграции
     сборки в ней отмечены как законченные и не откаченные;
   - нет связи с базой → причина `database unreachable (<код>)`. Код без текста
     сообщения: текст драйвера может назвать хост и пользователя;
   - не хватает миграции → `migration <имя> not applied`;
   - причина пишется в лог строкой `warn`, а клиент получает 503 `server.unavailable`.
2. **`/health/live` базу не трогает.** Если база упала, процесс жив, и Docker не должен
   перезапускать контейнер по кругу. Тест это проверяет: база остановлена → ready 503,
   live 200.
3. **Фильтр ошибок** (`problem.filter.ts`):
   - для ошибок базы (имя `PrismaClient…Error`) пишет в лог только имя, код и модель,
     **без текста и стека**;
   - ошибки узнаются по имени, а не через импорт сгенерированного клиента: в задаче 6
     фильтр переезжает в общую библиотеку `api-kit`, которая не должна зависеть от
     клиента одного приложения;
   - `ProblemException` (сознательный ответ вроде 503) фильтр больше не пишет как
     ошибку: у готовности своя строка с причиной.
4. **Перевод `errors.server.unavailable`** — `i18n-check` сначала был красным и назвал
   код. Тексты утверждены владельцем.
5. **`AppModule` стал глобальным** (`global: true`): `PrismaService` и настройки видны в
   любом модуле без повторного импорта корня.

**Находка 1: значение действительно попадает в лог.** Перед исправлением я временно
вывел лог в тесте:

```
PrismaClientKnownRequestError: Invalid `prisma.user.findUnique()` invocation:
Invalid input value: invalid input syntax for type uuid: "Geheim-123"
```

То есть подозрение из плана подтвердилось. В ошибке дубля Prisma значение не
показывает (`Unique constraint failed on the constraint: users_email_key`), но
PostgreSQL в своём `DETAIL` его называет. Ручная проверка в 5a это показала:
`Key (email)=(anna@beispiel.de) already exists`. Теперь в логе строка вида
`traceId=… POST /api/v1/… 500 PrismaClientKnownRequestError P2002 model=User (message
withheld…)`.

**Находка 2: «необъяснимый» сбой из 5a объяснён.** Полный лог теперь сохраняется в
`tmp/logs/`, и при следующем прогоне в нём было видно: `Test timed out in 30000ms` у
теста `migrate diff`. Этот тест запускает Prisma CLI, а тот проигрывает все миграции во
временной базе: отдельно около 14 с. С пятью интеграционными файлами, которые
одновременно поднимают контейнеры, — больше 30 с. Исправление: свой тайм-аут 120 с у
этого теста, с комментарием почему. Требование теста не изменилось.

**Находка 3: тест запуска упал по тайм-ауту, и виноват был код.** `PORT=abc node
main.js` шёл 7–9 с даже на спокойной машине. В ESM все `import` загружаются **до** первой
строки кода, поэтому Nest, Prisma и `pg` грузились ради процесса, который сразу
остановится. Теперь `main.ts` сначала проверяет настройки, а остальное грузит через
`await import(...)`. Получилось около 2 с, и тест зелёный.

**Тесты: красный первым и мутации.**

- Unit: `/health/ready` без базы → 503 `server.unavailable`, в логе причина и нет
  строки подключения. Красный первым (404).
- Integration (10/10):
  - миграции применены → 200;
  - база остановлена → 503, liveness 200;
  - пустая база без миграций → 503 и в логе `migration …_init not applied`;
  - дубль e-mail → 500, нет значения в ответе и логе, есть `P2002` и `traceId`;
  - «не UUID» → 500, значения нет нигде.

  Красные первыми: 404; значение `Geheim` в логе; нет `P2002`.

- `i18n-check` красный первым: назвал `server.unavailable`.
- Мутация уже записана естественным красным прогоном: до исправления фильтра значение
  было в логе.
- **Изменённые тесты:**
  - мой новый тест «не UUID» до первого коммита: значение было в пути URL, а путь по RFC
    9457 повторяется в `instance`. Значения в пути не то, что мы защищаем: там только
    UUID. Перенёс значение в тело;
  - в unit-тесте контроллера появилась заглушка `Readiness`: у конструктора новый
    параметр, проверка не менялась;
  - `CapturingLogger` вынесен из `problem.http.spec.ts` в `src/testing/`, тесты не
    менялись.
- Сбой воркера Vitest (`Failed to start forks worker`, `signflow:test`, четыре проекта
  параллельно) повторился локально один раз. Записано в `next-steps.md`; в CI его пока
  не было.

**Какие были альтернативы и почему отказались.**

- Проверять готовность одним `SELECT 1`: база отвечает, но миграции могут быть не
  применены, и новая версия упадёт на первом же запросе к новой колонке.
- Сравнивать с миграциями через `prisma migrate status`: CLI внутри работающего API —
  лишний процесс и лишний движок в образе.
- Вырезать значения из текста ошибки регулярным выражением: всегда найдётся формат,
  который пропустит. Надёжнее не писать текст вообще.
- Импортировать `Prisma` в фильтр и проверять `instanceof`: привязало бы общий фильтр к
  клиенту одного приложения.

**Что может сломаться и как починить.**

- Симптом: выкат ждёт `ready` и не дожидается. В логе `not ready: migration … not
applied` → не прошёл `prisma migrate deploy`. `database unreachable (…)` → база или
  `DATABASE_URL`.
- Симптом: ошибка 500, а в логе только `P2002 model=User` → это намеренно. Код P2002 —
  нарушение уникальности; дальше искать по `traceId` и коду.
- Симптом: API не стартует, `ENOENT … prisma/migrations` → сборка без `assets`; проверить
  цель `build`.

**Вопрос с собеседования по этой теме.**

- В: Чем liveness отличается от readiness, и что вы проверяете в readiness?
- О: Liveness — процесс жив; она не трогает зависимости, иначе упавшая база заставит
  оркестратор перезапускать здоровые контейнеры по кругу. Readiness — можно ли слать
  трафик: база отвечает и применены все миграции, с которыми собрана эта версия. Список
  миграций лежит в сборке и сравнивается с `_prisma_migrations`. При «не готов» — 503 и
  строка в логе с причиной, но без значений и без строки подключения.

## 🇬🇧 What and why (full)

**What was done.**

- `GET /api/v1/health/ready` answers 200 only when the database answers **and** every
  migration of this build is applied; otherwise 503 `server.unavailable` (new code,
  translated in de/en/ru).
- Database errors no longer leak sent values into the response or the log.
- The start-up check is fast: `main.ts` validates settings before loading Nest, Prisma
  and `pg`.
- The "unexplained" failure from 5a is explained, thanks to the full-log rule.

**Why (real-life analogy).**

- Readiness is the "Open" sign: the lights may be on (liveness), but the sign is not
  turned until the shelves are stocked (migrations applied).
- Logging a database error with its value is a doctor dictating a diagnosis in the
  corridor. The log carries the case number (`traceId`) and the code (`P2002`) instead.

**How it works, step by step.**

1. `Readiness` reads this build's migration folders, which the build copies via
   `assets`. It checks `_prisma_migrations` (via `to_regclass` first) for finished,
   not-rolled-back rows.
2. It returns `database unreachable (<code>)` or `migration <name> not applied` and logs
   that as a warning, without any message text.
3. `/health/live` never touches the database.
4. The problem filter logs database errors (`PrismaClient…Error`) as name, code and model
   only. It recognises them by name, so that it stays portable to `api-kit` (task 6), and
   no longer logs deliberate `ProblemException`s.
5. `AppModule.forRoot` is global.

**Findings.**

1. A temporary log dump proved the leak: `invalid input syntax for type uuid:
"Geheim-123"`.
2. The saved log revealed the 5a failure: the `migrate diff` test timed out at 30 s while
   five integration files started their containers. It now has its own 120 s timeout.
3. The start-up test timed out because ESM loads every static import before the first line
   runs. `PORT=abc` took 7–9 s; with the app loaded via `import()` after validation, it
   takes about 2 s.

**Red first and mutations.**

- Unit: ready without a database → 503, with the reason logged and no connection string.
- Integration 10/10: migrated → 200; database stopped → 503 while live stays 200; empty
  database → 503 and "migration …_init not applied"; duplicate e-mail and non-UUID →
  500, no value anywhere, with the code and `traceId` in the log.
- `i18n-check` was red first and named the new code.
- Changed tests: my new non-UUID test moved its value from the URL path, which
  `instance` echoes by design, to the body; the controller unit test gets a `Readiness`
  stub; `CapturingLogger` moved to `src/testing/`. No assertion was weakened.
- The Vitest worker start failure repeated locally once (not in CI).

**Alternatives considered and why rejected.**

- `SELECT 1` only: it misses unapplied migrations.
- `prisma migrate status` inside the API: an extra process and engine.
- Regex redaction: some format always slips through.
- An `instanceof` import: it would tie the shared filter to one app's client.

**What can break and how to fix it.**

- Deploy never ready → read the `not ready:` line in the log.
- 500 with only `P2002 model=User` in the log → this is by design; use the `traceId`.
- `ENOENT … prisma/migrations` at start → the build `assets` are missing.

**Interview question on this topic.** Q: Liveness vs readiness — what goes into
readiness? A: Liveness only says the process answers and never checks dependencies.
Readiness says traffic may come: the database answers and every migration this build
ships is applied (compared with `_prisma_migrations`). When not ready: 503 and a log line
with the reason, without values or connection strings.

## 🇩🇪 Kurzfassung (Niveau B1)

Die API hat jetzt einen Readiness-Endpunkt. Er antwortet mit 200, wenn die Datenbank
erreichbar ist und alle Migrationen dieser Version eingespielt sind. Sonst antwortet er
mit 503 und schreibt den Grund ins Log. Der Liveness-Endpunkt fragt die Datenbank nie.
Fehler der Datenbank enthalten manchmal den gesendeten Wert, zum Beispiel eine
E-Mail-Adresse. Deshalb schreibt die API bei solchen Fehlern nur den Namen, den Code und
das Modell ins Log, nie den Text. Ein Test mit einem geheimen Wert beweist das. Dank der
gespeicherten Logs haben wir außerdem einen alten Testfehler verstanden: Ein Test brauchte
unter Last mehr als 30 Sekunden.

### Fachwortschatz

| Deutsch                        | English                    | Русский                   |
| ------------------------------ | -------------------------- | ------------------------- |
| die Betriebsbereitschaft       | readiness                  | готовность                |
| die Lebendigkeitsprüfung       | liveness check             | проверка «жив ли процесс» |
| die Migration einspielen       | apply a migration          | применить миграцию        |
| der Fehlercode                 | error code                 | код ошибки                |
| personenbezogene Daten         | personal data              | персональные данные       |
| die Zeitüberschreitung         | timeout                    | тайм-аут                  |
| die Auslieferung               | deployment                 | выкат                     |
| der Dienst ist nicht verfügbar | the service is unavailable | сервис недоступен         |
