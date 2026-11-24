# 045 · Задача 8-2: auth-client — хранилище сессии, guard'ы, обработка 401

Date: 2026-11-24 · Task: 8-2 (plan `docs/plans/044-sign-in.md`) · PR: — · Commits: `7539b5d`…`01d934f`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

1. Коммит `ci:` — жёсткие пределы по времени (твоё требование после зависания на 65 минут):
   - у каждого webServer в Playwright есть имя и предел 2 минуты;
   - на весь прогон — 10 минут;
   - у `readyWhen` в Nx тоже 2 минуты (по умолчанию было 10).

   Проверено: если сервер e2e «завис», прогон краснеет через 158 с с понятной причиной.
   Пределы у job'ов CI уже были (30 и 10 минут).

2. Новая библиотека `libs/shared/auth-client` — браузерная часть входа, общая для SignFlow
   и Belegscan:
   - `SessionStore` — кто сейчас вошёл;
   - `authGuard` и `guestGuard` — пускать ли на страницу;
   - `sessionExpiredInterceptor` — что делать, если сессия кончилась посреди работы;
   - `safeReturnUrl` — защита от подмены адреса возврата.

   К приложению библиотека подключится в 8-3 вместе с экраном входа.

**Зачем это нужно (аналогия из жизни).**
Пропускная система в офисе:

- `SessionStore` — журнал на вахте: «Анна вошла»;
- `authGuard` — турникет: без пропуска отправляет к стойке оформления (`/login`) и
  запоминает, куда человек шёл;
- `guestGuard` — у стойки оформления: «у вас уже есть пропуск, проходите»;
- interceptor — охранник, который, увидев просроченный пропуск у человека в коридоре,
  вежливо провожает его к стойке и говорит «пропуск истёк».

**Как это работает, шаг за шагом.**

1. **Термины.** **SignalStore** (NgRx) — хранилище состояния на сигналах: `status` и
   `user` — это сигналы, их читает любой компонент. **Guard** — функция, которую роутер
   вызывает перед открытием страницы. **Interceptor** — функция, через которую проходит
   каждый HTTP-запрос.
2. **Библиотека не знает про SignFlow.** Она просит у приложения адаптер `SessionApi` с
   тремя вызовами (`get`, `create`, `delete`). SignFlow сделает его поверх своего
   сгенерированного клиента, а Belegscan — поверх своего.
