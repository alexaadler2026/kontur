# 039 · Sessions: sign in, who am I, sign out — with a cookie and a CSRF guard

Date: 2026-11-23 · Task: 7b, [ADR-0010](../adr/0010-authentication.md) · PR: — · Commits: after `80ea97a`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** У SignFlow API теперь есть вход и выход. Это один ресурс — «сессия»:

| Запрос                                       | Что делает | Ответ                                                         |
| -------------------------------------------- | ---------- | ------------------------------------------------------------- |
| `POST /api/v1/session` `{ email, password }` | вход       | 204 + cookie `__Host-sid`, или 401 `auth.invalid_credentials` |
| `GET /api/v1/session`                        | «кто я?»   | 200 `{ user: { id, email } }`, или 401 `auth.unauthenticated` |
| `DELETE /api/v1/session`                     | выход      | 204, cookie стёрта, строка в базе удалена                     |

Что добавлено:

- **миграция** `add_password_and_sessions`:
  - колонка `users.password_hash` (может быть пустой: приглашённый пользователь ещё не
    задал пароль, задача 10);
  - таблица `sessions` (хеш токена, пользователь, время создания, «последний раз видели»,
    абсолютный конец, браузер, IP);
- в `libs/shared/auth-server`:
  - `session.ts` — токен, его хеш, чтение cookie, правило «сессия ещё жива?»;
  - `cross-site.ts` — правило «запрос с чужого сайта?»;
- в `apps/signflow-api/src/session/`:
  - DTO;
  - `SessionService` (вход, поиск пользователя по токену, выход);
  - `SessionController`;
  - `SameOriginGuard` (защита от CSRF для всех маршрутов);
- **настройки** `SESSION_IDLE_DAYS` (7) и `SESSION_ABSOLUTE_DAYS` (30);
- **новые коды ошибок**:
  - `auth.invalid_credentials`, `auth.unauthenticated` (401);
  - `request.cross_site` (403);
  - тексты для них на de/en/ru;
- **контракт** `openapi.json`: операции `createSession`, `getSession`, `deleteSession`.

Термины:

- **сессия** — запись на сервере «этот браузер вошёл как такой-то пользователь»;
- **токен** — случайная строка, по которой сервер узнаёт сессию. Здесь 256 случайных бит,
  43 символа Base64url;
- **cookie** — маленькое значение, которое браузер сам прикладывает к каждому запросу на
  тот же сайт;
- **HttpOnly** — скрипты страницы не могут прочитать cookie (XSS её не украдёт);
- **Secure** — cookie уходит только по HTTPS;
- **SameSite=Lax** — браузер не прикладывает cookie к POST-запросам, пришедшим с чужого
  сайта;
- **префикс `__Host-`** — браузер примет cookie только с Secure, `Path=/` и без `Domain`,
  то есть она принадлежит ровно одному хосту;
- **CSRF** (подделка межсайтового запроса) — чужая страница заставляет ваш браузер
  отправить запрос на наш сайт, и браузер прикладывает вашу cookie;
- **guard** — класс Nest, который решает, пускать ли запрос к контроллеру. Срабатывает до
  проверки данных и до контроллера;
- **`Sec-Fetch-Site`** — заголовок, который ставит сам браузер (страница подделать его не
  может): `same-origin`, `same-site`, `cross-site` или `none`;
- **session fixation** (навязывание сессии) — злоумышленник заранее подкладывает жертве
  известный ему токен и ждёт, когда она войдёт.

**Зачем это нужно (аналогия из жизни).** Гардероб в театре:

- Вы сдаёте пальто (входите с паролем) и получаете номерок (cookie с токеном).
- Гардеробщик не записывает номерок в журнал как есть. Он записывает «отпечаток» номерка
  (SHA-256). Если журнал украдут, по отпечаткам пальто не получить.
- Номерок выдаётся новый при каждой сдаче (новый токен при каждом входе). Чужой
  «заранее подсунутый» номерок не сработает.
- Если номерком долго не пользоваться (7 дней) или прошёл месяц (30 дней), он сгорает.
- `SameOriginGuard` — охранник на входе. Он не пускает людей, которых прислали из
  соседнего здания, даже если у них в руках ваш номерок.

**Как это работает, шаг за шагом.**

