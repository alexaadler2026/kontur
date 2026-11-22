# 029 · Task 4a: API settings checked at start, `/api/v1/config`

Date: 2026-11-22 · Task: roadmap 4, part 4a, [ADR-0009](../adr/0009-environments-and-configuration.md) · PR: — · Commits: after `2f7ae84`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- `signflow-api` читает настройки **один раз при старте**, проверяет их и отдаёт коду
  неизменяемый объект `AppConfig`.
- Неверная настройка **останавливает запуск** с понятным сообщением: процесс завершается
  с кодом 1 ещё до того, как Nest начнёт работать.
- Пока настройка одна — `PORT`. Механизм готов целиком: схема, проверка, остановка,
  lint-правило, `.env.example`.
- Новый endpoint `GET /api/v1/config` → `{ version }`. Это публичные настройки для SPA;
  фронт начнёт их читать в 4b.

Термины:

- **Переменная окружения** — именованное значение, которое операционная система или
  контейнер передаёт процессу при запуске: `PORT=3333`.
- **Схема настроек** — описание: какие настройки бывают, какого они типа и какие значения
  допустимы.
- **Значение по умолчанию** — значение, которое берётся, если переменная не задана.
- **`Object.freeze`** — делает объект неизменяемым: после этого его поля нельзя
  поменять.

**Зачем это нужно (аналогия из жизни).**
Пилот перед взлётом проходит чек-лист. Если датчик топлива показывает ерунду, самолёт
не взлетает, а не «полетит и разберётся». Так же и сервер: раньше `PORT=abc` превращался
в `NaN`, и Node падал где-то в глубине с непонятным `validatePort`. Теперь сервер прямо
говорит: `PORT must be an integer from 1 to 65535` — и не стартует.

**Как это работает, шаг за шагом.**

1. **Схема** — `ConfigSchema` в `apps/signflow-api/src/config/load-config.ts`. Это класс с
   декораторами class-validator: тот же язык, что у DTO, новых зависимостей нет.
   `@Type(() => Number)` превращает строку `"4310"` в число, а `@IsInt`, `@Min(1)` и
   `@Max(65535)` проверяют результат.
2. **Правило умолчаний** (решение владельца, записано в комментарии схемы и в ADR-0009):
   - **у секрета значения по умолчанию нет никогда**;
   - умолчание допустимо, только если значение одинаково во всех окружениях и безопасно.
     `PORT=3333` — внутренний порт контейнера, одинаковый везде, поэтому `nx serve`
     работает без файла `.env`;
   - всё остальное обязательно: нет значения — запуск остановлен.
3. **`loadConfig(env)`**:
   - берёт из окружения **только** переменные схемы, остальное (`PATH`, чужие секреты)
     игнорирует;
   - превращает строки в типы и проверяет;
   - возвращает замороженный объект. При ошибке бросает `ConfigError`: по строке на
     проблему.
   - В сообщении есть **имя переменной, но не значение**. Объекты ошибок class-validator
     содержат значение, поэтому берём только наши тексты. Это тот же принцип, что в 3a:
     в переменных бывают пароли.
4. **`main.ts`** вызывает `loadConfig()` **до** `NestFactory.create`. `ConfigError` →
   сообщение в stderr и `process.exit(1)`. Любая другая ошибка пробрасывается как есть:
   это уже не ошибка настройки.
5. **Lint-правило** `no-restricted-properties`: читать `process.env` в `src/` запрещено
   везде, кроме `load-config.ts` и тестов (тестам нужно задать окружение дочернему
   процессу). Иначе кто-нибудь однажды прочитал бы переменную в обход проверки.
6. **`.env.example`** в `apps/signflow-api/`. В нём каждая настройка с безобидным
   значением и комментарием. Тест сверяет: ключи файла **ровно** совпадают со схемой,
   ни одного дважды, а значения проходят проверку. Список ключей тест берёт из самой
   схемы (метаданные class-validator), а не из второго списка, который можно забыть
   обновить.
