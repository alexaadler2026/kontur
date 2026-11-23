# 037 · Task 7a: password hashing (Argon2id) and password rules

Date: 2026-11-23 · Task: roadmap 7, part 7a, [ADR-0010](../adr/0010-authentication.md) · PR: — · Commits: after `bca5574`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** Новая серверная библиотека `@adlersoft/auth-server`
(`libs/shared/auth-server`) — первый кирпич входа в систему. В ней две вещи:

- **как хранить пароль:** интерфейс `PasswordHasher` и его реализация
  `Argon2idPasswordHasher` на встроенном в Node `crypto.argon2`;
- **какой пароль можно поставить:** функция `checkPassword(password, { email })` —
  возвращает список проблем (`too_short`, `too_long`, `common`, `contains_email`,
  `contains_product`) или пустой список.

Ещё: генератор списка частых паролей `tools/generate-common-passwords.mjs`, сам список
(16 051 запись), замер времени хеширования в CI, обновлённый ADR-0010.

Термины:

- **хеш** — «отпечаток» пароля, из которого пароль обратно не получить; при входе
  считаем отпечаток введённого и сравниваем;
- **соль (salt)** — случайные 16 байт, свои для каждого пароля: два одинаковых пароля дают
  разные хеши, и заранее посчитанные таблицы бесполезны;
- **Argon2id** — функция хеширования, которая специально тратит время и **память**:
  подбирать пароли на видеокартах дорого;
- **строка PHC** — формат хранения `$argon2id$v=19$m=47104,t=2,p=1$<соль>$<хеш>`: алгоритм,
  параметры и соль лежат прямо в строке, поэтому параметры можно поднять позже;
- **NFC** — нормальная форма Unicode: «ü» можно записать одним символом (U+00FC) или
  двумя (u + U+0308); после NFC это одно и то же.

**Зачем это нужно (аналогия из жизни).** Банк не хранит копию вашего ключа от ячейки —
он хранит слепок, по которому ключ можно проверить, но нельзя изготовить. Соль — это
то, что у каждого клиента слепок снят в своём, уникальном воске: украв все слепки, вор
должен подбирать к каждому отдельно. Argon2id — воск, который твердеет долго: на одну
попытку уходит треть секунды и 46 МБ памяти.

**Как это работает, шаг за шагом.**

1. `hash(password)`: пароль → NFC → 16 случайных байт соли → `crypto.argon2('argon2id',
{ memory: 47104 КиБ, passes: 2, parallelism: 1, tagLength: 32 })` → строка PHC.
2. `verify(stored, password)`: разбираем строку PHC, считаем хеш введённого пароля **с
   параметрами из строки** (не с текущими), сравниваем `timingSafeEqual` — сравнение
   за одинаковое время, чтобы по времени нельзя было угадать, сколько байт совпало.
   Нечитаемая строка — это ошибка данных (исключение), а не «неверный пароль».
3. `needsRehash(stored)`: параметры в строке отличаются от текущих → при следующем входе
   пароль перехешируется (это сделает 7b).
4. `checkPassword`: длина 15–128 **символов** (кодовых точек после NFC: эмодзи и «ü» —
   по одному), нет в списке частых (без учёта регистра), нет e-mail и части до `@` (если
   она от 3 символов), нет `signflow`, `belegscan`, `kontur`.

**Почему такие параметры (замер на ноутбуке владельца, i7-8565U, медианы).**

| m (память)             | t (проходы) | время                    |
| ---------------------- | ----------- | ------------------------ |
| 19 MiB (минимум OWASP) | 2           | 121 ms — ниже цели       |
| 19 MiB                 | 4           | 193 ms                   |
| 32 MiB                 | 3           | 268 ms                   |
| **46 MiB**             | **2**       | **274–327 ms — выбрано** |
| 64 MiB                 | 2           | 396 ms                   |

Цель владельца — 200–500 ms. Из близких вариантов взяли больше памяти, а не больше
проходов: именно память дорога для видеокарт. В CI время печатает шаг «Argon2id timing»
как аннотацию (`::notice`), её видно на странице прогона и через публичный API GitHub.

**Время в CI (после push, коммит `4b5c447`): медиана 84 ms** (min 82, max 102, 7 замеров)
на раннере `ubuntu-latest` — ниже цели; раннер примерно в 3,5 раза быстрее ноутбука. Цифра
вписана в ADR-0010 как есть. Для какой машины цель 200–500 ms (ноутбук, CI или будущий
сервер ADR-0014) — вопрос владельцу; сервер замеряем тем же `measure-hash` в задаче 23.

