# 034 · Task 6b: money — ISO 4217 table, `Money`, `DecimalString`

Date: 2026-11-23 · Task: roadmap 6, part 6b, [ADR-0008](../adr/0008-api-conventions-and-money.md) · PR: — · Commits: after `426920c`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** В `@adlersoft/api-kit` появились строительные блоки для денег:

- **таблица валют** ISO 4217 — 155 действующих валют с числом знаков после запятой;
- **`Money`** — сумма целым числом в минимальных единицах плюс код валюты. Её можно
  складывать и сравнивать, но только в одной валюте;
- **`toAmountMinor`** — перевод 64-битного числа из базы в безопасное число JSON;
- **`DecimalString`** — точная десятичная дробь строкой (цена за литр, количество);
- **`MoneyDto`** — сумма в теле запроса или ответа;
- **код ошибки `money.currency_unsupported`** (422) с переводами de/en/ru.

Заодно найдена и исправлена ошибка кэша из 6a.

Термины:

- **ISO 4217** — международный стандарт кодов валют (EUR, KGS, JPY) и числа знаков после
  запятой у каждой.
- **Показатель валюты (exponent)** — сколько «копеек» в единице: у EUR 2 (сто центов), у
  JPY 0 (копеек нет), у KWD 3 (тысяча филсов).
- **Минимальные единицы (minor units)** — сумма в центах, тыйынах, копейках: 15,86 € = 1586.
- **Branded type (помеченный тип)** — `string` с невидимой меткой. Обычную строку нельзя
  передать туда, где ждут `DecimalString`, пока она не прошла проверку.
- **`Number.MAX_SAFE_INTEGER`** (2^53 − 1 ≈ 9 квадриллионов) — до этого числа JavaScript
  хранит целые точно, дальше начинает округлять.

**Зачем это нужно (аналогия из жизни).**

- Деньги считают в копейках, а не в рублях с дробью. Кассир складывает 1586 + 250, и
  ничего не округляется. С дробями компьютер ошибается: `0.1 + 0.2` в JavaScript равно
  `0.30000000000000004`.
- Разные валюты складывать нельзя, как нельзя сложить 5 евро и 5 сомов и получить
  «10 чего-то». Поэтому `addMoney` с разными валютами бросает ошибку, а не молча
  возвращает число.

**Как это работает, шаг за шагом.**

1. **Таблица.** Официальный файл List One с сайта SIX (агентство, которое ведёт ISO 4217)
   скачан руками один раз, опубликован 2026-09-17. Скрипт
   `tools/generate-currency-table.mjs` читает его и пишет `iso-4217.ts`:
   - берутся только коды с числом знаков (`CcyMnrUnts` — цифра), без фондов
     (`IsFund="true"`). Так уходят металлы (XAU, XAG…), XDR, XXX, тестовый XTS и фондовые
     коды (CLF, UYW…), а XAF, XOF и XPF остаются: это настоящие валюты Африки и Океании;
   - в заголовке файла записаны адрес, дата и SHA-256 источника;
   - сам скрипт ничего не скачивает: таблица меняется только осознанно, через ревью.
2. **Почему не `Intl`.** Данные `Intl` зависят от версии CLDR в Node и в браузере. Если
   показатель где-то разойдётся, одно и то же целое прочитается как другая сумма. Таблица
   в репозитории одна и та же везде.
3. **`Money`:**
   - `addMoney` складывает целые, разные валюты дают `CurrencyMismatchError`, а сумма
     больше 2^53 − 1 даёт `RangeError`;
   - `compareMoney` сравнивает только одну валюту;
   - `toAmountMinor(bigint)` — колонка в базе 64-битная (`BigInt`), потому что 32 бит
     хватает лишь примерно до 21 миллиона евро. В JSON такое число превращается в обычное,
     а слишком большое отклоняется, а не округляется.
4. **`DecimalString`** — шаблон `^-?\d+(\.\d+)?$`. `"1.789"` и `"-2.50"` подходят, а
   `1e3`, `1,5`, `.5` и число JSON `35.42` нет: дробь передаётся только строкой.
5. **Неизвестная валюта → 422.** Правило `IsCurrencyCode()` в `field-errors.ts`
   сопоставлено с кодом `money.currency_unsupported`, так же как `isEmail` с
   `validation.email`. Ответ — `validation.failed` с
   `errors: [{ pointer: '/price/currency', code: 'money.currency_unsupported' }]`, и
   фронтенд переводит его на de/en/ru.
