# 044 · Задача 8-1: e2e на настоящей базе с тестовым пользователем

Date: 2026-11-23 · Task: 8-1 (plan `docs/plans/044-sign-in.md`) · PR: — · Commits: `ba21be5`…`b55d031`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Раньше e2e-тесты SignFlow (сквозные тесты в настоящем браузере) запускали API с
выдуманным адресом базы: для проверки «сервер отвечает» этого хватало. Но для входа нужен
пользователь в базе. Теперь `nx run signflow-api:serve-e2e`:

1. поднимает чистую PostgreSQL в Docker (через **Testcontainers** — библиотеку, которая из
   кода запускает и убирает контейнеры) тем же образом, что в интеграционных тестах;
2. применяет все миграции (`prisma migrate deploy`, как в production);
3. создаёт тестового пользователя из `apps/signflow-e2e/src/support/e2e-user.json` с
   настоящим хэшем Argon2id;
4. запускает собранный API на этой базе.

Новый e2e-тест входит этим пользователем прямо со страницы и проверяет cookie
`__Host-sid` и ответ `GET /session`.

**Зачем это нужно (аналогия из жизни).**
Тренировка пожарных на макете без воды показывает, что шланги раскатываются. Но потушит
ли расчёт огонь, видно только с водой. E2e без базы — тренировка без воды: вход, выход,
«сессия истекла» на ней не проверить.

**Как это работает, шаг за шагом.**

1. `src/e2e-server.ts` — точка входа, рядом с `create-admin`; логика — в
   `src/e2e/run-e2e-server.ts`.
2. Сначала читается файл учётки. `parseE2eUser` проверяет e-mail и пароль правилами 7a
   (`checkPassword`): 15+ символов, не из списка частых, без частей e-mail и названий
   продуктов. Слабый пароль — понятная ошибка, сервер не стартует (твоё дополнение).
3. Потом контейнер и миграции. Путь к `prisma.config.ts` передаётся явно: из `dist`
   своё место файла туда не ведёт.
4. `seedE2eUser` создаёт пользователя; `node main.js` запускается с `DATABASE_URL` новой
   базы и `PORT=4310`.
5. API остановился — останавливается и контейнер. Если процесс убили жёстко, контейнер
   убирает Ryuk — сторож Testcontainers.
6. **Готовность.** У цели `serve-e2e` есть `readyWhen` с адресом health. **Постоянная
   задача** (continuous) — та, что не заканчивается сама: сервер. Без `readyWhen` Nx
   считает её готовой сразу после запуска.

**Найденная гонка (и почему она проявилась только сейчас).**
Раньше API стартовал за доли секунды. Теперь ему нужно ~10 с (Docker, миграции). Без
`readyWhen` получалось так:

1. Nx запускал `serve-e2e` и сразу — Playwright.
2. Playwright не находил API по адресу health и запускал **второй** `serve-e2e`.
3. Второй запуск пересобирал API и на время стирал `dist`.
4. У первого из-под ног пропадал `main.js` — «Cannot find module».

До исправления упали 2 прогона из 2, после — 0. В логе одна строка «SignFlow API on» и
ни одной от второго запуска.

**Проверено.**

- Красный прогон e2e на старом сервере: 500 вместо 204, потому что базы нет. По пути
  нашлась ошибка в моём тесте: он отправлял и поле-комментарий `"//"` из JSON-файла, и API
  правильно ответил 422 на лишнее поле. Тест исправлен до первого зелёного прогона.
- Мутация «правила пароля не проверяются» → тест падает.
- Unit signflow-api 79, интеграционные 40 (новый: созданный хэш проверяет пароль), e2e
  SignFlow 14/14, `nx affected -t lint test build e2e` — зелёное.
- Руками (PowerShell, нужен Docker Desktop):
  ```powershell
  pnpm nx run signflow-api:serve-e2e
  # в другом окне:
  curl.exe -s http://localhost:4310/api/v1/health/live
  ```
  Ожидается: через ~10–15 с строка `SignFlow API on http://localhost:4310/api/v1`, а
  `curl.exe` возвращает JSON с `"status":"ok"`. Ctrl+C — контейнер исчезает из
  `docker ps`.

**Какие были альтернативы и почему отказались.**

- Сервис PostgreSQL в docker compose. Отказались: его надо запускать заранее, и локально
  всё было бы не так, как в CI.
- Подменять ответы API в Playwright (`route`). Отказались: e2e должны идти через настоящий
  API.
- Пароль тестового пользователя в переменной окружения. Отказались: учётка лежит в одном
  файле, сервер и тесты читают его. Это чтение файла, не импорт, так что границы Nx для
  e2e соблюдены.

**Что может сломаться и как починить.**

- Симптом: `e2e server: … It needs a running Docker`. → Причина: Docker не запущен. →
  Что делать: запустить Docker Desktop.
- Симптом: `e2e account: the password breaks the password rules (…)`. → Причина: пароль
  в `e2e-user.json` нарушает правила 7a. → Что делать: поменять пароль.
- Симптом: «Cannot find module …main.js» при e2e. → Причина: у `serve-e2e` пропал
  `readyWhen`, вернулась гонка. → Что делать: вернуть `readyWhen`.