**Почему список частых паролей такой.** Одобренный сначала «10 000 частых» при длине
≥ 15 содержал **одну** подходящую запись — остальные и так отсекает правило длины.
Поэтому (решение владельца) — объединение трёх больших списков SecLists (MIT), только
записи 15–128 символов: 16 051 строка, например `1q2w3e4r5t6y7u8i9o0p`,
`123456789987654321` — то, что люди набирают, чтобы «пройти» правило 15 символов.
В шапке файла — источники, дата и SHA-256 каждого исходного файла.

**Как проверяли тесты (red first и мутации).**

- Сначала тесты без кода — красные (`Cannot find module`), потом код — 21 из 21.
- Две записанные мутации: убрали `normalize('NFC')` в хешере → красный ровно тест
  «ü двумя способами»; убрали NFC в подсчёте длины → красный ровно тест «u + U+0308 —
  один символ». Вернули — зелёные.
- Найденная ловушка: в тестовых данных «разложенная ü» была невидимым символом в
  исходнике. Редактор, который сам приводит файл к NFC, тихо превратил бы тест в пустой.
  Теперь такие строки собираются из кодов (`String.fromCharCode(0x0308)`) и тест сначала
  проверяет, что две записи действительно разные.

**Какие были альтернативы и почему отказались.**

- Пакет `argon2` (так было в ADR-0010): нативный модуль со скриптом установки, а скрипты
  установки у нас запрещены (решение владельца). Запасной вариант, если Node когда-нибудь
  пометит `crypto.argon2` экспериментальным, — `@node-rs/argon2` (готовые бинарники).
- bcrypt: не тратит память и обрезает пароль до 72 байт.
- Правила состава («цифра, заглавная, символ»): NIST их не рекомендует — люди пишут
  `Passwort1!`. Длина и список защищают лучше.
- Минимум 12 символов (было в ADR-0010): NIST SP 800-63B rev. 4 требует 15 для пароля
  без второго фактора, а 2FA в v1 нет.

**Отступления от одобренного плана (сказаны владельцу).**

- Миграция `users.password_hash` перенесена в 7b: в 7a её никто не использует.
- Часть e-mail до `@` проверяется, только если в ней от 3 символов — иначе `a@firma.kg`
  запретил бы любую «a». Это допущение исполнителя, вынесено в константу
  `EMAIL_LOCAL_PART_MIN_LENGTH` с тестом; ждёт подтверждения владельца.
- Размер: 572 строки без сгенерированного списка (ориентир — 400); ~210 из них — тесты.

**Что может сломаться и как починить.**

- Симптом: при входе исключение «not an Argon2id PHC string» → в базе испорченная или
  чужая строка (например, bcrypt после импорта) → это ошибка данных, не пароля; смотреть
  запись пользователя.
- Симптом: вход стал заметно медленнее после обновления → подняли параметры; старые
  хеши перехешируются при входе, это нормально; если на сервере > 500 ms — снизить память.
- Симптом: новый релиз Node печатает `ExperimentalWarning` про argon2 → перейти на
  `@node-rs/argon2` за тем же интерфейсом `PasswordHasher`.
- Список паролей устарел → скачать три файла SecLists и запустить генератор (команды в
  шапке `tools/generate-common-passwords.mjs`).

**Как проверить руками (PowerShell).**

```powershell
pnpm nx run auth-server:test
# ожидается: Tests  21 passed (21)

pnpm nx run auth-server:measure-hash
# ожидается: Argon2id m=46 MiB, t=2, p=1: median ~270–330 ms (...)
```

**Вопрос с собеседования по этой теме.**

- В: Почему пароли не хранят как SHA-256 с солью?
- О: SHA-256 быстрый: видеокарта считает миллиарды хешей в секунду, и утёкшую базу
  перебирают по словарю. Нужна функция, которая специально медленная и требует много
  памяти, — Argon2id (или scrypt, bcrypt). Параметры храним в строке хеша (формат PHC),
  чтобы поднимать их со временем и перехешировать старые пароли при входе.

## 🇬🇧 What and why (full)

**What was done.** A new server library `@adlersoft/auth-server` with (1) the
`PasswordHasher` interface and `Argon2idPasswordHasher` on Node's built-in `crypto.argon2`,
and (2) `checkPassword(password, { email })`, which returns the list of problems
(`too_short`, `too_long`, `common`, `contains_email`, `contains_product`). Plus the
generator and the 16,051-entry common-password list, a CI timing step, and ADR-0010
amendments. A hash is a one-way fingerprint; a salt is 16 random bytes per password; a PHC
string stores algorithm, parameters and salt next to the hash; NFC is the Unicode normal
form in which "ü" has one spelling.

**Why (real-life analogy).** A bank keeps an impression of your key, not a copy: enough to
check a key, not to make one. Each impression is taken in its own wax (salt), and the wax
sets slowly (Argon2id: a third of a second and 46 MB per attempt).

