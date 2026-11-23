# 035 · Task 6c: pages, sorting, ids in the path — task 6 complete

Date: 2026-11-23 · Task: roadmap 6, part 6c, [ADR-0008](../adr/0008-api-conventions-and-money.md) · PR: — · Commits: after `6ec73d3`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** В `@adlersoft/api-kit` появились блоки для списков и адресов записей:

- **`PageQueryDto`** — номер страницы и размер страницы из `?page=2&pageSize=25`;
- **`Page<T>`**, `toPage`, `toSkipTake` — тело ответа списка и пересчёт в `skip`/`take`
  для Prisma;
- **`parseSort`**, `toOrderBy` — разбор `?sort=-updatedAt,title` с проверкой
  разрешённых полей;
- **`ParseIdPipe`** — id из пути, который не похож на UUID, сразу даёт 404.

Задача 6 закончена: библиотека (6a), деньги (6b), списки (6c).

Термины:

- **Пагинация (pagination)** — выдача списка по страницам: «страница 2 по 25 записей».
- **Pipe в Nest** — функция, которая проверяет или преобразует параметр запроса **до**
  вызова контроллера. Если она бросила ошибку, контроллер не вызывается.
- **Белый список полей (whitelist)** — заранее перечисленные поля, по которым можно
  сортировать; всё остальное запрещено.

**Зачем это нужно (аналогия из жизни).**

- Список — как каталог в библиотеке: никто не выносит все 10 000 карточек сразу, их
  листают по 25.
- Сортировка по белому списку — как в справочном окне. «Отсортируйте по фамилии» сделают,
  а «отсортируйте по паролю» нет: такого поля в выдаче просто не бывает.
- `ParseIdPipe` — охранник, который по номеру пропуска видит, что тот поддельный, и не
  отправляет человека искать по всему зданию (в базе).

**Как это работает, шаг за шагом.**

1. **`PageQueryDto`:**
   - в URL всё — строки. `@Type(() => Number)` из class-transformer превращает `"2"` в 2
     **до** проверки, а `"abc"` в `NaN`, которое проверка `IsInt` отклонит;
   - значения по умолчанию заданы прямо в классе (`page = 1`, `pageSize = 25`);
   - `pageSize` не больше 100, иначе 422 `validation.invalid` с указателем `/pageSize`;
   - эндпоинт наследует класс и добавляет свои `sort` и фильтры.
2. **`toSkipTake`:** страница 3 по 25 → `skip: 50, take: 25`. **`toPage`** собирает
   `{ items, page, pageSize, totalItems }`, как в макетах («47 записей»).
3. **`parseSort(raw, allowed, fallback)`:**
   - строку режет по запятым, `-` в начале означает «по убыванию»;
   - нет параметра → порядок по умолчанию эндпоинта;
   - неизвестное поле, пустая часть (`title,,x`, `-`, пустая строка) или повтор поля →
     400 `request.malformed`. Это уже существующий код 400, нового я не вводил;
   - **`toOrderBy`** переводит результат в `orderBy` Prisma.

   Строка от пользователя никогда не попадает в запрос к базе напрямую.

4. **`ParseIdPipe`:**
   - пишется так: `@Param('id', ParseIdPipe) id: string`;
   - проверяет каноничный вид UUID (`8-4-4-4-12` шестнадцатеричных цифр, регистр любой);
   - если не UUID → 404 `request.not_found` (решение владельца): записи с таким id быть не
     может, и ответ тот же, что для несуществующего id, — лишнего не раскрываем;
   - раньше такое значение доходило до PostgreSQL и возвращалось как 500 (журнал 032).

**Красный первым и мутации.**

- Unit-тесты `api-kit` (11 новых, всего 27) были красными: модулей не было.
- HTTP-тесты в `signflow-api` с тестовыми эндпоинтами `GET probe/items` и
  `GET probe/items/:id`:
  - `?page=2&sort=-title` → 200 с разобранными значениями;
  - `pageSize=101` → 422;
  - `sort=password` → 400;
  - `not-a-uuid` → 404, настоящий UUID → 200.
- Мутации:
  - pipe пропускает всё → тест 404 красный;
  - убран `@Type(() => Number)` → тест «страница из query» красный.
- Контракт не изменился: тестовые эндпоинты существуют только в тесте.

**Ещё одна встреча с ловушкой shell.** HTTP-тест я сначала вставил через `node -e` в
bash, и экранирование съело шаблонную строку `` `/api/v1/probe/items/${id}` ``: тест
получил `.get()` без адреса. Исправил через Edit. Правило из памяти — «код пишем через
Write/Edit, не через shell» — подтвердилось ещё раз.

**Полный прогон.** Всё зелёное, кроме `ui:test`: `radio.spec.ts` не уложился в 5 с под
полной параллельной нагрузкой (`libs/ui` в 6c не менялся). Отдельно — 106/106. Записано
как пятый симптом для расследования, которое идёт следующей задачей.

**Какие были альтернативы и почему отказались.**

- **Пагинация курсором** (`?after=<id>`): стабильнее на огромных живых списках, но не
  даёт номеров страниц и «47 записей», как в макетах. ADR-0008 оставляет её на случай
  больше ~100 тысяч строк.
- **Сортировка как поле DTO с проверкой class-validator** → ответ 422. ADR-0008 требует
  400; ошибочная сортировка — это ошибка адреса, а не данных формы.
