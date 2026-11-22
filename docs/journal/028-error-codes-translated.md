# 028 · Task 3b: error code → translation in de / en / ru

Date: 2026-11-22 · Task: roadmap 3, part 3b — task 3 complete, [ADR-0008](../adr/0008-api-conventions-and-money.md) · PR: — · Commits: after `42facb7`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Сервер с 3a присылает ошибку как код (`validation.email`). Теперь фронт SignFlow превращает
код в предложение на языке пользователя:

- `problemMessage(ошибка)` → ключ перевода `errors.<code>`. Если код незнакомый: 5xx →
  `errors.server.internal`, 4xx → `errors.generic.client`, нет ответа →
  `errors.generic.network`.
- В `apps/signflow/public/i18n/{de,en,ru}.json` — тексты всех кодов, утверждённые
  владельцем.
- `i18n-check` следит, чтобы у каждого кода контракта был перевод: новый код без текста
  ломает CI.
- Тест показывает ошибку валидации (форма целиком + поля) на de, en и ru.

Термины:

- **Ключ перевода** — адрес текста в JSON-файле языка: `errors.validation.email`.
- **Хелпер (helper)** — маленькая функция-помощник без состояния.
- **`HttpErrorResponse`** — объект Angular, который получает код, если запрос
  завершился ошибкой: в нём `status` и тело ответа `error`.

**Зачем это нужно (аналогия из жизни).**
Сервер — диспетчер, который передаёт по рации только номер ситуации: «код 17». У
водителя есть справочник на своём языке: «17 — дорога перекрыта». Если пришёл номер,
которого нет в справочнике, водитель не теряется, а читает общую фразу: «что-то пошло не
так». А `i18n-check` — это проверка, что справочник выпущен для **каждого** нового номера.

**Как это работает, шаг за шагом.**

1. **`problemMessage()`** (`libs/signflow/api-client/src/problem-message.ts`, написан
   руками рядом со сгенерированным клиентом):
   - `status === 0` (браузер не получил ответа: нет сети, DNS) → `errors.generic.network`;
   - в теле есть `code`, и он **есть в контракте** → `errors.<code>`. Список кодов —
     константа `ProblemCode`, которую Orval сгенерировал из enum контракта, поэтому код
     не может разойтись с сервером;
   - иначе — по статусу. Например, прокси отдал HTML-страницу 502 или новая версия
     сервера прислала код, которого старый фронт не знает. 5xx → `errors.server.internal`,
     4xx → `errors.generic.client`.
   - **Один смысл — один ключ** (решение владельца): отдельного `generic.server` нет,
     незнакомая 5xx показывает тот же текст, что `server.internal`.
   - Функция принимает `{ status, error }`, а не сам `HttpErrorResponse`. Объект Angular
     подходит под этот тип, а тест обходится без Angular: обычный vitest в Node. Поэтому
     у `signflow-api-client` появилась цель `test`.
   - `problemCodeKey(code)` — то же правило для кодов полей из `errors[]`.
2. **Переводы.** Ключи `errors.validation.{failed,invalid,required,email}`,
   `errors.request.{malformed,not_found}`, `errors.server.internal`,
   `errors.generic.{client,network}`. Тексты `required`/`email` взяты из
   Storybook-прототипа (ADR-0021). Остальные утверждены владельцем 2026-11-22, список — в
   `next-steps.md`.
3. **`i18n-check`** (`tools/i18n-check/src/check-error-codes.mts`): для каждого
   `libs/<app>/api-contract/openapi.json` берёт `components.schemas.ProblemCode.enum` и
   ищет `errors.<code>` в `apps/<app>/public/i18n/de.json`. en и ru проверять отдельно не
   нужно: существующая проверка уже требует, чтобы у en/ru были ровно ключи de. Контракты
   добавлены во `inputs` цели `test`, чтобы новый код не брался из кэша. Защита: тест
   падает, если не нашёл ни одного контракта с кодами.
4. **Тест «показана на трёх языках»** (`apps/signflow/src/app/i18n/error-messages.spec.ts`).
   Экрана с вводом в SignFlow ещё нет (вход — задача 8), endpoint не придумываем. Поэтому
   компонент, который живёт **только в тесте**, делает настоящий `HttpClient.post`, а MSW
   отвечает 422 с телом как у `signflow-api` (тип — сгенерированный `ProblemDetailsDto`).
   Компонент показывает общий текст в `role="alert"` и по строке на поле. Приложение
   настроено как настоящее: `provideHttpClient()`, `provideI18n()`, язык браузера.

**Тесты: красный первым и мутации.**

- `i18n-check` красный первым: «error code "validation.failed" has no translation …» —
  перечислены все 7 кодов. С переводами — 20/20.
- `problemMessage` красный первым («Cannot find module './problem-message'»), потом 5/5:
  код контракта, незнакомый код (409/503), HTML-тело прокси, `null`, статус 0.
- Тест на трёх языках сразу зелёный: переводы и хелпер уже были, их красные прогоны —
  выше. Поэтому **мутация**: хелпер «забывает» коды контракта (пустой набор) → de, en и ru
  красные; вернули — 22/22.
- Плюс: нет ответа (`HttpResponse.error()`) → «Keine Verbindung zum Server …», без
  падения.

**Какие были альтернативы и почему отказались.**

- Переводить `title` с сервера: английский текст для разработчиков, меняется без
  предупреждения; ADR-0008 — только код.
- Свой список кодов на фронте: разошёлся бы с сервером. Берём сгенерированный
  `ProblemCode`.
