# 030 · Task 4b: SignFlow loads its public settings before the start

Date: 2026-11-22 · Task: roadmap 4, part 4b — task 4 complete, [ADR-0009](../adr/0009-environments-and-configuration.md) · PR: — · Commits: after `f2568d3`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- Перед первой отрисовкой SignFlow запрашивает `GET /api/v1/config` и кладёт ответ в
  сервис `AppConfig`.
- Если сервер не ответил, приложение всё равно стартует: `AppConfig` в состоянии «нет
  настроек», причина записана в консоль.
- Переводы и настройки грузятся **одновременно**. Поэтому пустая страница висит не
  дольше 10 с, а не 10 + 10.

Термины:

- **Инициализатор приложения (app initializer)** — функция, которую Angular выполняет
  **до** первой отрисовки. Если она возвращает Promise, Angular ждёт его.
- **Сигнал (signal)** — значение, за которым Angular следит: когда оно меняется, экран
  обновляется. `asReadonly()` отдаёт сигнал только для чтения.
- **Фейковые таймеры (fake timers)** — подмена часов в тесте: «10 секунд» проходят
  мгновенно, по команде `advanceTimersByTimeAsync`.

**Зачем это нужно (аналогия из жизни).**
Перед открытием магазина нужно две вещи: включить свет (переводы) и узнать, какие сегодня
акции (настройки). Если делать по очереди и каждая может ждать до 10 минут, открытие
задержится на 20. Два сотрудника делают это одновременно, и худший случай — 10. А если
акции так и не прислали, магазин всё равно открывается, просто без акций.

**Как это работает, шаг за шагом.**

1. **`AppConfig`** (`apps/signflow/src/app/config/app-config.ts`):
   - `settings()` — сигнал только для чтения: `PublicConfigDto` (пока `{ version }`) или
     `undefined`, то есть «нет настроек»;
   - `load()` вызывает сгенерированный `ConfigService.getConfig()` с тайм-аутом. Он
     **никогда не отклоняется**: при ошибке пишет `[config] Could not load
/api/v1/config` в `console.error` и оставляет «нет настроек». Это правило
     «работающее важнее красивого» из 1b.
   - Экран, которому нужны настройки, сам покажет `errors.generic.network` (решение
     владельца). Сейчас таких экранов нет.
2. **`provideAppConfig()`** регистрирует инициализатор и подключён в `app.config.ts`
   рядом с `provideI18n()`.
3. **Параллельность.** Angular запускает все инициализаторы сразу и ждёт их вместе
   (`Promise.all`), так что отдельный код для этого не нужен. Но свойство легко сломать:
   достаточно, чтобы кто-то начал загрузку настроек «после переводов». Поэтому его
   держит тест.
4. **Один тайм-аут на всех** — `STARTUP_TIMEOUT_MS = 10_000` в
   `apps/signflow/src/app/startup-timeout.ts`. Им пользуются и переводы, и настройки, и
   обещание «худший случай 10 с» записано в одном месте.
5. Для тестов `@adlersoft/signflow-api-client/mocks` теперь экспортирует и MSW-моки
   `config`. Пример ответа берётся из контракта (`getGetConfigResponseMock`).

**Тесты: красный первым и мутации.**

- Красный первым: модуля `./app-config` нет, тест не компилируется. После реализации
  25/25.
- Тест «оба зависли» на фейковых таймерах:
  - браузер de-DE, оба запроса ушли сразу, никто не отвечает;
  - на 9 999 мс запуск ещё не закончен, на 10 000 мс — закончен;
  - `App` отрисовался, «нет настроек», в консоли причины `[i18n]` и `[config]`.
- **Мутация 1** — настройки начинают грузиться только через 10 с, то есть
  последовательно: тест красный («запрос ушёл сразу» — 0 вместо 1).
- **Мутация 2** — у настроек нет тайм-аута: запуск не заканчивается на 10 с, тест
  красный.
- e2e против настоящего API: `/api/v1/config` → 200 и `{ version }` из `package.json`,
  без ошибок в консоли. Если API ответил 503, приложение стартует, а в консоли
  `[config] …`. Мутация: `provideAppConfig()` закомментирован → оба теста красные.
  Вернули — 11/11.

**Находка — открытый вопрос владельцу.**
Внутри переводов цепочка последовательна (так сделано в 1b): сначала язык браузера, при
неудаче — запасной `de`, у каждого по 10 с. Если браузер en или ru, а сервер завис,
переводы ждут 10 + 10 = **20 с**. Параллельность с настройками это не ухудшает, но и
обещание «худший случай 10 с» для такого браузера не выполняется. Чинить не стал: это
меняет поведение 1b. Вариант — один общий срок 10 с на всю цепочку переводов. Решает
владелец.

**Какие были альтернативы и почему отказались.**

- `httpResource` для настроек, без инициализатора: экраны показывались бы до того, как
  настройки пришли. Каждому экрану пришлось бы обрабатывать «ещё грузится».
- Один инициализатор, который грузит переводы, а потом настройки: те самые 20 с.
- Положить настройки в `environment.ts` при сборке: запрещено ADR-0009. Одна сборка
  должна работать во всех окружениях.
- Страница ошибки вместо приложения: новый экран, нужны тексты и дизайн. Владелец выбрал
  «стартовать без настроек».