- **Встроенный `ParseUUIDPipe` Nest:** отвечает 400 со своим текстом, а владелец
  выбрал 404 и наш формат ошибок.
- **Swagger-класс страницы сразу:** без первого настоящего эндпоинта его нечем
  проверить. Он появится вместе с первым списком и тестом контракта.

**Что может сломаться и как починить.**

- `page` приходит строкой и проверка падает → потерян `@Type(() => Number)`.
- Эндпоинт сортирует по полю, которого нет в базе → поле есть в `allowed`, но нет в
  модели Prisma; список `allowed` должен совпадать с колонками.
- 404 на правильный id → в пути не UUID (например, лишний символ); проверить, что клиент
  берёт id из ответа API, а не собирает сам.

**Вопрос с собеседования по этой теме.**

- В: Как вы защищаете API списков от произвольной сортировки и мусорных id?
- О: Сортировка — строка `-updatedAt,title`, которую разбирают на сервере по белому
  списку полей эндпоинта. Неизвестное, пустое или повторённое поле — 400, а в Prisma
  попадает только разобранный `orderBy`. Id в пути проходит через pipe: не UUID — сразу
  404, без запроса к базе, и ответ такой же, как для несуществующей записи. Номера
  страниц приводятся к числам до валидации, `pageSize` ограничен сотней.

## 🇬🇧 What and why (full)

**What was done.** `@adlersoft/api-kit` gained the list blocks:

- `PageQueryDto`;
- `Page<T>`, `toPage` and `toSkipTake`;
- `parseSort` and `toOrderBy`;
- `ParseIdPipe`.

Task 6 is complete: the library (6a), money (6b) and lists (6c).

**Why (real-life analogy).** A catalogue is browsed 25 cards at a time. You may sort by
surname but not by password. A guard who spots a fake pass does not send its holder to
search the whole building.

**How it works, step by step.**

1. **`PageQueryDto`:** `@Type(() => Number)` turns `"2"` into 2 before validation, and
   `"abc"` becomes `NaN`, which fails. The defaults are 1 and 25, the maximum is 100, and
   errors are 422 with a pointer. Endpoints extend the class.
2. **`toSkipTake`** gives Prisma `skip` / `take`; **`toPage`** builds
   `{ items, page, pageSize, totalItems }`.
3. **`parseSort`** reads comma-separated fields, with `-` for descending, against a
   whitelist. An unknown, empty or repeated field is 400 `request.malformed` (the existing
   code). **`toOrderBy`** gives Prisma `orderBy`.
4. **`ParseIdPipe`:** anything that is not the canonical UUID form is 404
   `request.not_found` (owner). It never reaches PostgreSQL, which used to answer with a 500.

**Red first and mutations.**

- Library tests were red first: 11 new, 27 in total.
- HTTP tests with test-only endpoints cover 200, 422, 400 and 404.
- Mutations: a pipe that lets everything through, and a missing `@Type(() => Number)`.
- The contract is unchanged.

**The shell trap again.** Inserting the test through `node -e` in bash ate a template
literal, and the test called `.get()` with no URL. I fixed it with Edit. The memory rule
"code via Write/Edit, not shell" holds.

**Alternatives considered and why rejected.**

- Cursor pagination: no page numbers or totals, unlike the mockups.
- Sort as a validated DTO field: that gives 422, but ADR-0008 says 400.
- Nest's `ParseUUIDPipe`: answers 400 in its own format.
- A Swagger page class now: nothing to verify it against yet.

**What can break and how to fix it.**

- `page` arrives as a string → `@Type(() => Number)` is missing.
- Sorting on a non-existent column → `allowed` must match the Prisma model.
- 404 for a "correct" id → the path is not a clean UUID.

**Interview question on this topic.** Q: How do you protect list endpoints from arbitrary
sorting and junk ids? A: The sort string is parsed on the server against a per-endpoint
whitelist; anything unknown, empty or repeated is 400, and only the parsed `orderBy`
reaches Prisma. Path ids go through a pipe: not a UUID → 404 at once, with no database
query and the same answer as for a missing record. Page parameters are converted to numbers
before validation, and `pageSize` is capped at 100.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Bibliothek `api-kit` hat jetzt Bausteine für Listen. Die Seitennummer und die
Seitengröße kommen aus der URL, zum Beispiel `?page=2&pageSize=25`. Mehr als 100 Einträge
pro Seite sind nicht erlaubt. Die Sortierung ist nur nach Feldern erlaubt, die der Endpunkt
freigibt. Ein unbekanntes Feld ergibt den Fehler 400. Eine ID im Pfad, die keine UUID ist,
ergibt sofort 404, ohne Anfrage an die Datenbank. Damit ist Aufgabe 6 abgeschlossen.

### Fachwortschatz

| Deutsch                  | English                | Русский                        |
| ------------------------ | ---------------------- | ------------------------------ |
| die Seitennummerierung   | pagination             | пагинация (постраничный вывод) |
| die Seitengröße          | page size              | размер страницы                |
| die Sortierung           | sorting                | сортировка                     |
| absteigend / aufsteigend | descending / ascending | по убыванию / по возрастанию   |
| die Positivliste         | whitelist              | белый список                   |
| der Pfadparameter        | path parameter         | параметр пути                  |
| nicht gefunden           | not found              | не найдено                     |
