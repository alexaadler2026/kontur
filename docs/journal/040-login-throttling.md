# 040 · Sign-in throttling, an Argon2 queue and fewer "last seen" writes

Date: 2026-11-23 · Task: 7c, [ADR-0010](../adr/0010-authentication.md) · PR: — · Commits: after `11a20b5`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** Вход теперь защищён от перебора паролей. Счётчиков три, все числа задал
владелец, и каждое можно поменять настройкой:

| Счётчик                   | Правило                                                                      | Настройка (по умолчанию)                                           |
| ------------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| пара «e-mail + IP»        | после 5 неудач ждать 1, 2, 4, 8 … минут, максимум 15; успешный вход обнуляет | `LOGIN_PAIR_FREE_FAILURES` (5), `LOGIN_PAIR_MAX_LOCK_MINUTES` (15) |
| один IP по всем аккаунтам | 50 неудач за скользящие 15 минут → ждать                                     | `LOGIN_IP_MAX_FAILURES` (50), `LOGIN_IP_WINDOW_MINUTES` (15)       |
| частота запросов          | не больше 20 запросов на вход в минуту с одного IP (в памяти)                | `AUTH_RATE_LIMIT_PER_MINUTE` (20)                                  |

Когда клиент должен ждать, ответ — **429 `auth.throttled`** с заголовком
**`Retry-After`** (секунды). Тексты de/en/ru взяты из дизайна (`Alert.md`), минуты
подставляются через ICU-плюрал. Ответ не говорит, какой именно счётчик сработал.

Ещё два пункта:

- **очередь Argon2**: одновременно идут не больше 4 хеширований (`ARGON2_MAX_CONCURRENT`),
  остальные ждут по очереди. Один хеш занимает 46 MiB, сервер — 4 ГБ;
- **`last_seen` пишется не чаще раза в 5 минут.** SPA опрашивает сервер каждые 30 с
  (ADR-0018), и без этого каждый опрос был бы записью в базу.

Где лежит код:

- `libs/shared/auth-server`:
  - `throttle/login-throttle.ts` — формулы задержки и счётчик запросов в памяти;
  - `password/concurrency-limited-password-hasher.ts` — очередь;
- `libs/shared/api-kit` — `ProblemException` теперь умеет ставить `Retry-After`;
- `apps/signflow-api`:
  - таблица `login_failures`;
  - `LoginThrottle` — счётчики в PostgreSQL;
  - `AuthRateLimitGuard`;
  - шесть настроек.

Термины:

- **throttling** (ограничение попыток) — заставлять клиента ждать после неудач;
- **перебор (brute force)** — пробовать много паролей к одному аккаунту;
- **password spraying** — пробовать один-два частых пароля ко многим аккаунтам. Против
  этого нужен счётчик по IP, а не по аккаунту;
- **скользящее окно** — считаются события за последние 15 минут от «сейчас», а не с
  начала часа;
- **`Retry-After`** — стандартный заголовок HTTP «повторите через N секунд»;
- **семафор / очередь** — счётчик «сколько работ идёт сейчас». Новая работа либо
  начинается, либо встаёт в очередь;
- **FIFO** — «первым пришёл — первым обслужен».

**Зачем это нужно (аналогия из жизни).** Банкомат:

- Пару раз ошибиться в PIN-коде можно. После нескольких ошибок банкомат просит подождать,
  и с каждой новой ошибкой дольше. Это счётчик пары.
- Если кто-то ходит от банкомата к банкомату и пробует «1234» на всех картах подряд, банк
  замечает и это. Это счётчик IP.
- Охранник на входе пускает не больше 20 человек в минуту. Это лимит в памяти.
- В зале всего 4 окна. Пятый клиент ждёт в очереди, а не лезет в окно пятым, иначе
  кассир (память сервера) не справится. Это очередь Argon2.

Главное требование владельца: злоумышленник не должен заблокировать **хозяина** аккаунта.
Поэтому счётчик стоит на паре «e-mail + IP». Перебор с адреса злоумышленника блокирует
только его адрес, а владелец со своего IP входит спокойно. Блокировки всего аккаунта
нет до задачи 11: она нужна только вместе с письмом владельцу.

