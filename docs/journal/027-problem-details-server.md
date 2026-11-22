# 027 · Task 3a: Problem Details (RFC 9457) on the server

Date: 2026-11-22 · Task: roadmap 3, part 3a, [ADR-0008](../adr/0008-api-conventions-and-money.md) · PR: — · Commits: after `18c4ca4`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Любая ошибка `signflow-api` теперь уходит в одном формате — **Problem Details**
(RFC 9457), `Content-Type: application/problem+json`:

```json
{ "type": "urn:kontur:problem:validation.invalid", "title": "The request failed validation", "status": 422, "code": "validation.invalid", "instance": "/api/v1/probe", "traceId": "…uuid…", "errors": [{ "pointer": "/email", "code": "validation.email", "params": {} }] }
```

Коды берутся из одного реестра и попадают в контракт как enum `ProblemCode`, а значит,
и в сгенерированный клиент. Фронт будет переводить `code` (это 3b). `title` — английский,
только для разработчиков.

Термины:

- **Problem Details (RFC 9457)** — стандарт IETF: как API описывает ошибку в JSON.
- **Фильтр исключений (exception filter)** — код Nest, который ловит любую ошибку при
  обработке запроса и решает, какой ответ отправить.
- **JSON Pointer (RFC 6901)** — адрес поля внутри JSON: `/signers/0/email` — «поле
  email первого подписанта».
- **`traceId`** — уникальный номер ошибки. Пользователь называет его, разработчик
  находит строку в логе.

**Зачем это нужно (аналогия из жизни).**
Раньше каждая ошибка приходила «своим почерком»: Nest писал `{statusCode, message}`, а
текст был английский, со словами из кода. Теперь все ошибки — бланк одной формы. В графе
«код» стоит номер из справочника, а перевод на нужный язык приложение подставляет само.

**Как это работает, шаг за шагом.**

1. **Реестр** `problem/problem-codes.ts`: код → HTTP-статус и английский `title`. Шесть
   кодов: `validation.invalid`, `validation.required`, `validation.email`,
   `request.malformed`, `request.not_found`, `server.internal`. По решению владельца лежит
   в приложении, в задаче 6 переедет в `libs/shared/api-kit`.
2. **`ValidationPipe` → `ProblemException`.** Вместо стандартного 400 Nest `exceptionFactory`
   бросает наше исключение с кодом `validation.invalid` и списком полей.
   `toFieldErrors()` обходит дерево ошибок class-validator и строит **одну запись на
   поле**: указатель, код, `params`. Правила: `isNotEmpty`/`isDefined` →
   `validation.required`, `isEmail` → `validation.email`, остальные →
   `validation.invalid`. Если поле пустое, побеждает «обязательно»: сначала заполнить,
   потом остальное.
3. **Введённое значение никуда не копируется** (требование владельца). class-validator
   кладёт его в `ValidationError.value`, а весь объект — в `target`. `toFieldErrors()`
   читает только имя поля и названия правил.
4. **`ProblemFilter`** (`@Catch()`, глобальный): `ProblemException` → свой код; 404 →
   `request.not_found`; другие 4xx (в том числе битый JSON) → `request.malformed`; всё
   остальное → 500 `server.internal`. Тело собирается **только из реестра**: ни текста
   исключения, ни stack trace. `instance` — путь без query string.
5. **Лог** — только для 500: `traceId=… POST /api/v1/… 500` плюс stack. Тот же
   `traceId` в ответе. Тела запроса и query string в логе нет (ADR-0020).
6. **Контракт.** `ProblemDetailsDto`/`ProblemFieldErrorDto` описывают схему.
   `implements ProblemBody` связывает их с телом из фильтра: поле, добавленное только с
   одной стороны, не скомпилируется. В `createOpenApiDocument` каждой операции один раз
   добавляется ответ `default` → `application/problem+json`, так что ни один endpoint не
   «забудет» его. Тест контракта требует `example` у каждого поля — они есть.
7. **Типы Express без зависимости.** `@types/express` в `signflow-api` не виден (pnpm не
   поднимает пакеты наверх). Фильтру нужны всего `method`, `originalUrl`, `status`,
   `type` и `json`, поэтому описал два маленьких интерфейса.

**Тесты: красный первым и мутации.**

- HTTP-тест с **тестовым контроллером и DTO внутри теста**: в SignFlow ещё нет endpoint'а
  с вводом, придумывать его нельзя. Сначала 6/6 красные, потом зелёные:
  - 422: поля `/email`, `/password` (пустое → `validation.required`),
    `/signers/0/email` (вложенный указатель);
  - правило без своего кода → `validation.invalid`; лишнее поле `isAdmin` → отклонено;
  - **секрет не утекает**: значение пароля нет ни в теле ответа, ни в строках лога;
  - битый JSON → 400 `request.malformed`; неизвестный маршрут → 404 без query string
    (`?email=…` не попадает в ответ);
  - исключение `'database password is hunter2'` → 500 без этого текста, `traceId` из
    ответа есть в строке лога.