1. **Вход.** `POST /session` приходит с e-mail и паролем.
   - `ValidationPipe` проверяет поля: пароль не длиннее 128 символов. Считаются кодовые
     точки после NFC, как в правилах пароля 7a. Это сделано до Argon2, чтобы огромный ввод
     не тратил память.
   - `SessionService.signIn` ищет пользователя: `citext` делает поиск без учёта регистра.
   - Пароль проверяется через `PasswordHasher.verify`.
   - Если пользователя нет, пароль всё равно проверяется — против **хеша-пустышки**
     (настоящий Argon2id от случайного пароля, создаётся один раз). Иначе ответ «такого
     e-mail нет» приходил бы за 1 мс, а «неверный пароль» за 80–300 мс, и по времени можно
     было бы узнать, у кого есть аккаунт.
   - Неверный пароль, неизвестный e-mail и аккаунт без пароля дают **одинаковый** ответ
     401 `auth.invalid_credentials`. Различается только `traceId`: он уникален для
     каждого запроса.
   - Если хеш сделан со старыми параметрами (`needsRehash`), он тут же пересчитывается с
     нынешними: пароль сейчас известен, другого такого момента не будет.
   - Создаётся новый токен (`createSessionToken`). В базу записывается **только его
     SHA-256**, браузеру уходит сам токен:
     `__Host-sid=<токен>; Max-Age=2592000; Path=/; HttpOnly; Secure; SameSite=Lax`.
2. **«Кто я?»** `GET /session`.
   - Токен читается из заголовка `Cookie` (`readSessionCookie`). Мусорное значение
     отбрасывается без запроса к базе.
   - Сервер ищет сессию по SHA-256 токена.
   - `isSessionActive` проверяет два срока: «видели меньше 7 дней назад» и «абсолютный
     конец ещё не наступил».
   - Сессия жива → `last_seen_at` = сейчас (срок «скользит»), ответ 200.
   - Сессия истекла → строка удаляется, ответ 401 `auth.unauthenticated`.
3. **Выход.** `DELETE /session` удаляет строку и отправляет cookie с пустым значением и
   датой 1970 года: браузер её стирает. Без сессии ответ тоже 204, повторный выход — не
   ошибка.
4. **CSRF.** `SameOriginGuard` зарегистрирован как `APP_GUARD`, то есть для всех маршрутов
   приложения. GET/HEAD/OPTIONS он пропускает: они ничего не меняют. Для
   POST/PUT/PATCH/DELETE:
   - есть `Sec-Fetch-Site` → пропускаются только `same-origin` и `none`. `same-site` тоже
     отклоняется: `beleg.<домен>` не должен действовать на `sign.<домен>`;
   - нет `Sec-Fetch-Site`, но есть `Origin` (старый браузер) → хост из `Origin` должен
     совпасть с заголовком `Host`;
   - нет ни одного (curl, скрипт) → это не браузер, пропускаем. Чужая страница не может
     заставить браузер отправить запрос без этих заголовков;
   - иначе 403 `request.cross_site`, ещё до проверки данных и до базы.

**Какие были альтернативы и почему отказались.**

- JWT в `localStorage` — уже отклонено в ADR-0010: XSS крадёт токен, отозвать его нельзя.
- Хранить в базе сам токен — утечка базы (бэкап, дамп) сразу дала бы рабочие сессии.
  SHA-256 достаточно: токен случайный и длинный, перебирать его бессмысленно, а Argon2
  тут лишь замедлил бы каждый запрос.
- CSRF-токен в каждой форме (synchronizer token) — нужен, когда API принимает запросы с
  разных сайтов. У нас API только для своего сайта, и Fetch Metadata проще: ничего не
  надо прокидывать во фронтенд.
- Отклонять запросы вообще без `Origin`/`Sec-Fetch-Site` — сломало бы curl, скрипты и
  будущую команду create-admin через HTTP, а защиты не добавило бы: браузер такой запрос с
  чужой страницы не отправит.
- `Max-Age` cookie = 7 дней (срок бездействия) — тогда браузер пришлось бы обновлять cookie
  при каждом запросе. Проще так: cookie живёт до абсолютного конца (30 дней), а 7 дней
  бездействия проверяет сервер по `last_seen_at`.

**Что может сломаться и как починить.**

- Симптом: вход в браузере проходит (204), но `GET /session` сразу даёт 401. → Причина:
  страница открыта по `http://` (не localhost), и браузер не сохраняет cookie с `Secure`.
  → Что делать: работать через HTTPS или `localhost` (браузеры считают его безопасным).
- Симптом: на сервере все POST получают 403 `request.cross_site`. → Причина: прокси
  подменяет `Host` (старый браузер без `Sec-Fetch-Site` сравнивает `Origin` с `Host`). →
  Что делать: прокси должен передавать `Host` без изменений (Caddy делает так по
  умолчанию; задача 23).