**Как это работает, шаг за шагом.**

1. `POST /session` приходит.
   - `SameOriginGuard` (CSRF) проверяет, не с чужого ли сайта запрос.
   - `AuthRateLimitGuard` прибавляет 1 к счётчику этого IP в текущей минуте. Больше 20 →
     429 и `Retry-After` до конца минуты. Сюда запрос доходит ещё до проверки данных и
     до базы.
2. `ValidationPipe` проверяет поля.
3. `SessionService.signIn` спрашивает `LoginThrottle.retryAfterSeconds`. Тот делает два
   запроса к базе параллельно:
   - **пара:** сколько неудач у этой пары за последние 24 часа и когда была последняя.
     Задержка = `pairLockSeconds(n)`: 0 при n < 5, иначе min(2^(n−5), 15) минут, отсчёт
     от последней неудачи;
   - **IP:** время 50-й по свежести неудачи с этого IP. Если она моложе 15 минут, лимит
     достигнут: ждать, пока она не выйдет из окна.

   Берётся большее из двух ожиданий. Больше 0 → 429. Пароль при этом **не проверяется**
   (Argon2 не тратит память), и такая попытка не считается неудачей.

4. Проверка пароля идёт через `ConcurrencyLimitedPasswordHasher`: если 4 хеширования уже
   идут, вызов ждёт в очереди. Освободившееся место передаётся следующему в очереди
   напрямую, поэтому новичок не может «пролезть» вперёд.
5. Неудача → строка в `login_failures` и 401. Успех → строки этой пары удаляются, сессия
   создаётся.
6. `GET /session` обновляет `last_seen_at`, только если с прошлой записи прошло ≥ 5
   минут.

**Какие были альтернативы и почему отказались.**

- Хранить счётчики в памяти (как частоту запросов) — после перезапуска API все блокировки
  сбрасывались бы, и злоумышленник мог бы этим пользоваться. ADR-0010 требует PostgreSQL.
- Счётчик-строка на пару (`failures`, `locked_until`) вместо строки на каждую неудачу —
  меньше строк, но скользящее окно по IP так не посчитать. Одна таблица «строка на
  неудачу» отвечает на оба вопроса двумя простыми запросами.
- Блокировать весь аккаунт после N неудач — так злоумышленник мог бы запереть владельца.
  Явно отклонено в ADR-0010.
- Линейный рост задержки (1, 2, 3 … минуты) вместо удвоения — перебор замедлялся бы
  медленнее. При удвоении после 9 неудач уже максимум 15 минут, а человек, пять раз
  ошибившийся при наборе, ждёт всего минуту.
- Готовый `@nestjs/throttler` для лимита запросов — лишняя зависимость ради ~30 строк;
  свой `RequestRateLimiter` проще объяснить и протестировать с подменой часов.
- Без очереди Argon2 — 50 одновременных попыток входа = 2,3 ГБ памяти на сервере с 4 ГБ.

**Что может сломаться и как починить.**

- Симптом: на сервере все клиенты получают 429 одновременно. → Причина: API видит один
  IP — адрес прокси (Caddy), и все клиенты попадают в один счётчик. → Что делать:
  `trust proxy` в задаче 23 (запланировано).
- Симптом: вход медленный при наплыве пользователей. → Причина: очередь Argon2, 4 места.
  → Что делать: поднять `ARGON2_MAX_CONCURRENT`, если памяти хватает (46 MiB × N).
- Симптом: таблица `login_failures` растёт. → Причина: очистки пока нет. → Что делать:
  периодическое задание (задача 27). До тех пор строк немного: их создаёт только
  неудачный вход.
- Симптом: тест, который входит много раз подряд, внезапно получает 429. → Причина:
  лимит 20 запросов в минуту с одного адреса (у supertest всегда 127.0.0.1). → Что делать:
  `startApiOn(url, [], { AUTH_RATE_LIMIT_PER_MINUTE: 10_000 })`, как в
  `session.int-spec.ts`.