- Тест контракта: ответ `default` у операции; `ProblemCode` = список реестра.
- `api-check` сразу показал устаревший контракт («first difference at line 25») —
  перегенерировали.
- **Мутация 1** — положить `error.value` в `params` → 3 теста красные, в том числе «секрет
  не утекает».
- **Мутация 2** — писать в лог текст каждой ошибки. **Первый раз она выжила** — см.
  историю ниже. После усиления теста — красный.
- e2e (настоящая цепочка через прокси): `GET /api/v1/does-not-exist` → 404,
  `application/problem+json`, `request.not_found`. Мутация: без фильтра → «Received:
  application/json». С фильтром 9/9.
- Два моих новых теста поправлены до коммита. Это не подгонка: в первом порядок записей
  `errors[]` (class-validator ставит «лишнее поле» первым) — порядок не входит в контракт,
  фронт ищет по указателю. Во втором swagger кладёт `$ref` в `allOf` рядом с `example` —
  смысл тот же.

**История мутации 2 (что случилось → как нашли → как исправили → урок).**

- **Что случилось.** Тест «битый JSON не попадает в лог» отправлял `{"password":
"Geheim-Passwort-42!"` (без закрывающей скобки) и искал секрет целиком. Мутация «писать в
  лог текст ошибки» тест не уронила.
- **Как нашли.** Посмотрели, что пишет V8: для обрезанного JSON — «Expected ',' or '}' …
  at position 34», без куска ввода. А для значения без кавычек — `Unexpected token 'G',
..."assword": Geheim-Pas"... is not valid JSON`: **кусок ввода есть, но обрезанный**.
  Секрет целиком в лог не попадал никогда, поэтому тест был зелёным даже с утечкой.
- **Как исправили.** Тело теста — значение без кавычек (тогда V8 цитирует ввод), а
  проверка ищет фрагмент `Geheim`, который всегда попадает в цитату. Мутация теперь
  красная.
- **Урок.** Тест на утечку должен искать то, что реально может утечь, — часть значения,
  а не всё значение. Без мутации мы бы не узнали, что тест ничего не ловит.

**Открытые решения (для владельца).**

- Код верхнего уровня при ошибке валидации — **`validation.invalid`** (одна запись на
  форму, текст «Bitte überprüfen Sie diese Eingabe.»). Отдельного кода в утверждённом
  списке не было; если нужен свой (например, `validation.failed` с текстом для формы),
  это одна строка в реестре и один ключ.
- Любой другой 4xx Nest/Express (413, 415 …) пока → `request.malformed`. Свои коды — с
  первым endpoint'ом загрузки (ADR-0008, Results 3a).

**Какие были альтернативы и почему отказались.**

- Оставить формат Nest и переводить `message` на фронте: текст английский и из кода,
  меняется с версией библиотеки; ADR-0008 требует стабильные коды.
- Декоратор ответа-ошибки на каждом endpoint'е: легко забыть; общий `default` в одном
  месте надёжнее.
- Копировать `constraints` (тексты class-validator) в ответ: английские, со словами из
  кода, иногда со значением. Только коды.
- Логировать каждую ошибку 4xx: шум, и в тексте ошибки разбора JSON бывает кусок ввода.

**Что может сломаться и как починить.**

- Симптом: `api-check` красный после изменения реестра → `pnpm nx run
signflow-api:openapi`, закоммитить контракт.
- Симптом: новое правило class-validator показывает «Bitte überprüfen …» вместо точного
  текста → добавить правило в `RULE_CODES` и код в реестр (и перевод в 3b).
- Симптом: ошибка 500 без строки в логе → исключение поймано раньше фильтра (например, в
  middleware): проверить, что `configureApp` вызывается.

**Вопрос с собеседования по этой теме.**

- В: Как API сообщает об ошибках валидации и что не должно попасть в ответ?
- О: RFC 9457 Problem Details со стабильным кодом из реестра (он же enum в OpenAPI) и
  массивом `errors[]`: JSON Pointer на поле, код правила, параметры. Текст переводит
  фронт. В ответ и лог не попадают введённые значения (class-validator держит их в
  `value` — мы их не копируем), stack trace и тексты исключений. 500 пишется в лог с
  тем же `traceId`, что в ответе. Проверено тестами и мутациями, включая утечку
  обрезанного куска ввода из ошибки разбора JSON.