- Симптом: в сессиях записан IP прокси, а не клиента. → Причина: `trust proxy` не
  настроен. → Что делать: задача 23 (запланировано).
- Симптом: тест сравнивает два ответа об ошибке через `toEqual` и падает. → Причина:
  `traceId` уникален у каждого ответа. → Что делать: сравнивать с
  `traceId: expect.any(String)`. На этом споткнулся мой первый вариант теста; код был
  верный, ошибка была в тесте, который ещё ни разу не проходил.

**Вопрос с собеседования по этой теме.**

- В: Почему сессионный токен в базе хешируется SHA-256, а пароль — Argon2id? Почему не
  одинаково?
- О: Пароль придумывает человек, он короткий и предсказуемый, поэтому его хеш нужно делать
  медленным и требующим памяти (Argon2id), чтобы перебор по словарю был дорогим. Токен —
  256 случайных бит: перебрать 2^256 вариантов невозможно и с быстрым хешем. Медленный
  хеш здесь только тормозил бы каждый запрос. SHA-256 защищает от другого — от утечки
  базы: по хешу нельзя получить токен для cookie.

### Как проверить руками (PowerShell)

```powershell
# 1. Тесты библиотеки (сессия + CSRF): ожидается "Tests  38 passed (38)"
pnpm nx run auth-server:test

# 2. HTTP-тесты API без базы: ожидается "Tests  56 passed (56)"
pnpm nx run signflow-api:test

# 3. Интеграционные тесты на настоящем PostgreSQL (нужен запущенный Docker Desktop):
#    ожидается "Tests  23 passed (23)", из них 13 в session.int-spec.ts
pnpm nx run signflow-api:test-integration

# 4. Вживую: база, миграция, API
docker compose -f compose.dev.yaml up -d postgres
pnpm nx run signflow-api:prisma-migrate-deploy
pnpm nx run signflow-api:serve          # в отдельном окне

# Без cookie → {"type":"urn:kontur:problem:auth.unauthenticated",…,"status":401,…}
curl.exe -s http://localhost:3333/api/v1/session
# С чужого сайта → {…"code":"request.cross_site",…"status":403,…}
curl.exe -s -X DELETE -H "Sec-Fetch-Site: cross-site" http://localhost:3333/api/v1/session
# Неверные данные → {…"code":"auth.invalid_credentials",…"status":401,…}
# (пароль без пробелов и умлаутов: Windows PowerShell 5.1 ломает такой аргумент для curl.exe)
curl.exe -s -X POST -H "Content-Type: application/json" -d '{\"email\":\"nobody@firma.kg\",\"password\":\"wrong-password-12345\"}' http://localhost:3333/api/v1/session
```

Все три команды проверены на живом сервере 2026-11-23.

Успешный вход руками станет возможен после задачи 7d (команда create-admin). До неё его
проверяют интеграционные тесты.

## 🇬🇧 What and why (full)

**What was done.** SignFlow API can now sign users in and out. It is one resource, the
session:

- `POST /api/v1/session` `{ email, password }` → 204 + `__Host-sid` cookie, or 401
  `auth.invalid_credentials`;
- `GET /api/v1/session` → 200 `{ user: { id, email } }`, or 401 `auth.unauthenticated`;
- `DELETE /api/v1/session` → 204, the row deleted and the cookie cleared.

New pieces:

- the migration `add_password_and_sessions` (`users.password_hash`, nullable; table
  `sessions`);
- `session.ts` and `cross-site.ts` in `libs/shared/auth-server`;
- in signflow-api: DTOs, `SessionService`, `SessionController` and a global
  `SameOriginGuard`;
- the settings `SESSION_IDLE_DAYS` = 7 and `SESSION_ABSOLUTE_DAYS` = 30;
- three problem codes with de/en/ru texts;
- the contract operations `createSession`, `getSession` and `deleteSession`.

**Why (real-life analogy).** A theatre cloakroom:

- You hand in your coat (sign in) and get a ticket (the cookie token).
- The attendant writes only a fingerprint of the ticket (SHA-256) into the book. A stolen
  book returns no coats.
- Every visit gets a fresh ticket (no session fixation).
- Tickets expire after 7 idle days or 30 days in total.
- The guard at the door turns away people sent from the building next door (CSRF).

**How it works, step by step.**

1. **Sign-in.**
   - The validation pipe caps the password at 128 NFC code points before Argon2 runs.
   - The user is looked up case-insensitively (citext) and the password verified.
   - An unknown e-mail is verified against a dummy Argon2id hash, so the timing does not
     reveal which accounts exist.
   - All failures give the identical 401 body (apart from the per-request `traceId`).
   - An outdated hash is re-hashed on the spot (`needsRehash`).
   - A new random 256-bit token goes into the cookie. Only its SHA-256 is stored.