3. **`load()`:**
   - `GET /session` отвечает 200 → `signedIn`, 401 → `signedOut`;
   - нет ответа или 500 → остаётся `unknown`, и следующий вызов спросит снова: на догадку
     мы не полагаемся;
   - параллельные вызовы (guard'ы нескольких маршрутов при старте) ждут **один** общий
     запрос.
4. **`signIn()`.** `POST` ставит cookie и отвечает 204 без тела, поэтому сразу за ним идёт
   `GET` — узнать, кто вошёл. Ошибка уходит экрану как есть: экран сам решит, что
   показать (401, 429, 503).
5. **`authGuard`.** Без сессии → `/login?returnUrl=/dokumente/42`. В адресе только путь с
   id, никаких личных данных (ADR-0008).
6. **`guestGuard`.** Вошедший, который открыл `/login`, сразу идёт дальше — на
   `returnUrl`, но только если это **внутренний** путь.
7. **`safeReturnUrl`** отклоняет `https://…`, `//host`, `/\host` (браузеры читают оба как
   другой сайт), `javascript:`, пустое и управляющие символы. Иначе это **открытый
   редирект**: ссылка «войдите в SignFlow» после входа уводила бы на чужую страницу,
   похожую на нашу.
8. **Interceptor.** 401 на любой запрос, кроме самого `/session`, и только если человек
   _был_ вошедшим:
   - хранилище переходит в `signedOut`;
   - переход на `/login` с `returnUrl` и пометкой `sessionExpired` в `state` навигации,
     не в URL (твоё решение);
   - тот, кто делал запрос, всё равно получает свою ошибку.
9. **Мелочь, которая ломается молча:** `inject()` в guard'е вызывается _до_ первого
   `await`. После `await` контекста внедрения зависимостей уже нет.

**Проверено.**

- Тесты сначала красные (модулей нет), потом зелёные: 35 тестов (хранилище, guard'ы через
  настоящий роутер, interceptor, `safeReturnUrl`).
- 8 мутаций, все пойманы: общий запрос, «любая ошибка = вышел», 401 от `/session`,
  редирект без сессии, `//`, `/\`, guest guard без проверки, без `returnUrl`.
- **Найдено мутацией.** Тест «401 без входа → ничего не происходит» проверял адрес сразу,
  а переход роутера асинхронный. Мутация «редирект всегда» прошла незамеченной. Теперь
  тесты «ничего не происходит» ждут один тик, и мутация краснеет.
- `CI=true nx affected -t lint test build typecheck e2e` по 15 проектам — зелёное, плюс
  проверки тегов и границ модулей.
- Руками пока смотреть нечего: экран появится в 8-3. Тесты библиотеки:
  ```powershell
  pnpm nx run auth-client:test
  ```
  Ожидается: `Tests  35 passed (35)`.

**Какие были альтернативы и почему отказались.**

- Проверять сессию в `APP_INITIALIZER` перед стартом. Отказались: старт ждал бы сеть, а
  guard спрашивает только когда нужно, и один раз.
- Пометка «сессия истекла» в URL (`?expired=1`). Отказались по твоему решению: адрес
  остаётся чистым, а перезагрузка честно убирает старое сообщение.
- Своё состояние на голых `signal()`. Отказались: правило репозитория — NgRx SignalStore
  по фичам.

**Что может сломаться и как починить.**

- Симптом: `NG0203: inject() must be called from an injection context` в guard'е. →
  Причина: `inject()` после `await`. → Что делать: все `inject()` в начале функции.
- Симптом: pnpm ставит библиотеку как пакет и ругается на `node_modules`. → Причина:
  `libs/shared/*` в `pnpm-workspace.yaml` захватывает её `package.json` (он нужен только
  ng-packagr). → Что делать: держать исключение `!libs/shared/auth-client`.
- Симптом: 401 на вход показывает «сессия истекла». → Причина: путь сессии в
  `provideAuthClient` не совпадает с API. → Что делать: проверить `sessionPath`.

**Вопрос с собеседования по этой теме.**

- В: Что такое открытый редирект и почему `startsWith('/')` недостаточно?
- О: Это когда приложение после действия перенаправляет на адрес из параметра, не
  проверив его, и злоумышленник подсовывает свой сайт. `//evil.example` и
  `/\evil.example` начинаются с `/`, но браузер читает их как адрес другого хоста. Поэтому
  нужен разрешённый формат (внутренний путь), а не запрет «плохих» строк по одной.

## 🇬🇧 What and why (full)

**What was done.**

- A `ci:` commit adds hard limits:
  - every Playwright webServer gets a name and 2 minutes;
  - every suite gets a 10-minute `globalTimeout`;
  - the Nx `readyWhen` timeout is 2 minutes (the default was 10).

  A hanging e2e server now fails in 158 s with a clear reason. The CI jobs already had
  `timeout-minutes`.

- The new library `libs/shared/auth-client`: `SessionStore` (NgRx SignalStore),
  `authGuard` / `guestGuard`, `sessionExpiredInterceptor` and `safeReturnUrl`. The app
  supplies a `SessionApi` adapter; wiring into SignFlow comes in 8-3.

**Why (real-life analogy).** An office pass system:

- the store is the logbook at the desk;
- `authGuard` is the turnstile that sends you to registration and remembers where you
  were going;
- `guestGuard` waves through someone who already has a pass;
- the interceptor is the guard who walks a person with an expired pass back to the desk.

**How it works, step by step.**

1. `load()`: 200 → `signedIn`, 401 → `signedOut`; no answer or 5xx keeps `unknown`, so
   the next call retries. Parallel callers share one request.
2. `signIn()` is POST (204, cookie), then GET for the user; errors are passed through.
3. `authGuard` → `/login?returnUrl=<path>`; `guestGuard` → `safeReturnUrl`.
4. `safeReturnUrl` refuses `https://`, `//`, `/\`, `javascript:`, empty strings and
   control characters.
5. The interceptor acts on a 401 from anything but `/session`, only while signed in: it
   marks the store signed out and navigates to `/login` with `returnUrl` and
   `state.sessionExpired`. The caller still receives its error.
6. Every `inject()` comes before the first `await`.

**Verification.**

- Red first, then 35 tests green.
- 8 mutations are caught. One of them exposed a weak test: it asserted before the
  asynchronous navigation; now it waits a tick.
- `nx affected -t lint test build typecheck e2e` is green.

**Alternatives considered and why rejected.**

- An app initializer: it delays the start.
- The expiry mark in the URL: rejected by the owner.
- Bare signals: the repo rule is a SignalStore per feature.

**What can break and how to fix it.**

- `inject()` after `await` → NG0203.
- The workspace glob catching the library's `package.json` → keep the exclusion.
- A wrong `sessionPath` → sign-in failures look like expiries.

**Interview question on this topic.** Q: What is an open redirect, and why is
`startsWith('/')` not enough? A: Redirecting to an unchecked address from a parameter.
`//evil.example` and `/\evil.example` start with `/` but are read as another host, so
allow a known-good format instead of blocking bad strings one by one.

## 🇩🇪 Kurzfassung (Niveau B1)

Zuerst gibt es harte Zeitgrenzen für E2E-Tests: Ein hängender Server führt jetzt nach
etwa zweieinhalb Minuten zu einem roten Ergebnis, nicht nach einer Stunde. Dann haben wir
die Bibliothek `auth-client` gebaut. Der `SessionStore` weiß, wer angemeldet ist, und
fragt dafür den Server nur einmal. Der `authGuard` schickt Personen ohne Sitzung zur
Anmeldung und merkt sich die Zieladresse. Diese Adresse wird geprüft: Nur Pfade innerhalb
der App sind erlaubt, sonst wäre eine offene Weiterleitung möglich. Der Interceptor
reagiert auf eine 401-Antwort während der Arbeit: Er meldet die Person ab und zeigt die
Anmeldung mit dem Hinweis „Sitzung abgelaufen“. Die Bibliothek kennt keine App; jede App
gibt ihr einen kleinen Adapter.

### Fachwortschatz

| Deutsch                       | English          | Русский             |
| ----------------------------- | ---------------- | ------------------- |
| die Sitzung                   | session          | сессия              |
| der Wächter (Guard)           | route guard      | guard маршрута      |
| der Abfangjäger (Interceptor) | HTTP interceptor | interceptor         |
| die offene Weiterleitung      | open redirect    | открытый редирект   |
| die Rücksprungadresse         | return URL       | адрес возврата      |
| die Zeitüberschreitung        | timeout          | превышение времени  |
| der Zustandsspeicher          | state store      | хранилище состояния |
| der Adapter                   | adapter          | адаптер             |