## 🇬🇧 What and why (full)

**What was done.** Every error of `signflow-api` is now RFC 9457 Problem Details
(`application/problem+json`) with a stable `code` from one registry; the codes are the
`ProblemCode` enum of the contract and therefore of the generated client. `title` is
English, for developers only; the frontend will translate `code` (3b).

**Why (real-life analogy).** Errors used to arrive in "different handwriting"; now they are
one form with a code from a catalogue, and the app fills in the text in the user's
language.

**How it works, step by step.** Registry `problem/problem-codes.ts` (six codes; moves to
`libs/shared/api-kit` in task 6). The `ValidationPipe`'s `exceptionFactory` throws a
`ProblemException('validation.invalid', toFieldErrors(errors))`: one entry per field
(JSON Pointer, code, params), rules mapped to codes, "required" wins. The sent value
(`ValidationError.value`) and `target` are never copied. `ProblemFilter` (`@Catch()`):
own code for `ProblemException`, 404 → `request.not_found`, other 4xx →
`request.malformed`, anything else → 500 `server.internal`; the body comes from the
registry only; `instance` drops the query string. Only a 500 is logged, with the response's
`traceId`, method, path, status and stack. `ProblemDetailsDto` implements the filter's body
type, and `createOpenApiDocument` adds a `default` problem response to every operation.
Two small interfaces replace `@types/express`, which pnpm does not expose to the app.

**Red first and mutations.** HTTP tests with a test-only controller and DTOs (no endpoint
with input exists yet): 422 with nested pointers, rules without a code, a rejected extra
property, no leaked password in body or logs, malformed JSON, unknown route without the
query, a crash without internals and with the `traceId` in the log. Contract tests:
`default` response, `ProblemCode` = registry. `api-check` caught the outdated contract
immediately. Mutation 1 (copy `value` into `params`) → red. Mutation 2 (log every error
message) first **survived**: V8 quotes only a slice of the input ("…assword": Geheim-Pas…"),
and the test searched for the full secret; with an unquoted value and the fragment `Geheim`
it is red. E2E: `GET /api/v1/does-not-exist` through the proxy → 404 problem+json; without
the filter → red. Two of the new tests were adjusted before commit for incidental details
(entry order, `allOf` around `$ref`), not to make code pass.

**Open decisions (for the owner).** Top-level validation code is `validation.invalid`;
other Nest/Express 4xx map to `request.malformed` until uploads bring 413/415 codes.

**Alternatives considered and why rejected.** Nest's format with translated `message`;
a per-endpoint error decorator; copying class-validator messages; logging every 4xx.

**What can break and how to fix it.** api-check red → regenerate and commit. A new rule
shows the generic text → add it to `RULE_CODES` and the registry. A 500 without a log line
→ make sure `configureApp` is applied.

**Interview question on this topic.** Q: How does your API report validation errors, and
what must never be in the response? A: Problem Details with a registry code (an OpenAPI
enum) and `errors[]` (pointer, rule code, params); the frontend translates. Never sent
values, stacks or exception messages; a 500 is logged with the same `traceId` — proven by
tests and mutations, including the truncated input slice in V8's JSON error.

## 🇩🇪 Kurzfassung (Niveau B1)

Jeder Fehler der SignFlow-API hat jetzt dasselbe Format: Problem Details nach RFC 9457.
Ein fester Code aus einem Register sagt, was passiert ist; die Übersetzung macht das
Frontend. Bei einem Validierungsfehler gibt es für jedes Feld einen Eintrag mit
JSON-Pointer und Code. Der eingegebene Wert, zum Beispiel ein Passwort, steht nie in der
Antwort und nie im Log. Nur Serverfehler (500) werden protokolliert, mit derselben
Trace-ID wie in der Antwort. Eine Mutation hat gezeigt, dass ein Test zuerst zu schwach
war; jetzt erkennt er auch ein abgeschnittenes Stück der Eingabe.

### Fachwortschatz

| Deutsch                   | English             | Русский                   |
| ------------------------- | ------------------- | ------------------------- |
| die Fehlerbeschreibung    | problem details     | описание ошибки           |
| der Ausnahmefilter        | exception filter    | фильтр исключений         |
| das Register (der Codes)  | registry (of codes) | реестр (кодов)            |
| die Validierung           | validation          | валидация, проверка       |
| der Zeiger (JSON-Pointer) | JSON pointer        | указатель JSON Pointer    |
| das Protokoll (Log)       | log                 | лог, журнал               |
| das Datenleck             | data leak           | утечка данных             |
| die Ablaufverfolgungs-ID  | trace id            | идентификатор трассировки |