6. **Тесты библиотеки.** У `api-kit` появились цели `test` и `typecheck`. Декораторы
   class-validator — «старого» вида (`experimentalDecorators`), и встроенный в Vitest
   компилятор oxc понимает их только с настройкой
   `oxc: { decorator: { legacy: true, emitDecoratorMetadata: true } }`. Без неё был
   `SyntaxError`.

**Находка: ложный зелёный `api-check` с кэшем.** После добавления кода в реестр
`api-check` прошёл, хотя `openapi.json` устарел; с `--skip-nx-cache` он был красным. Это
ошибка 6a: у `openapi`, `api-check` и `typecheck` в `inputs` были только файлы самого
приложения, а реестр теперь живёт в `api-kit`. Добавил `^production`, то есть «и рабочие
файлы зависимостей». Теперь с кэшем красный, как и должен. В CI ошибки не было, там кэш
каждый раз пустой. Исправление — отдельный коммит `fix(signflow-api):`.

**Красный первым и мутации.**

- Тесты `api-kit` (16) сначала были красными: модулей ещё не было. Потом остался один
  красный: «неизвестная валюта → `money.currency_unsupported`», пока не появились код в
  реестре и сопоставление правила.
- HTTP-тест в `signflow-api`: тестовый endpoint `POST probe/price`, `XAU` → 422 с кодом
  поля, `EUR` → 201. Мутация: убрал сопоставление `isCurrencyCode` → тест красный.
- `api-check` был красным («first difference at line 33: money.currency_unsupported») →
  `nx run signflow-api:openapi`.
- `i18n-check` был красным («has no translation errors.money.currency_unsupported») →
  тексты, утверждённые владельцем.

**Полный прогон.** Всё зелёное, кроме `ui:test`: снова `Worker exited unexpectedly`, четвёртый
сбой воркера Vitest (расследование назначено после задачи 6). Отдельно — 106/106. e2e 13/13
без повторов: исправленный тест `never en` больше не мигает.

**Какие были альтернативы и почему отказались.**

- `Intl.NumberFormat(...).resolvedOptions().maximumFractionDigits` вместо таблицы: данные
  разные в разных средах.
- Короткий список валют: противоречит «любая валюта» в `business-processes.md`; владелец
  выбрал полный.
- Собственная ошибка верхнего уровня 422 вместо ошибки поля: фронтенд не узнал бы,
  какое поле подсветить.
- Пакет `currency-codes` из npm: чужие данные без даты источника и лишняя зависимость
  ради 155 строк.

**Что может сломаться и как починить.**

- В ISO появилась новая валюта → скачать свежий List One и запустить генератор. В diff
  видно, что изменилось. Показатель у валюты, по которой уже хранятся суммы, менять
  нельзя (ADR-0008).
- `RangeError` при чтении суммы из базы → в колонке значение больше 2^53 − 1. Это
  ошибка данных, а не кода.
- Тест библиотеки падает с `SyntaxError` на `@` → пропала настройка `oxc.decorator` в
  `vitest.config.mts`.

**Вопрос с собеседования по этой теме.**

- В: Как вы храните и передаёте деньги в API?
- О: Суммы — целым числом в минимальных единицах плюс код валюты: в базе `BigInt` и
  `Char(3)`, в JSON целое не больше 2^53 − 1. Цены за единицу — точной десятичной
  строкой. Число знаков берётся из закреплённой таблицы ISO 4217 в репозитории, а не из
  `Intl`. Разные валюты не складываются: функция бросает ошибку. Делим на 10^n только
  при показе. Неизвестная валюта даёт 422 с кодом поля.

## 🇬🇧 What and why (full)

**What was done.** `@adlersoft/api-kit` gained the money building blocks:

- the ISO 4217 table: 155 current currencies with their exponents;
- `Money` with `addMoney` and `compareMoney`;
- `toAmountMinor(bigint)`;
- `DecimalString` with `IsDecimalString()`;
- `MoneyDto`;
- `IsCurrencyCode()` and the code `money.currency_unsupported` (422), translated
  de/en/ru.

A cache bug from 6a was found and fixed on the way.

**Why (real-life analogy).** Cashiers count in cents: 1586 + 250 never rounds, while
`0.1 + 0.2` in JavaScript is `0.30000000000000004`. And 5 EUR + 5 KGS is not "10 of
something", so mixing currencies throws.