**Что может сломаться и как починить.**

- Симптом: в консоли `[config] Could not load /api/v1/config` → API не отвечает или
  прокси не пробрасывает `/api`. Проверить: `curl.exe -s http://localhost:4310/api/v1/config`.
- Симптом: красный тест «оба зависли» → кто-то сделал загрузки последовательными или
  убрал тайм-аут.
- Симптом: экран не видит новое поле настроек → поле добавлено на сервере, но клиент не
  перегенерирован (`nx run signflow-api-client:generate`).

**Вопрос с собеседования по этой теме.**

- В: Как SPA получает настройки окружения, если сборка одна на все окружения?
- О: Бандл не содержит значений окружения. Перед первой отрисовкой инициализатор
  запрашивает публичный `/config` и кладёт ответ в injectable-сервис с сигналом.
  Инициализаторы идут параллельно и с общим тайм-аутом, поэтому худший случай
  ограничен. Ошибка не блокирует старт: приложение работает в состоянии «нет настроек»,
  а экраны, которым они нужны, показывают понятное сообщение. Секретов в ответе нет: он
  публичен по определению.

## 🇬🇧 What and why (full)

**What was done.** Before the first render SignFlow requests `GET /api/v1/config` and
keeps the answer in the `AppConfig` service. If the server does not answer, the app
starts anyway: "no settings", with the reason in the console. Translations and settings
load at the same time, so a blank page lasts at most 10 s, not 10 + 10.

**Why (real-life analogy).** Opening a shop needs the lights on (translations) and
today's offers (settings). Done one after the other, each taking up to 10 minutes, the
shop opens 20 minutes late. Two people do them at once, and the worst case is 10. No
offers? The shop opens without them.

**How it works, step by step.**

1. `AppConfig.settings()` is a read-only signal: the `PublicConfigDto` or `undefined`.
2. `load()` calls the generated `ConfigService.getConfig()` with a timeout and never
   rejects. On failure it logs `[config] Could not load /api/v1/config`.
3. `provideAppConfig()` registers the app initializer next to `provideI18n()`.
4. Angular runs all initializers at once (`Promise.all`). A test protects this, because
   one "after translations" makes it sequential.
5. One shared `STARTUP_TIMEOUT_MS` (10 s) for translations and settings.
6. The `/mocks` entry point now also exports the generated config mocks.

**Red first and mutations.**

- Red first: the module was missing. Then 25/25.
- Fake-timer test: both requests are sent at once and hang. Not done at 9 999 ms, done at
  10 000 ms. The app renders with "no settings", and both reasons are logged.
- Mutation "sequential load" → red. Mutation "no timeout" → red.
- e2e against the real API: 200 with the version, no console errors; a 503 still starts
  the app and logs the reason. Mutation "provider removed" → both red. Then 11/11.

**Finding — open question for the owner.** Translations themselves are sequential (1b):
the browser language, then German as the fallback, 10 s each. With an en/ru browser and
a hanging server that is 20 s. Not changed here, because it alters 1b. One option is a
single 10 s deadline for the whole chain.

**Alternatives considered and why rejected.**

- `httpResource` without an initializer: every screen would have to handle "loading".
- One sequential initializer: 20 s.
- Build-time `environment.ts`: forbidden by ADR-0009.
- An error page: a new screen; the owner chose "start without settings".

**What can break and how to fix it.**

- `[config]` error in the console → the API or the `/api` proxy is down.
- The parallel test fails → loads became sequential, or a timeout is missing.
- A new field is not visible → regenerate the client.

**Interview question on this topic.** Q: How does an SPA get environment settings with
one build for all environments? A: The bundle holds none. An app initializer loads a
public `/config` into a signal-based service before the first render. Initializers run
in parallel with a shared timeout, so the worst case is bounded. A failure does not
block the start: the app runs with "no settings", and screens that need them show a
clear message.

## 🇩🇪 Kurzfassung (Niveau B1)

SignFlow lädt vor dem ersten Anzeigen die öffentlichen Einstellungen von der API. Sie
liegen im Service `AppConfig`, als Signal. Antwortet der Server nicht, startet die App
trotzdem, ohne Einstellungen; der Grund steht in der Konsole. Übersetzungen und
Einstellungen werden gleichzeitig geladen. Deshalb wartet man höchstens 10 Sekunden,
nicht 20. Ein Test mit simulierten Timern beweist das. Ein E2E-Test prüft die echte API.
Offen ist eine Frage an den Owner: Innerhalb der Übersetzungen kann das Warten noch
20 Sekunden dauern. Damit ist Aufgabe 4 fertig.

### Fachwortschatz

| Deutsch                   | English             | Русский                  |
| ------------------------- | ------------------- | ------------------------ |
| der App-Initialisierer    | app initializer     | инициализатор приложения |
| parallel laden            | load in parallel    | грузить параллельно      |
| nacheinander              | one after the other | последовательно          |
| die Zeitüberschreitung    | timeout             | тайм-аут                 |
| simulierte Timer          | fake timers         | фейковые таймеры         |
| öffentliche Einstellungen | public settings     | публичные настройки      |
| der ungünstigste Fall     | worst case          | худший случай            |
| die Konsole               | console             | консоль                  |