**How it works, step by step.** `hash`: NFC → random salt → Argon2id (46 MiB, 2 passes, 1
lane, 32-byte tag) → PHC string. `verify`: parse the PHC string, recompute with the
**stored** parameters, compare with `timingSafeEqual`; an unreadable string throws (a data
error, not a wrong password). `needsRehash`: stored parameters differ from current →
rehash at the next login (7b). `checkPassword`: 15–128 characters (code points after NFC),
not on the list (case-insensitive), no e-mail or local part of at least 3 characters, no
product name.

**Parameters.** Measured on the owner's laptop (medians): OWASP baseline 19 MiB/t=2 121 ms
(below the 200–500 ms target), 32 MiB/t=3 268 ms, 46 MiB/t=2 274–327 ms (chosen), 64 MiB/t=2
396 ms. More memory rather than more passes: memory is what GPUs lack. CI prints its time as
an annotation: after the push (commit `4b5c447`) the GitHub runner took a median of 84 ms
(min 82, max 102) — below the target, the runner being about 3.5× faster than the laptop.
Which machine the target refers to is an open question for the owner; the production server
gets measured with the same `measure-hash` in task 23.

**Common-password list.** The originally approved 10k list had a single entry of 15+
characters. Owner's decision: the union of three large SecLists (MIT) lists, only 15–128
characters, NFC lower case, deduplicated — 16,051 entries; sources, date and SHA-256 in the
file header.

**Testing.** Red first (missing modules), then 21/21 green. Two recorded mutations
(removing NFC in the hasher, removing NFC in the length count) each turned exactly the
matching test red. Pitfall found: the decomposed "ü" was an invisible character in the test
source, which an NFC-normalising editor would silently break; test data is now built from
code points and the test first asserts that the two spellings differ.

**Alternatives considered and why rejected.** The `argon2` package (needs an install script,
forbidden); bcrypt (no memory cost, truncates at 72 bytes); composition rules (NIST advises
against them); a 12-character minimum (NIST rev. 4 requires 15 for a single-factor
password).

**Deviations from the approved plan (reported to the owner).** The `users.password_hash`
migration moves to 7b (nothing uses it in 7a); the local part is checked only from 3
characters (executor's assumption, a named constant with a test, awaiting confirmation);
572 changed lines without the generated list (guideline 400).

**What can break and how to fix it.** "Not an Argon2id PHC string" at login → corrupt or
foreign stored value, a data issue. Slower logins after raising parameters → expected,
hashes are upgraded at login. A Node release marking `crypto.argon2` experimental → switch to
`@node-rs/argon2` behind the same interface. Stale list → re-run the generator.

**Interview question on this topic.** Q: Why not store passwords as salted SHA-256?
A: SHA-256 is fast — a GPU computes billions per second, so a leaked database falls to a
dictionary attack. A password hash must be deliberately slow and memory-hard (Argon2id),
with its parameters stored next to the hash (PHC) so they can be raised and old hashes
upgraded at login.

## 🇩🇪 Kurzfassung (Niveau B1)

Wir haben eine neue Server-Bibliothek für die Anmeldung angelegt. Passwörter werden nie im
Klartext gespeichert, sondern als Hash mit Argon2id. Jedes Passwort bekommt ein eigenes,
zufälliges Salz. Argon2id braucht absichtlich viel Speicher und Zeit, etwa 300
Millisekunden pro Passwort; das macht das Erraten mit Grafikkarten teuer. Wir nutzen die
Funktion, die schon in Node eingebaut ist, ohne zusätzliches Paket. Ein neues Passwort
muss 15 bis 128 Zeichen lang sein. Es darf nicht auf einer Liste häufiger Passwörter
stehen und weder die E-Mail-Adresse noch den Produktnamen enthalten. Vor dem Hashen wird
der Text in die Unicode-Form NFC gebracht, damit „ü“ immer gleich ist.

### Fachwortschatz

| Deutsch                              | English                  | Русский                            |
| ------------------------------------ | ------------------------ | ---------------------------------- |
| der Hashwert                         | hash                     | хеш                                |
| das Salz                             | salt                     | соль                               |
| der Speicherbedarf                   | memory cost              | затраты памяти                     |
| die Passwortrichtlinie               | password policy          | правила пароля                     |
| die Sperrliste                       | blocklist                | список запрещённых (паролей)       |
| die Normalisierung                   | normalisation            | нормализация                       |
| der Zeitvergleich in konstanter Zeit | constant-time comparison | сравнение за постоянное время      |
| der Grafikprozessor                  | GPU                      | видеокарта (графический процессор) |