**How it works, step by step.**

1. **The table.** ISO 4217 List One (SIX, published 2026-09-17) was downloaded once by
   hand. `tools/generate-currency-table.mjs` writes `iso-4217.ts`, recording the source,
   the date and the SHA-256. It keeps the codes with a numeric minor unit and drops the
   funds, so XAF, XOF and XPF stay while metals, XDR, XXX, XTS and fund codes go.
2. **Not `Intl`:** its CLDR data differs between runtimes.
3. **`Money`:** integer addition; a currency mismatch throws, a sum beyond 2^53 − 1
   throws. `toAmountMinor` refuses unsafe `bigint`s instead of rounding.
4. **`DecimalString`:** `^-?\d+(\.\d+)?$`. A JSON number is rejected.
5. **Unknown currency:** `isCurrencyCode` maps to the field code
   `money.currency_unsupported`, so the response is a 422 with that code in `errors[]`.
6. **Library tests** use oxc with legacy decorators enabled. Without that setting the tests
   fail with a `SyntaxError`.

**Finding: a false green `api-check` from the cache.** After 6a the registry lives in
`api-kit`, but `openapi`, `api-check` and `typecheck` hashed only the app's own files. A
new code left a cached `api-check` green. Adding `^production` fixes it. CI was not affected,
because it starts with an empty cache.

**Red first and mutations.**

- The library tests were red first, then a single red one until the registry entry and
  the rule mapping existed.
- HTTP test: `XAU` → 422 with the field code, `EUR` → 201. Removing the mapping turns it
  red (mutation).
- `api-check` was red first, then the spec was regenerated.
- `i18n-check` was red first, then the approved texts were added.

**Alternatives considered and why rejected.**

- `Intl` exponents: they depend on the runtime.
- A short list: the owner chose all currencies.
- A top-level 422: the client could not tell which field is wrong.
- The npm package `currency-codes`: no dated source, and an extra dependency for 155 lines.

**What can break and how to fix it.**

- A new ISO currency → regenerate from a fresh List One; never change the exponent of a
  currency with stored amounts.
- `RangeError` when reading an amount → the stored value exceeds 2^53 − 1; this is a data
  problem.
- `SyntaxError` at `@` in library tests → `oxc.decorator` is missing in `vitest.config.mts`.

**Interview question on this topic.** Q: How do you store and transfer money in an API?
A: Amounts are integers in minor units plus an ISO currency code (`BigInt` + `Char(3)` in
the database, an integer within 2^53 − 1 in JSON). Unit prices are exact decimal strings.
Exponents come from a pinned ISO 4217 table in the repository, not from `Intl`. Currencies
never mix: the function throws. Division by 10^n happens only for display, and an unknown
currency is a 422 field error.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Bibliothek `api-kit` kann jetzt mit Geld umgehen. Beträge sind ganze Zahlen in der
kleinsten Währungseinheit, zum Beispiel 1586 Cent für 15,86 €. Die Zahl der
Nachkommastellen jeder Währung steht in einer festen Tabelle nach ISO 4217. Die Tabelle
stammt aus der offiziellen Liste vom 17. September 2026 und enthält 155 Währungen. Gold,
Sonderziehungsrechte und Fondscodes sind nicht dabei. Beträge in verschiedenen Währungen
kann man nicht addieren, die Funktion meldet einen Fehler. Eine unbekannte Währung
beantwortet die API mit 422 und dem Code `money.currency_unsupported`. Außerdem haben wir
einen Fehler im Nx-Cache gefunden und behoben.

### Fachwortschatz

| Deutsch                         | English               | Русский                                 |
| ------------------------------- | --------------------- | --------------------------------------- |
| der Betrag                      | amount                | сумма                                   |
| die kleinste Währungseinheit    | minor currency unit   | минимальная единица валюты              |
| die Nachkommastellen (ISO 4217) | currency exponent     | показатель валюты (знаки после запятой) |
| der Währungscode                | currency code         | код валюты                              |
| die Dezimalzahl als Text        | decimal string        | десятичная строка                       |
| die Gleitkommazahl              | floating-point number | число с плавающей точкой                |
| nicht unterstützt               | not supported         | не поддерживается                       |
| der Zwischenspeicher (Cache)    | cache                 | кэш                                     |
