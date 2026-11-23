# 041 · create-admin: the first user, and a limit on the Argon2 queue

Date: 2026-11-23 · Task: 7d, [ADR-0010](../adr/0010-authentication.md) · PR: — · Commits: after `6c83ca2`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** Две вещи.

1. **Команда `create-admin`** создаёт первого пользователя:

   ```powershell
   pnpm nx run signflow-api:create-admin aigul@firma.kg
   ```

   - Пароль спрашивается в терминале **дважды** и **не отображается** (не видно даже
     звёздочек).
   - Пароль проверяется правилами из 7a: 15–128 символов, не из списка частых, без
     e-mail и без названий продуктов.
   - В базе остаётся только хеш Argon2id.
   - Если пользователь с таким e-mail уже есть (без учёта регистра), команда отказывает
     **до** вопроса о пароле и ничего не меняет.
   - На ввод пароля даётся три попытки, потом команда сдаётся.

   Чего команда **никогда** не принимает (правило владельца):

   - пароль аргументом: второй аргумент → отказ, и он не повторяется в сообщении;
   - пароль из переменной окружения: такой переменной просто нет;
   - пароль через трубу (`echo пароль | …`): stdin должен быть терминалом, иначе отказ.

   Всё перечисленное оседает в истории оболочки или в логах.

2. **Предел очереди Argon2** (решение владельца после 7c). Если 4 хеширования уже идут и
   ещё 16 ждут (`ARGON2_MAX_QUEUE`), следующий вход сразу получает **503
   `server.unavailable`** с `Retry-After: 5`. Без предела поток попыток со многих IP
   выстраивал бы очередь, и настоящие пользователи ждали бы входа сколько угодно.

Термины:

- **TTY (терминал)** — интерактивное окно, где печатает человек. Труба (`|`) или файл — не
  терминал;
- **raw mode (сырой режим)** — терминал перестаёт сам печатать нажатые клавиши и отдаёт
  их программе. Так пароль не появляется на экране;
- **код выхода** — число, которым программа сообщает результат: 0 — успех, 1 — ошибка,
  2 — неверный вызов, 130 — прервано Ctrl+C;
- **точка входа** — файл, который запускают (`create-admin.js`), в отличие от модулей,
  которые он импортирует.

**Зачем это нужно (аналогия из жизни).** Новый сейф:

- Код набирают на кнопках, прикрыв их рукой. Его не пишут на стикере (аргумент команды) и
  не диктуют по громкой связи (переменная окружения, лог).
- Код вводят дважды, чтобы не ошибиться.
- Если у сейфа уже есть хозяин, сменить код этой процедурой нельзя.

**Как это работает, шаг за шагом.**

1. `src/create-admin.ts` — точка входа:
   - первой строкой подключает `reflect-metadata`, как `main.ts`;
   - вызывает `runCreateAdmin(аргументы, { stdin, stdout, stderr })`.
2. `runCreateAdmin` по порядку проверяет:
   - ровно один аргумент, и это e-mail, иначе подсказка и код 2;
   - stdin — терминал, иначе код 2;
   - настройки (`loadConfig`): неверный `DATABASE_URL` даёт код 1 с именем переменной.
3. `createAdmin(email, deps)`:
   - пользователь есть → отказ;
   - иначе до трёх раундов «ввести → проверить правила → ввести ещё раз → сравнить».
     Сравнение идёт после NFC: «ü» двумя способами — один и тот же пароль;
   - хеш → `user.create`. Если кто-то создал того же пользователя между проверкой и
     записью (`P2002`), это тоже «уже есть», без перезаписи.
4. `readHiddenLine`:
   - включает raw mode и сам собирает нажатия;
   - Enter завершает ввод, Backspace стирает символ целиком (и «🙂» тоже);
   - Ctrl+C или Ctrl+D прерывают ввод;
   - после чтения raw mode выключается.
5. Предел очереди:
   - `ConcurrencyLimitedPasswordHasher(argon2, 4, 16)` при полной очереди сразу бросает
     `PasswordHasherBusyError`;
   - `SessionService` превращает её в 503 и не считает попытку неудачей;
   - перехеш при входе при полной очереди пропускается: пользователь уже проверен,
     перехеш случится при следующем входе.

**Найденные по ходу ошибки (честно).**

- **Кэш хеша-пустышки.** Хеш-пустышка (для неизвестных e-mail, журнал 039) кэшировался
  как promise. Если первое его создание получило бы отказ «очередь полна», отклонённый
  promise остался бы навсегда: каждый вход с неизвестным e-mail отвечал бы 503 до
  перезапуска. Теперь кэшируется только успех. Тест это проверяет, а мутация (убрать
  сброс) его роняет: `expected 401, got 503`.