7. **`GET /api/v1/config`** → `PublicConfigDto { version }`. Ответ публичен по
   определению: его видит любой, кто открыл приложение. Поэтому тест проверяет его через
   `toEqual` — новое поле нельзя добавить «случайно», только осознанно. Контракт
   перегенерирован (`getConfig`), `api-check` следит за ним.
8. **Проверка опасных сочетаний** (`REGISTRATION_MODE=sandbox` + `MAIL_TRANSPORT=provider`)
   с одной настройкой невозможна. Записана в `next-steps.md` к той из задач 27 и 50, что
   придёт второй.

**Тесты: красный первым и мутации.**

- Юнит-тесты `loadConfig`: верное значение, отсутствие → 3333, замороженный объект,
  чужие переменные игнорируются, неверные `abc`, `""`, `0`, `65536`, `33.5`. Первый
  прогон красный: «Cannot find module './load-config.js'».
- **Тест запуска настоящего собранного `main.js`** с `PORT=abc`: код выхода 1, в stderr
  есть `PORT must be…` и нет `abc`, сервер не начал слушать. Красный прогон до правки
  показал старое поведение: `node:net … validatePort`. Цель `test` теперь зависит от
  `build`, а защитный тест проверяет, что сборка существует.
- Мутации `.env.example`: лишний ключ `EXTRA_SETTING` → красный с его именем;
  закомментированный `PORT` → красный с `"PORT"`.
- Мутация lint: файл с `process.env['HOME']` → ошибка `no-restricted-properties`.
- HTTP-тест `/config` сначала красный (404, нет операции в контракте), потом зелёный.
- Итог: 31/31 у `signflow-api`, e2e signflow 9/9.
- Находка: тест запуска сначала упал по тайм-ауту 5 с. Настоящий процесс грузит модули
  Nest, пока параллельно идут другие тесты. Тайм-аут теста поднят до 20 с, причина
  записана в коде. Требование при этом не менялось.

**Какие были альтернативы и почему отказались.**

- `@nestjs/config`: сам читает `.env`-файлы и раскладывает значения, это неявное
  поведение. К тому же настройки нужны **до** создания Nest. Своя функция короче и
  объяснима целиком.
- zod или joi: вторая библиотека проверки рядом с class-validator.
- Читать `process.env` где нужно: нет единой проверки, ошибка всплывёт поздно и
  непонятно.
- Сразу завести все настройки из ADR-0009: в ADR они названы условно, требований к ним
  ещё нет. Придумывать их — значит придумывать требования.

**Что может сломаться и как починить.**

- Симптом: сервер не стартует, `Invalid configuration … PORT must be…` → исправить
  переменную окружения.
- Симптом: CI красный, тест `.env.example` показывает лишний или недостающий ключ → в
  схему добавили или убрали настройку; обновить `.env.example` в том же коммите.
- Симптом: lint `'process.env' is restricted` → прочитать настройку через `AppConfig`,
  а новую добавить в схему.
- Симптом: тест запуска падает с «the build exists» → не собрана API; `nx run
signflow-api:test` собирает её сам (`dependsOn: build`).

**Вопрос с собеседования по этой теме.**

- В: Как вы работаете с конфигурацией в Node-сервисе?
- О: Сервис читает переменные окружения один раз при старте. Он проверяет их по схеме и
  отдаёт коду типизированный неизменяемый объект; прямой доступ к `process.env` запрещён
  lint-правилом. Неверная настройка останавливает запуск с сообщением, где названа
  переменная, но не её значение. У секретов умолчаний нет. Список настроек
  документирован в `.env.example`, и тест держит его в точном соответствии со схемой.
  Одна сборка работает во всех окружениях, разница только в настройках
  (twelve-factor).

## 🇬🇧 What and why (full)

**What was done.** `signflow-api` reads its settings once at start, validates them and
gives the code a frozen, typed `AppConfig`. A wrong setting stops the start with exit
code 1 before Nest starts. For now there is one setting, `PORT`, but the whole mechanism
is in place: schema, check, stop, lint rule, `.env.example`. The new endpoint
`GET /api/v1/config` returns `{ version }` (the SPA reads it in 4b).