- `HttpInterceptor`, который сам показывает ошибки: решение о том, **где** показать
  (поле, форма, тост), принимает экран. Хелпер только даёт текст. Глобальный показ — когда
  появятся экраны.
- Отдельная библиотека `libs/shared/problem-client`: второго фронта, которому она нужна,
  пока нет. Belegscan получит её, когда дойдёт до API.

**Что может сломаться и как починить.**

- Симптом: CI красный, `i18n-check`: «error code "x.y" has no translation» → в реестр
  сервера добавили код; добавить `errors.x.y` в de/en/ru (тексты — на утверждение).
- Симптом: на экране ключ `errors.…` вместо текста → ключа нет в файле языка; `i18n-check`
  должен был поймать — проверить, что код есть в контракте (`api-check`).
- Симптом: везде «Die Aktion konnte nicht ausgeführt werden» → сервер прислал код,
  которого нет в сгенерированном клиенте: клиент не перегенерирован, или ответ не
  Problem Details.

**Вопрос с собеседования по этой теме.**

- В: Как вы переводите ошибки сервера, и что будет, если сервер пришлёт новый код?
- О: Сервер шлёт только стабильный код из реестра; он же enum в OpenAPI. Фронт берёт
  список кодов из сгенерированного клиента, превращает код в ключ `errors.<code>` и
  переводит через Transloco. Незнакомый код или не-Problem-Details — общий текст по
  статусу, без падения. А чтобы до пользователя не дошёл «сырой» ключ, проверка
  переводов в CI требует текст на каждый код контракта на всех трёх языках.

## 🇬🇧 What and why (full)

**What was done.** The SignFlow frontend turns an API error code into a sentence in the
user's language: `problemMessage()` → `errors.<code>`; an unknown code goes by status
(5xx → `errors.server.internal`, 4xx → `errors.generic.client`); no answer →
`errors.generic.network`. All texts are in de/en/ru, and `i18n-check` requires a
translation for every code of the contract.

**Why (real-life analogy).** A dispatcher radios only a situation number; the driver has a
handbook in their language and a generic phrase for unknown numbers. `i18n-check` makes
sure the handbook covers every new number.

**How it works, step by step.** `problemMessage({ status, error })` (hand-written in
`libs/signflow/api-client`): status 0 → network; a `code` from Orval's generated
`ProblemCode` constant → `errors.<code>`; otherwise by status. One meaning, one key — no
separate `generic.server`. It takes `{ status, error }` so Angular's `HttpErrorResponse`
fits and the test runs in plain Node (new `test` target). `problemCodeKey()` applies the
same rule to field codes. `i18n-check` reads `ProblemCode.enum` of every
`libs/<app>/api-contract/openapi.json` and requires `errors.<code>` in the app's `de.json`
(en/ru follow from the existing completeness check); contracts are test inputs. The
three-language test uses a test-only component that sends a real `HttpClient.post`; MSW
answers 422 shaped like `signflow-api` (typed with the generated model); the app is
configured as in production.

**Red first and mutations.** i18n-check red first (all 7 codes listed), green with the
translations. `problemMessage` red first (module missing), then 5/5. The three-language
test was green at once (its parts were already red-tested), so a mutation: the helper
"forgets" the contract codes → de, en, ru red; restored → 22/22. A network failure shows
the network text without crashing.

**Alternatives considered and why rejected.** Translating the server's `title`; a frontend
list of codes; an interceptor that displays errors itself (the screen decides where);
a shared problem-client library now (no second consumer yet).

**What can break and how to fix it.** i18n-check names a code without a translation → add
`errors.<code>` in de/en/ru. A raw key on screen → the code is missing from the contract.
Generic text everywhere → the client was not regenerated or the body is not Problem
Details.

**Interview question on this topic.** Q: How do you translate server errors, and what if
the server sends a new code? A: Stable registry codes, an OpenAPI enum, a generated list on
the client, `errors.<code>` through Transloco; unknown codes fall back to a text by status;
CI requires a translation for every contract code in all three languages.

## 🇩🇪 Kurzfassung (Niveau B1)

Die API schickt bei einem Fehler nur einen Code. Das Frontend von SignFlow macht daraus
einen Satz in der Sprache des Benutzers: Deutsch, Englisch oder Russisch. Kennt das
Frontend den Code nicht, zeigt es einen allgemeinen Text passend zum HTTP-Status; ohne
Antwort vom Server erscheint der Text „Keine Verbindung zum Server“. Die Liste der Codes
kommt aus dem erzeugten Client, deshalb passt sie immer zum Server. Eine Prüfung in der CI
verlangt für jeden Code des Vertrags eine Übersetzung. Ein Test zeigt einen
Validierungsfehler in allen drei Sprachen. Damit ist Aufgabe 3 fertig.

### Fachwortschatz

| Deutsch                   | English            | Русский                 |
| ------------------------- | ------------------ | ----------------------- |
| der Übersetzungsschlüssel | translation key    | ключ перевода           |
| der Fehlercode            | error code         | код ошибки              |
| die allgemeine Meldung    | generic message    | общее сообщение         |
| die Hilfsfunktion         | helper function    | вспомогательная функция |
| die Netzwerkverbindung    | network connection | сетевое подключение     |
| vollständig               | complete           | полный, без пропусков   |
| die Rückfallebene         | fallback           | запасной вариант        |
| die Eingabe prüfen        | check the input    | проверить ввод          |