2. **Who am I.**
   - The cookie is parsed; junk is ignored without a query.
   - The session is found by hash and checked against both lifetimes.
   - If active, `last_seen_at` moves to now (sliding).
   - If ended, the row is deleted and the answer is 401.
3. **Sign-out.** The row is deleted and the cookie is cleared (an `Expires` date in 1970).
   The answer is 204 even without a session.
4. **CSRF.** A global guard leaves GET/HEAD/OPTIONS alone. For state-changing methods:
   - With `Sec-Fetch-Site`, only `same-origin` and `none` pass. `same-site` is rejected
     too, because beleg.\* must not act on sign.\*.
   - Without it, the `Origin` host must equal `Host`.
   - With neither header the request is not from a browser and is allowed.
   - Otherwise the answer is 403 `request.cross_site`, before validation and before any
     query.

**Alternatives considered and why rejected.**

- JWT in localStorage (ADR-0010): it is stealable by XSS and cannot be revoked.
- Storing the raw token: a leaked database would hand out live sessions.
- Argon2 for tokens: pointless for 256 random bits, and it would slow every request.
- Synchronizer CSRF tokens: more moving parts. Fetch Metadata is enough for a
  same-origin API.
- Rejecting requests without both headers: it would break curl and scripts and add no
  protection.
- A 7-day cookie `Max-Age` with renewal on every request: more work. The server enforces
  the idle timeout through `last_seen_at`.

**What can break and how to fix it.**

- Sign-in works but who-am-I says 401 over plain http (not localhost) → a Secure cookie is
  not stored → use HTTPS or localhost.
- Every POST is rejected behind a proxy → the proxy rewrites `Host` → pass `Host` through
  (task 23).
- The stored IP is the proxy's → `trust proxy` (task 23).
- Comparing two error bodies with `toEqual` fails → `traceId` is unique per request →
  compare with `traceId: expect.any(String)`. My first draft of the test had this bug; the
  code was right.

**Interview question on this topic.** Q: Why is the session token hashed with SHA-256 but
the password with Argon2id? A: A password is short and human-chosen, so its hash must be
slow and memory-hard to make dictionary attacks expensive. A token is 256 random bits:
brute force is impossible even against a fast hash, and a slow one would only slow every
request. SHA-256 protects against a database leak: the stored value cannot be turned back
into a usable cookie.

## 🇩🇪 Kurzfassung (Niveau B1)

Die SignFlow-API hat jetzt eine Anmeldung und eine Abmeldung. Es gibt eine Ressource, die
Sitzung: POST meldet an, GET sagt, wer angemeldet ist, und DELETE meldet ab. Nach der
Anmeldung bekommt der Browser ein Cookie mit einem zufälligen Token. Die Datenbank
speichert nur den SHA-256-Hash dieses Tokens, nicht das Token selbst. Bei jeder Anmeldung
gibt es ein neues Token. Eine Sitzung endet nach 7 Tagen ohne Aktivität oder spätestens
nach 30 Tagen. Beide Werte sind Einstellungen. Ein falsches Passwort und eine unbekannte
E-Mail-Adresse bekommen dieselbe Antwort, die auch ungefähr gleich lange dauert. Ein
globaler Guard lehnt ändernde Anfragen von fremden Websites mit 403 ab (CSRF-Schutz über
`Sec-Fetch-Site` und `Origin`). Die wichtigste Entscheidung: Fetch-Metadata-Header statt
CSRF-Tokens, weil die API nur von der eigenen Website benutzt wird.

### Fachwortschatz

| Deutsch                                          | English                    | Русский                       |
| ------------------------------------------------ | -------------------------- | ----------------------------- |
| die Sitzung                                      | session                    | сессия                        |
| die Anmeldung / die Abmeldung                    | sign-in / sign-out         | вход / выход                  |
| das Sitzungs-Cookie                              | session cookie             | сессионная cookie             |
| die websiteübergreifende Anfragefälschung (CSRF) | cross-site request forgery | подделка межсайтового запроса |
| der Hashwert                                     | hash value                 | хеш                           |
| die Inaktivitätszeit                             | idle timeout               | срок бездействия              |
| die absolute Laufzeit                            | absolute lifetime          | абсолютный срок жизни         |
| die Sitzungsfixierung                            | session fixation           | навязывание сессии            |
| die Zugangsdaten                                 | credentials                | учётные данные                |
| der Wächter (Guard)                              | guard                      | охранник (guard)              |