**Why (real-life analogy).** A pilot's pre-flight checklist: a broken fuel gauge keeps the
plane on the ground. Before, `PORT=abc` became `NaN` and Node failed deep inside with
`validatePort`. Now the server says `PORT must be an integer from 1 to 65535` and does
not start.

**How it works, step by step.**

1. `ConfigSchema` is a class-validator class: the same language as the DTOs.
2. **Defaults** (owner's rule, also in the schema comment and ADR-0009): a secret never
   has a default. A default is allowed only when the value is the same in every
   environment and harmless (`PORT=3333`). Everything else is required.
3. `loadConfig(env)` reads only the schema's variables, converts and validates them, and
   returns a frozen object. On failure it throws `ConfigError` with one line per problem.
   The message names the variable, never its value.
4. `main.ts` loads the config before `NestFactory.create`; on a `ConfigError` it writes to
   stderr and exits with 1.
5. Lint: `process.env` is forbidden in `src/` except in `load-config.ts` and in tests.
6. A test keeps `.env.example` equal to the schema; the keys come from the schema's
   metadata.
7. `/config` → `PublicConfigDto { version }`, asserted with `toEqual`, so a new public
   field is always deliberate.
8. The dangerous-combination check waits for the second of `MAIL_TRANSPORT` (task 27) and
   `REGISTRATION_MODE` (task 50).

**Red first and mutations.**

- Unit tests were red first (missing module).
- The start-up test runs the real built `main.js` with `PORT=abc`. It was red first,
  showing the old `node:net validatePort` crash. It expects exit 1, the variable named,
  the value absent, and nothing listening.
- `.env.example` mutations: an extra key fails, and so does a missing key.
- Lint mutation: reading `process.env` fails.
- The `/config` test was red first.
- Result: 31/31 tests, e2e 9/9.
- The start-up test needed a 20 s timeout: a real process loads Nest while other files
  run.

**Alternatives considered and why rejected.**

- `@nestjs/config`: implicit `.env` loading, and the settings are needed before Nest
  exists.
- zod or joi: a second validation library.
- Scattered `process.env` reads: no single check.
- Inventing every setting from ADR-0009 now: invented requirements.

**What can break and how to fix it.**

- The start stops → fix the named variable.
- The `.env.example` test fails → update the file together with the schema.
- The lint rule fires → go through `AppConfig`.

**Interview question on this topic.** Q: How do you handle configuration in a Node
service? A: Read the environment once at start and validate it against a schema. Hand the
code a typed frozen object and forbid `process.env` elsewhere by lint. Fail fast with the
variable's name, never its value. Never give a secret a default. Document every setting
in `.env.example` and keep it equal to the schema by a test. One build for every
environment.

## 🇩🇪 Kurzfassung (Niveau B1)

Die API liest ihre Einstellungen jetzt einmal beim Start und prüft sie. Ist eine
Einstellung falsch, startet der Server nicht. Er beendet sich mit Code 1 und nennt den
Namen der Variable, aber nie ihren Wert. Im Moment gibt es nur eine Einstellung, den Port.
Geheimnisse bekommen nie einen Standardwert. Ein Standardwert ist nur erlaubt, wenn er
überall gleich und harmlos ist. Eine Lint-Regel verbietet, `process.env` an anderen
Stellen zu lesen. Die Datei `.env.example` listet genau die Einstellungen des Schemas; ein
Test prüft das. Der neue Endpunkt `/api/v1/config` liefert die öffentlichen Einstellungen
für das Frontend, zurzeit nur die Version.

### Fachwortschatz

| Deutsch               | English              | Русский                |
| --------------------- | -------------------- | ---------------------- |
| die Umgebungsvariable | environment variable | переменная окружения   |
| die Einstellung       | setting              | настройка              |
| der Standardwert      | default value        | значение по умолчанию  |
| das Geheimnis         | secret               | секрет                 |
| der Start bricht ab   | the start stops      | запуск останавливается |
| unveränderlich        | immutable            | неизменяемый           |
| der Exit-Code         | exit code            | код выхода             |
| öffentlich            | public               | публичный              |