**Честно о моих ошибках в тестах.** Первый вариант теста «владелец входит с другого IP»
делал 9 неудачных попыток подряд и ждал на каждую 401. Но после пятой пара уже
заблокирована, и шестая правильно получает 429. Код был верный, тест — нет; исправлен до
первого зелёного прогона.

**Как я убедился, что тесты ловят ошибки (мутации).**

| Мутация                                           | Какой тест упал                                    |
| ------------------------------------------------- | -------------------------------------------------- |
| убрать лимит в очереди Argon2                     | 2 теста `ConcurrencyLimitedPasswordHasher`         |
| считать пару без IP (по сути блокировка аккаунта) | «guessing from one IP does not lock the owner out» |
| писать `last_seen` всегда                         | «"last seen" is written at most every 5 minutes»   |

**Вопрос с собеседования по этой теме.**

- В: Как защитить вход от перебора, не дав злоумышленнику заблокировать настоящего
  владельца аккаунта?
- О: Не блокировать аккаунт целиком по числу неудач. Считать неудачи по паре «аккаунт +
  IP» с растущей задержкой: перебор с одного адреса тормозит только этот адрес.
  Отдельно считать неудачи по IP через все аккаунты (против password spraying) и
  ограничивать частоту запросов. Блокировку всего аккаунта включать только при
  распределённой атаке и вместе с письмом владельцу и ссылкой на сброс пароля. И
  проверять ограничения до хеширования пароля, чтобы атака не съела CPU и память.

### Как проверить руками (PowerShell)

```powershell
# 1. Библиотека: формулы, счётчик в памяти, очередь Argon2 — ожидается "Tests  56 passed (56)"
pnpm nx run auth-server:test

# 2. HTTP-тесты API (Retry-After, 21-й запрос → 429) — ожидается "Tests  61 passed (61)"
pnpm nx run signflow-api:test

# 3. На настоящем PostgreSQL (Docker Desktop запущен) — ожидается "Tests  31 passed (31)"
pnpm nx run signflow-api:test-integration

# 4. Вживую: 21 запрос на вход за минуту → последний получает 429 с Retry-After
docker compose -f compose.dev.yaml up -d postgres
pnpm nx run signflow-api:prisma-migrate-deploy
pnpm nx run signflow-api:serve          # в отдельном окне
1..21 | ForEach-Object {
  curl.exe -s -o NUL -w "%{http_code} " -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3333/api/v1/session
}
# Ожидается: двадцать раз 422 и в конце 429
curl.exe -s -i -X POST -H "Content-Type: application/json" -d '{}' http://localhost:3333/api/v1/session | Select-String "Retry-After|auth.throttled"
# Ожидается: строка "Retry-After: 5x–60" и тело с "code":"auth.throttled"
```

Проверено на живом сервере 2026-11-23: `422 × 20, 429`, затем `Retry-After: 60`.

## 🇬🇧 What and why (full)

**What was done.** Sign-in is now protected against guessing. Three counters with the
owner's numbers, each a setting:

- **(e-mail, IP) pair:** after 5 failures the client waits 1, 2, 4, 8 … minutes, at most 15. A success resets the pair.
- **IP across all accounts:** 50 failures in a sliding 15-minute window make it wait.
- **Request rate:** at most 20 sign-in requests per minute per IP, in memory.

A waiting client gets 429 `auth.throttled` with `Retry-After`. Two more pieces:

- **an Argon2 queue:** at most 4 hashes at once (46 MiB each);
- **`last_seen_at`:** written at most every 5 minutes.

**Why (real-life analogy).** A cash machine:

- A few wrong PINs are fine; then it makes you wait, longer each time. That is the pair
  counter.
- Someone trying "1234" on every card gets noticed too. That is the IP counter.
- A guard lets in at most 20 people a minute. That is the in-memory limit.
- The bank has 4 counters, and the fifth customer queues. That is the Argon2 queue.

The key owner requirement: an attacker must not lock the real owner out. That is why the
counter is per (e-mail, IP) pair, and there is no account-wide lock before task 11.

**How it works, step by step.**

