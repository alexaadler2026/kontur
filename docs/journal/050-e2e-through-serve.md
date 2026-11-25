# 050 · e2e запускает API через signflow-api:serve

Date: 2026-11-25 · Task: решение владельца после поломки serve · PR: — · Commits: `00b9c94`, `fec726f`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Проблема.** `nx serve signflow-api` долго был сломан, и никто этого не заметил (журнал
048). Причина: e2e запускали API своим способом (`serve-e2e`), а не через `serve`.
Решение владельца: **один способ запуска**. Тогда сломанный `serve` сразу даёт красный e2e
и красный CI.

**Как теперь устроено.**

1. **База для e2e** — сервис в `compose.e2e.yaml`.
   - Данные лежат в tmpfs, то есть в памяти, поэтому база свежая на каждый прогон.
   - Порт 5433, слушает только 127.0.0.1.
   - Готовит её цель `signflow-api:e2e-database`. Порядок: убрать остаток прошлого прогона
     → проверить порт → `up --wait` → миграции → тестовый аккаунт.
   - Порт занят чужой программой — понятная ошибка и выход, без зависания.
2. **Цель `nx e2e signflow-e2e`** сначала собирает оба приложения и готовит базу
   (`dependsOn`), потом запускает Playwright.
3. **Playwright запускает серверы сам.**
   - API запускается через `nx run signflow-api:serve:e2e`: та же цель `serve`, но в
     конфигурации `e2e` (порт 4310, e2e-база).
   - Учётные данные e2e есть только в этой конфигурации. В обычной их нет.
   - `reuseExistingServer` включён только вне CI.
4. **После прогона** `globalTeardown` удаляет базу.

**Почему не Testcontainers.** Владелец предположил, что Ryuk удалит контейнер, когда
процесс цели завершится. Ryuk — это «уборщик» Testcontainers. Я проверил: контейнер жил 5
секунд после выхода процесса, а через 10 секунд исчез. Предположение подтвердилось.

**Что пошло не так по дороге (и чему это учит).**

- **Таймауты.** Сначала я связал их с остатком прошлого прогона. Вывод серверов
  (`DEBUG=pw:webserver`) и замер с отметками времени показали другое. С `CI=true` Nx
  работает без демона и на каждый вызов почти минуту строит граф проекта. В команде
  сервера было два вызова `nx` и ещё сборка внутри лимита ожидания. Исправление: сборки и
  база готовятся до Playwright, а у каждого сервера один `nx run
--exclude-task-dependencies`.
- **«Здоров» слишком рано.** При первом старте образ PostgreSQL поднимает временный сервер
  только на unix-сокете. `pg_isready` без `-h` отвечал «готов», а миграции ещё не могли
  подключиться. Теперь проверка идёт по TCP (`-h 127.0.0.1`).
- **Процесс не завершался** после неудачного шага, и Playwright ждал свои 2 минуты.
  Теперь в конце явный `process.exit`.
- **Ответ из кэша — не прогон.** Один «зелёный» прогон за 22 секунды был ответом из кэша
  Nx. Для проверки «вернул → зелёный» нужен прогон без кэша.
- **Своя ошибка.** После коммита про самоназвания языков (журнал 049) я не запустил e2e. В
  e2e-тесте осталось «English (en-GB)». Тест исправлен вслед за требованием.

**Проверка.**

- `serve` сломан нарочно (неверный путь к `main.js`) → e2e красный с причиной
  «Cannot find module …».
- Возвращён → 21 тест зелёный без кэша. Остаток красного прогона убран, после прогона
  контейнеров нет.

**Аналогия.** Пожарную тревогу проверяют той же сиреной, что будет выть при пожаре, а не
отдельной учебной.

**Что может сломаться.**

- Голый `playwright test` не готовит базу и сборки, запускать только через `nx e2e`.
- Если сервер не стартовал, Playwright не вызывает teardown, и база остаётся до следующего
  прогона. Следующий прогон её уберёт.

**Вопрос с собеседования.**

- В: Почему e2e должны запускать приложение той же командой, что и разработчики?
- О: Иначе e2e проверяют другую сборку запуска. Команда разработчиков может сломаться
  незаметно, при зелёном CI.

## 🇬🇧 What and why (full)

**Problem.** `nx serve signflow-api` was broken unnoticed because e2e started the API its
own way. Now there is one way: Playwright runs `nx run signflow-api:serve:e2e`.

**Setup.**

- The e2e database is a compose service (`compose.e2e.yaml`, tmpfs, port 5433). The target
  `signflow-api:e2e-database` prepares it: remove a leftover, check the port (busy means a
  clear error), `up --wait`, migrations, test account.
- The e2e target builds and prepares the database first; Playwright starts the servers.
- `reuseExistingServer` is on only outside CI. `globalTeardown` removes the database.
- e2e credentials exist only in the e2e configuration.

**Why not Testcontainers.** Measured: Ryuk removed the container ~10 s after the starting
process ended.

**Lessons.**

- The timeouts came from Nx without a daemon under `CI=true` (~1 min per call), not from
  leftovers. Found by webServer debug output and timestamps.
- The healthcheck must use TCP: the first-start server listens on the socket only.
- Exit explicitly after a failure.
- A 22-second "green" run was a cache replay, not a run.
- I had not run e2e after the language-name change; that test now follows the requirement.

**Verification.** Broken serve → red ("Cannot find module"); restored → 21 passed without
cache; no container left.

**Interview question.** Q: Why should e2e start the app with the developers' command?
A: Otherwise e2e test a different startup path, and the developers' command can break
while CI stays green.

## 🇩🇪 Kurzfassung (Niveau B1)

Die e2e-Tests starten die API jetzt mit demselben Befehl wie die Entwickler:
`signflow-api:serve`, in der Konfiguration `e2e`. Wenn `serve` kaputt ist, wird die CI rot.
Die Testdatenbank ist ein Compose-Dienst im Arbeitsspeicher (tmpfs) und bei jedem Lauf
neu. Testcontainers passte nicht: Sein Aufräumer (Ryuk) löscht den Container etwa zehn
Sekunden nach dem Ende des Prozesses. Die Zeitüberschreitungen kamen von Nx ohne Daemon im
CI-Modus. Wir haben `serve` absichtlich kaputt gemacht: Der Test wurde rot, danach wieder
grün.

### Fachwortschatz

| Deutsch                      | English         | Русский              |
| ---------------------------- | --------------- | -------------------- |
| der Compose-Dienst           | compose service | compose-сервис       |
| die Zeitüberschreitung       | timeout         | таймаут              |
| der Gesundheitscheck         | health check    | проверка готовности  |
| der Rest (Überbleibsel)      | leftover        | остаток              |
| der Zwischenspeicher (Cache) | cache           | кэш                  |
| das Aufräumen nach dem Lauf  | teardown        | уборка после прогона |