- **Точка входа без `reflect-metadata`.** Функции были покрыты тестами, но собранная
  команда падала при старте: `Reflect.getMetadata is not a function`. Нашёл, когда
  запустил её руками. Добавил тест, который запускает собранный
  `dist/.../create-admin.js`; сначала он был красным, после исправления зелёный.

**Какие были альтернативы и почему отказались.**

- Пароль флагом `--password` или переменной `ADMIN_PASSWORD` — так проще для скриптов,
  но владелец запретил: история оболочки, `ps`, логи CI.
- Принимать пароль из трубы — тот же `echo` в истории.
- Пакет для скрытого ввода (`read`, `inquirer`) — лишняя зависимость ради ~40 строк;
  свой `readHiddenLine` протестирован подменой терминала.
- Одноразовая ссылка вместо пароля — так задумано в ADR-0010, но ссылкам нужны
  приглашения (задача 10). Временное отступление записано в ADR-0010.
- Ждать в очереди Argon2 без предела — настоящие пользователи ждали бы за потоком атаки.

**Что может сломаться и как починить.**

- Симптом: `create-admin needs an interactive terminal`, хотя запускаешь из PowerShell. →
  Причина: Nx не передал команде настоящий терминал. → Что делать: запустить напрямую
  (команда ниже, «запасной путь») и сообщить мне — поправлю таргет.
- Симптом: `A user with the e-mail … already exists`. → Это так задумано: команда не
  перезаписывает. Смена пароля появится вместе с восстановлением (задача 11).
- Симптом: `Failed: PrismaClientInitializationError`. → База не запущена или миграции не
  применены. → `docker compose -f compose.dev.yaml up -d postgres` и
  `pnpm nx run signflow-api:prisma-migrate-deploy`.
- Симптом: вход отвечает 503 под нагрузкой. → Очередь Argon2 заполнена. → Поднять
  `ARGON2_MAX_QUEUE` или `ARGON2_MAX_CONCURRENT`, если хватает памяти (46 MiB на хеш).

**Вопрос с собеседования по этой теме.**

- В: Как безопасно передать пароль CLI-команде, которая создаёт администратора?
- О: Только интерактивно, с выключенным эхом терминала (raw mode). Аргументы видны в
  истории оболочки и в списке процессов; переменные окружения попадают в дампы, логи CI и
  `/proc`; труба (`echo … |`) тоже остаётся в истории. Поэтому команда требует, чтобы
  stdin был терминалом, и принимает ровно один аргумент — e-mail. Пароль вводится дважды,
  проверяется правилами и хранится только хешем. В идеале вместо пароля выдаётся
  одноразовая ссылка: тогда пароль задаёт сам пользователь в браузере.

### Как проверить руками (PowerShell)

```powershell
# 0. Тесты: юнит (73), интеграционные (39)
pnpm nx run signflow-api:test               # ожидается "Tests  73 passed (73)"
pnpm nx run signflow-api:test-integration   # ожидается "Tests  39 passed (39)"

# 1. База и миграции
docker compose -f compose.dev.yaml up -d postgres
pnpm nx run signflow-api:prisma-migrate-deploy

# 2. Создать пользователя: пароль вводишь дважды, на экране ничего не появляется.
pnpm nx run signflow-api:create-admin aigul@firma.kg
# Ожидается: "Created aigul@firma.kg. Sign in with this e-mail and the password."
$LASTEXITCODE     # 0

# Запасной путь, если Nx скажет "needs an interactive terminal":
pnpm nx run signflow-api:build
$env:DATABASE_URL = 'postgresql://signflow:signflow-local@127.0.0.1:5432/signflow'
node dist/apps/signflow-api/src/create-admin.js aigul@firma.kg

# 3. Второй раз — отказ без вопроса о пароле:
pnpm nx run signflow-api:create-admin aigul@firma.kg
# Ожидается: "A user with the e-mail aigul@firma.kg already exists. Nothing changed."

# 4. Войти этим пользователем (в отдельном окне: pnpm nx run signflow-api:serve).
#    Пароль здесь в командной строке — только для проверки на своей машине.
curl.exe -s -i -X POST -H "Content-Type: application/json" -d '{\"email\":\"aigul@firma.kg\",\"password\":\"<твой-пароль-без-пробелов>\"}' http://localhost:3333/api/v1/session | Select-String "HTTP/|Set-Cookie"
# Ожидается: "HTTP/1.1 204 No Content" и "Set-Cookie: __Host-sid=…; HttpOnly; Secure; SameSite=Lax"
```

## 🇬🇧 What and why (full)

**What was done.**

1. **`create-admin`** (`pnpm nx run signflow-api:create-admin <e-mail>`) creates the first
   user.
   - The password is typed twice in the terminal and never shown.
   - It is checked by the 7a rules and stored only as an Argon2id hash.
   - An existing e-mail is refused before any question.
   - There are three tries.
   - A password is never accepted as a second argument, from an environment variable or
     from a pipe (stdin must be a TTY).
