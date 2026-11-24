# 047 · Баг: вставка пароля в create-admin на Windows

Date: 2026-11-24 · Task: баг владельца в `create-admin` (задача 7d) · PR: — · Commit: `34f3506`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что случилось.** В Windows PowerShell пароль вставлялся через Ctrl+V два раза, и
`create-admin` отвечал «The two entries do not match». Казалось, что на пробеле ввод
ломается. Требование владельца: вставка из буфера обмена и из менеджера паролей должна
работать, пароль с пробелами и умляутами тоже.

**Причина (найдена замером на Windows).** Запуск идёт через
`pnpm nx run signflow-api:create-admin`. Nx создаёт для команды свой **псевдотерминал** —
программу-посредника, которая принимает нажатия из окна и пересылает их процессу. Через
этого посредника ввод приходит **слитным куском**: «вставка, Enter, вставка, Enter» может
оказаться одним куском текста. Раньше каждый из двух вопросов создавал своего читателя.
Он брал свою строку до Enter, а **остаток куска выбрасывал**. Второму вопросу ничего не
доставалось, и пароли «не совпадали». Пробел ни при чём: он просто был внутри
выброшенного остатка.

**Аналогия.** Почтальон приносит два письма в одном конверте. Первый получатель берёт
своё и выбрасывает конверт вместе со вторым письмом.

**Исправление.**

1. `HiddenLineReader` — **один** читатель на весь сеанс. Всё, что пришло после Enter,
   хранится и достаётся следующему вопросу.
2. `\r\n` (скопированная строка) — это **один** Enter, даже если `\n` пришёл отдельным
   куском. Иначе второй вопрос получил бы пустую строку.
3. **Raw-режим** (терминал не показывает нажатия) включён от первого вопроса до конца.
   Между вопросами терминал тоже ничего не отображает.
4. Не изменилось: пароль, его длина и символы нигде не выводятся. Через аргументы и
   переменные окружения он по-прежнему не принимается.

**Как проверено.**

- **Тесты сначала красные:**
  - вставленная строка с пробелами и `ü`, оканчивающаяся на `\r\n`;
  - две вставки одним куском;
  - `\n` в следующем куске;
  - raw-режим между вопросами;
  - на экране только вопросы;
  - вся команда на PostgreSQL со слитной вставкой — до исправления висела до тайм-аута.
- **Мутации пойманы:** «выбросить остаток» (это и есть старая ошибка), «`\r\n` = два
  Enter».
- **На Windows, в одинаковых условиях до и после**, через `pnpm nx run` в Windows Terminal
  и в классической консоли. Пробный скрипт с собранным кодом пишет только «совпало / нет»:
  - **до:** второй вопрос ждёт вечно;
  - **после:** обе строки совпали, тестовая строка с пробелами и `ü` дошла точно.
  - Первые прогоны шли с настоящим Ctrl+V. Когда владелец начал работать за компьютером,
    Windows перестала отдавать фокус, и ввод пошёл напрямую в буфер консоли, без
    клавиатуры.

**Что может сломаться.**

- Если терминал включит bracketed paste (обёртку вставки `ESC[200~ … ESC[201~`), эти
  символы попадут в пароль. Сейчас мы её не включаем, и при проверке её не было.
- Пароль из нескольких строк невозможен: каждый перевод строки считается Enter.

**Вопрос с собеседования.**

- В: Почему чтение из потока «по строке на вызов» с собственным буфером в каждом вызове —
  ошибка?
- О: Поток не знает о ваших строках. Он отдаёт куски произвольного размера, и в одном
  куске может быть несколько строк. Если каждый вызов создаёт свой буфер и отбрасывает
  остаток, данные теряются. Буфер должен жить столько же, сколько поток, — как у
  `readline` в Node, где один интерфейс на весь сеанс.

## 🇬🇧 What and why (full)

**What happened.** Pasting the password twice into `create-admin` (Windows PowerShell)
gave "The two entries do not match".

**Cause, measured on Windows.** Under `pnpm nx run`, Nx's pseudo-terminal forwards input
in merged chunks: "paste, Enter, paste, Enter" can be one chunk. Each prompt had its own
reader, took its line and dropped the rest, so the second prompt never got its text. The
space was a red herring: it sat inside the dropped part.

**Analogy.** Two letters arrive in one envelope; the first recipient takes theirs and
throws the envelope away with the second letter inside.

**Fix.**

- One `HiddenLineReader` per session keeps the rest for the next prompt.
- `\r\n` counts as one Enter, even across chunks.
- Raw mode stays on between the prompts.
- Nothing about the password is printed, and it still cannot come from arguments or env.

**Verification.**

- Red first: a pasted line with spaces, `ü` and `\r\n`; merged pastes; a split `\r\n`; raw
  mode; screen output; the whole command on PostgreSQL.
- Mutations caught: dropping the rest, and `\r\n` counted as two Enters.
- Windows, before and after under equal conditions (Windows Terminal and the classic
  console via `pnpm nx run`): before, the second prompt hangs; after, both entries match
  exactly.

**What can break.** Bracketed paste markers would become part of the password (not
enabled, not seen). A multi-line password is impossible: each line break is an Enter.

**Interview question.** Q: Why is "one line per call, each call with its own buffer"
wrong for a stream? A: A stream delivers arbitrary chunks, and one chunk may hold several
lines. The buffer must live as long as the stream, like a single `readline` interface.

## 🇩🇪 Kurzfassung (Niveau B1)

Beim Befehl `create-admin` konnte man das Passwort unter Windows nicht zweimal einfügen.
Der Grund: Über `pnpm nx run` kommt die Eingabe manchmal in einem einzigen Stück an, zum
Beispiel beide Einfügungen mit beiden Enter-Tasten. Früher hatte jede Frage ihren eigenen
Leser; er nahm seine Zeile und warf den Rest weg. Jetzt gibt es einen Leser für die ganze
Sitzung, der den Rest für die nächste Frage aufbewahrt. `\r\n` zählt als ein Enter. Das
Passwort wird weiterhin nie angezeigt. Wir haben den Fehler unter Windows vorher und
nachher unter gleichen Bedingungen geprüft.

### Fachwortschatz

| Deutsch             | English          | Русский          |
| ------------------- | ---------------- | ---------------- |
| das Einfügen        | paste            | вставка          |
| die Zwischenablage  | clipboard        | буфер обмена     |
| das Pseudoterminal  | pseudo-terminal  | псевдотерминал   |
| der Datenblock      | chunk            | кусок данных     |
| der Rohmodus        | raw mode         | raw-режим        |
| der Zeilenumbruch   | line break       | перевод строки   |
| der Passwortmanager | password manager | менеджер паролей |