1. The global CSRF guard runs first, then `AuthRateLimitGuard`. More than 20 requests in
   the minute → 429.
2. Validation runs.
3. `LoginThrottle` runs two queries in parallel:
   - the pair's failure count (last 24 h) and its last failure;
   - the IP's 50th most recent failure.

   The longer of the two waits wins. If it is above 0 → 429, with no password check and
   no count.

4. Verification goes through the FIFO queue of at most 4. A freed place is handed to the
   next waiter directly.
5. A failure adds a row; a success deletes the pair's rows.
6. `GET /session` writes `last_seen_at` only if it is at least 5 minutes old.

**Alternatives considered and why rejected.**

- In-memory counters: a restart would clear every lock (ADR-0010 says PostgreSQL).
- One counter row per pair: it cannot answer a sliding IP window.
- Account-wide locks: they let an attacker lock the owner out.
- Linear delay: it slows guessing too gently. With doubling, a guesser reaches the cap
  after 9 failures, while a typo costs one minute.
- `@nestjs/throttler`: an extra dependency for ~30 lines of code.
- No Argon2 queue: 50 parallel sign-ins would take 2.3 GB of memory.

**What can break and how to fix it.**

- Everyone gets 429 at once in production → the API sees the proxy's IP →
  `trust proxy` (task 23).
- Sign-in is slow under load → the queue → raise `ARGON2_MAX_CONCURRENT` if memory
  allows.
- `login_failures` grows → no cleanup job yet (task 27).
- A test that signs in many times gets 429 → raise `AUTH_RATE_LIMIT_PER_MINUTE` for that
  test app.

My first draft of the "owner from another IP" test expected 401 on all 9 failures, but
the 6th is correctly 429. I fixed the test before it ever passed. Three mutations
(no queue limit, pair without IP, always writing `last_seen`) were each caught by a test.

**Interview question on this topic.** Q: How do you stop password guessing without letting
an attacker lock out the real owner? A:

- Count failures per (account, IP) pair with a growing delay, so guessing from one
  address slows only that address.
- Separately, count failures per IP across all accounts (against spraying), and rate-limit
  requests.
- Lock a whole account only for distributed attacks, together with an e-mail and a reset
  link.
- Check the limits before hashing, so an attack cannot exhaust CPU and memory.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Anmeldung ist jetzt gegen das Durchprobieren von Passwörtern geschützt. Es gibt drei
Zähler:

- Für das Paar aus E-Mail und IP gilt: Nach 5 Fehlversuchen muss man warten, erst 1
  Minute, dann 2, 4, 8 Minuten, höchstens 15.
- Für eine IP gelten über alle Konten 50 Fehlversuche in 15 Minuten.
- Außerdem sind pro IP höchstens 20 Anmeldeanfragen pro Minute erlaubt.

Wer warten muss, bekommt den Status 429 mit dem Header `Retry-After`. Der Angreifer kann
den echten Besitzer nicht aussperren, weil der Zähler an E-Mail und IP hängt. Außerdem
laufen höchstens 4 Argon2-Berechnungen gleichzeitig, weil jede 46 MiB Speicher braucht;
die anderen warten in einer Schlange. Der Zeitpunkt der letzten Aktivität wird nur noch
höchstens alle 5 Minuten gespeichert. Alle Zahlen sind Einstellungen.

### Fachwortschatz

| Deutsch                          | English        | Русский                      |
| -------------------------------- | -------------- | ---------------------------- |
| die Drosselung                   | throttling     | ограничение попыток          |
| der Fehlversuch                  | failed attempt | неудачная попытка            |
| das Durchprobieren (Brute Force) | brute force    | перебор                      |
| das gleitende Zeitfenster        | sliding window | скользящее окно              |
| die Anfragebegrenzung            | rate limiting  | ограничение частоты запросов |
| die Warteschlange                | queue          | очередь                      |
| gleichzeitig                     | concurrent     | одновременно                 |
| die Sperre                       | lock           | блокировка                   |
| aussperren                       | to lock out    | заблокировать (не пустить)   |
| der Arbeitsspeicher              | memory (RAM)   | оперативная память           |