2. **Argon2 queue limit:** with 4 hashes running and 16 waiting (`ARGON2_MAX_QUEUE`), the
   next sign-in gets 503 `server.unavailable` with `Retry-After: 5` at once. It is not
   counted as a failure. A rehash that finds the queue full is skipped until the next
   sign-in.

**Why (real-life analogy).** Setting a safe's code:

- You type it with your hand over the keypad; you do not write it on a sticky note (an
  argument) or read it out over the speaker (an env variable, a log).
- You type it twice.
- A safe that already has an owner cannot be re-coded this way.

**How it works, step by step.**

1. The entry file loads `reflect-metadata`, then calls `runCreateAdmin`.
2. `runCreateAdmin` checks, in order:
   - exactly one argument, and it is an e-mail;
   - stdin is a TTY;
   - the settings.
3. `createAdmin`:
   - refuses an existing user;
   - runs up to three rounds of "type, check rules, retype, compare (NFC)";
   - hashes and creates the user. A `P2002` race also means "exists"; nothing is
     overwritten.
4. `readHiddenLine`:
   - turns raw mode on and collects the keys itself;
   - Enter finishes, Backspace removes a whole code point;
   - Ctrl+C / Ctrl+D abort.
5. The queue throws `PasswordHasherBusyError` when full. `SessionService` maps it to 503.

**Bugs found on the way.**

- A refused dummy-hash promise would have been cached forever: every unknown e-mail would
  get 503 until restart. Now only a success is cached. This is tested, and a mutation that
  removes the reset is caught.
- The built entry crashed (`Reflect.getMetadata is not a function`) although all the
  functions were tested. I found it by running the command by hand; a smoke test now runs
  the built file (red first, then green).

**Alternatives considered and why rejected.**

- `--password` or `ADMIN_PASSWORD`: forbidden by the owner (shell history, `ps`, CI logs).
- Piped input: it also ends up in the shell history.
- A prompt library: an extra dependency for ~40 lines of code.
- A one-time link: the plan of ADR-0010, but it needs invitations (task 10). The
  temporary deviation is recorded in ADR-0010.
- An unbounded queue: real users would wait behind an attack.

**What can break and how to fix it.**

- "needs an interactive terminal" under Nx → run the built file with `node` directly and
  report it.
- "already exists" → intended. Password change comes with recovery (task 11).
- `PrismaClientInitializationError` → start the database and apply the migrations.
- 503 under load → raise the queue settings if memory allows.

**Interview question on this topic.** Q: How should a CLI that creates an admin receive the
password? A:

- Only interactively, with the terminal echo off (raw mode).
- Not as arguments (shell history, process list), not from environment variables (dumps,
  CI logs) and not from pipes (`echo … |` is in the history). So require stdin to be a TTY
  and accept the e-mail as the only argument.
- Confirm by retyping, validate with the password rules and store only the hash.
- Better still, print a one-time link and let the user set the password in the browser.

## 🇩🇪 Kurzfassung (Niveau B1)

Der Befehl `create-admin` legt den ersten Benutzer an. Die E-Mail-Adresse ist das einzige
Argument. Das Passwort wird im Terminal zweimal eingegeben und dabei nicht angezeigt. Das
Passwort darf nie als Argument, als Umgebungsvariable oder über eine Pipe kommen, denn
dann steht es in der Shell-Historie. Ein vorhandener Benutzer wird nie überschrieben. Das
Passwort muss die Regeln erfüllen (15 bis 128 Zeichen, nicht zu häufig), gespeichert wird
nur der Argon2id-Hash. Später, mit den Einladungen in Aufgabe 10, gibt der Befehl einen
Einmal-Link aus. Außerdem hat die Argon2-Warteschlange jetzt ein Limit: Ist sie voll,
antwortet die Anmeldung sofort mit 503 und `Retry-After`. Zwei Fehler wurden dabei
gefunden und mit Tests abgesichert.

### Fachwortschatz

| Deutsch                                 | English                 | Русский                            |
| --------------------------------------- | ----------------------- | ---------------------------------- |
| der Befehl / das Kommandozeilenwerkzeug | command / CLI tool      | команда / утилита командной строки |
| die verdeckte Eingabe                   | hidden input            | скрытый ввод                       |
| die Shell-Historie                      | shell history           | история оболочки                   |
| die Umgebungsvariable                   | environment variable    | переменная окружения               |
| der Rückgabewert (Exit-Code)            | exit code               | код выхода                         |
| überschreiben                           | to overwrite            | перезаписать                       |
| der Einmal-Link                         | one-time link           | одноразовая ссылка                 |
| die Warteschlange ist voll              | the queue is full       | очередь заполнена                  |
| vorübergehend nicht verfügbar           | temporarily unavailable | временно недоступен                |
| der Einstiegspunkt                      | entry point             | точка входа                        |