- Узкое исключение линта: в `run-e2e-server.ts` дочерний процесс получает
  `process.env` родителя плюс две настройки. Правило ADR-0009 запрещает _читать_
  настройки мимо `loadConfig()`, а здесь окружение просто передаётся дальше. Причина
  записана рядом в комментарии.

**Замечено, на будущее (задача 22).** `tsconfig.app.json` исключает только `*.spec.ts`,
поэтому `*.int-spec.ts` и тестовые модули (`testing/`, `e2e/`) попадают в `dist`. В
Docker-образ production их класть нельзя. Записано в `next-steps.md`.

**Вопрос с собеседования по этой теме.**

- В: Почему e2e-тест «прошёл», хотя сервер, запущенный Nx, упал?
- О: Playwright с `reuseExistingServer` проверил адрес, ничего не нашёл и поднял свой
  сервер — второй. Тесты прошли на нём, но два сервера мешали друг другу. Лечится
  проверкой готовности (`readyWhen`): Nx ждёт, пока сервер действительно ответит, и
  только потом запускает тесты. Тогда Playwright находит готовый сервер и второй не
  поднимает.

## 🇬🇧 What and why (full)

**What was done.** `serve-e2e` now runs `src/e2e-server.ts`:

1. a fresh PostgreSQL in Docker (Testcontainers, the project's image);
2. `prisma migrate deploy`;
3. the test account from `apps/signflow-e2e/src/support/e2e-user.json` with a real
   Argon2id hash;
4. the built API on that database.

A new e2e test signs in from the page and checks the `__Host-sid` cookie and
`GET /session`.

**Why (real-life analogy).** A fire drill without water shows that the hoses unroll; only
with water do you see whether the fire goes out. E2e without a database cannot test
sign-in, sign-out or an expired session.

**How it works, step by step.**

1. The account file is read first. Its password must pass the rules of 7a, otherwise the
   server stops with a clear message.
2. Database and migrations start; the project root is passed explicitly, because the
   path of the compiled file does not lead to `prisma.config.ts`.
3. The account is seeded, and the API is spawned with the database URL and port 4310.
4. When the API exits, the container stops; after a hard kill, Ryuk removes it.
5. `serve-e2e` has a target-level `readyWhen` (the health URL, 180 s).

**The race.** Without `readyWhen`, Nx treated the continuous task as ready at once, so
Playwright started too early. It found no API and started a second `serve-e2e`, whose
build wiped `dist` under the first one. Before the fix 2 of 2 runs failed, after it none
did, and the log shows a single API start.

**Verification.**

- Red first: 500 without a database. My own test bug was fixed before the first green
  run: it sent the file's `"//"` key, and the API correctly answered 422.
- A mutation (password rules not checked) is caught.
- Unit 79, integration 40, e2e 14/14; `nx affected -t lint test build e2e` is green.

**Alternatives considered and why rejected.**

- A compose service: it must be started by hand and differs from CI.
- Stubbing the API in Playwright: e2e must go through the real API.
- Credentials in environment variables: one file, read by both the server and the tests.

**What can break and how to fix it.**

- Docker is not running → start Docker Desktop.
- A weak password in the file → change it.
- "Cannot find module main.js" → restore the `readyWhen` of `serve-e2e`.
- A narrow lint exception passes `process.env` to the child process; it is not a settings
  read.
- Noted for task 22: `*.int-spec.ts` and test modules end up in `dist` and must stay out
  of the production image.

**Interview question on this topic.** Q: Why did the e2e run pass although the server
started by Nx had crashed? A: Playwright, with `reuseExistingServer`, found nothing at the
URL and started its own second server; the tests ran against that one. A readiness check
makes Nx wait until the server really answers, so Playwright reuses it and never starts a
second one.

## 🇩🇪 Kurzfassung (Niveau B1)

Die E2E-Tests von SignFlow laufen jetzt gegen eine echte PostgreSQL-Datenbank.
`serve-e2e` startet sie mit Testcontainers in Docker, führt alle Migrationen aus und legt
ein Testkonto an. Das Passwort des Testkontos muss die normalen Passwortregeln erfüllen.
Dann startet die gebaute API auf dieser Datenbank, und ein neuer Test meldet sich im
Browser an. Dabei haben wir einen Wettlauf gefunden: Nx hielt den Server sofort für
bereit, Playwright startete einen zweiten Server, und dessen Build löschte die Dateien des
ersten. Die Lösung ist eine Bereitschaftsprüfung (`readyWhen`) über die Health-URL. Jetzt
startet die API genau einmal.

### Fachwortschatz

| Deutsch                        | English         | Русский                      |
| ------------------------------ | --------------- | ---------------------------- |
| der End-to-End-Test            | end-to-end test | сквозной тест                |
| das Testkonto                  | test account    | тестовая учётная запись      |
| der Container                  | container       | контейнер                    |
| die Migration                  | migration       | миграция                     |
| die Bereitschaftsprüfung       | readiness check | проверка готовности          |
| der Wettlauf (Race Condition)  | race condition  | гонка                        |
| die dauerhaft laufende Aufgabe | continuous task | постоянная задача            |
| die Startdaten anlegen         | to seed data    | наполнить начальными данными |
