# 048 · create-admin: --generate-password и настоящая причина «не совпадают»

Date: 2026-11-24 · Task: баг владельца + новый флаг (задача 7d) · PR: — · Commits: `e9e927a`, `a15a97c`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что случилось.** После исправления из журнала 047 у владельца всё равно было «пароли не
совпадают». Исправление в 047 было верным, но **проверяло другую ситуацию**. Я проверял
пробным скриптом, а не настоящей командой, и не вводил то, что вводит человек.

**Настоящая причина (воспроизведена настоящей командой `pnpm nx run … create-admin` на
Windows).** Скопированная строка часто уже заканчивается переводом строки, а это то же
самое, что Enter. Человек вставляет её и по привычке жмёт Enter ещё раз. Этот лишний Enter
становится **пустым ответом на «Repeat the password»**, и пароли «не совпадают». Так
повторяется все три раунда.

- До исправления: команда висит в третьем раунде, пользователь не создан.
- После: код выхода 0, пользователь в базе.

**Исправление 1.** Пустой Enter игнорируется: пустого пароля не бывает.

**Исправление 2 — `--generate-password`** (просьба владельца): вводить вообще ничего не
нужно.

- Пароль — 4 группы по 6 символов через «-», 27 символов. Буквы и цифры без похожих
  (`0/O`, `1/l/I`). Источник случайности — `node:crypto`. Пароль проверяется теми же
  правилами паролей (ADR-0010).
- Пароль показывается **один раз и прямо в консоль**, а не через stdout. Замер показал, что
  под `nx run` на Windows stdin — консоль, а **stdout — труба (pipe) в Nx**. Nx пересылает
  вывод дальше и может его сохранить. Поэтому пароль пишется в устройство консоли:
  `CONOUT$` на Windows, `/dev/tty` на Linux. Так делают ssh и gpg. Нет консоли (CI,
  перенаправленный вывод) — команда отказывается и ничего не создаёт.
- Пароля нет в аргументах, переменных окружения и логах. У цели `cache: false`. После
  настоящего прогона ни в `.nx`, ни в `tmp` пароля нет (проверено поиском по его формату).

**Смена пароля после входа.** Владелец просил указать, что пароль можно сменить. **Сейчас
этого нет**: смена и сброс пароля появятся в задаче 11 (`docs/plans/roadmap.md`). Так и
написано в README. До задачи 11 забытый пароль означает нового пользователя, потому что
существующий никогда не перезаписывается.

**Аналогия.** Выдача ключа от сейфа: его отдают в руки, а не пересылают через секретаря,
который ведёт журнал входящих.

**Урок «измерь, прежде чем объявлять».** В 047 я проверил механизм (куски ввода), а не
поведение человека (вставка плюс Enter). Проверка должна повторять действия
пользователя, а результат нужно смотреть в настоящей команде: код выхода и строку в базе.

**Что может сломаться.**

- Без консоли (CI, Docker без `-t`) `--generate-password` откажется. Это намеренно.
- Вывод «Created …» идёт через stdout (Nx) и может появиться на экране чуть позже строки с
  паролем.

**Вопрос с собеседования.**

- В: Почему CLI показывает секрет через `/dev/tty`, а не через stdout?
- О: stdout можно перенаправить в файл, трубу или лог, и обёртки вроде Nx или CI его
  перехватывают. `/dev/tty` (`CONOUT$`) — это экран человека. Секрет попадает только туда,
  а если экрана нет, программа отказывается.

## 🇬🇧 What and why (full)

**What happened.** After journal 047 the owner still got "do not match". That fix was
right, but it covered a different case.

**Real cause, reproduced with the real command on Windows.** A copied line ends in a line
break, which is an Enter. The Enter pressed after the paste became an empty answer to
"Repeat", in every round. Before: the command hangs, no user. After: exit 0, user created.

**Fix 1.** An empty Enter is ignored; a password is never empty.

**Fix 2: `--generate-password`.**

- A 27-character random password from `node:crypto`, checked by the password rules.
- It is shown once, straight on the console (`CONOUT$` / `/dev/tty`), not on stdout.
  Measured: under `nx run` on Windows, stdout is a pipe into Nx. No console means refused.
- It is not in arguments, env or logs. The target has `cache: false`. Nothing in `.nx` or
  `tmp` after a real run.

**Password change.** Changing the password does not exist yet; it comes with task 11.
README says so.

**Analogy.** A safe key is handed over in person, not through a secretary who logs every
letter.

**Lesson.** Verify the user's actions, not just the mechanism, and judge by the real
command's outcome.

**What can break.** No console (CI, Docker without `-t`) means a refusal, on purpose. The
"Created" line may appear after the password line.

**Interview question.** Q: Why show a secret on `/dev/tty` instead of stdout? A: stdout can
be redirected or captured by wrappers and CI; the tty is the person's screen.

## 🇩🇪 Kurzfassung (Niveau B1)

Der Fehler „Passwörter stimmen nicht überein“ kam nach der ersten Korrektur wieder. Der
echte Grund: Eine kopierte Zeile endet oft mit einem Zeilenumbruch, also schon mit Enter.
Das zusätzliche Enter war eine leere Antwort auf die zweite Frage. Jetzt wird ein leeres
Enter ignoriert. Neu ist die Option `--generate-password`: Der Befehl erzeugt ein
zufälliges Passwort mit 27 Zeichen und zeigt es einmal direkt in der Konsole, nicht über
stdout. Unter Nx ist stdout nämlich eine Pipe. Das Passwort ändern kann man erst mit
Aufgabe 11.

### Fachwortschatz

| Deutsch             | English                  | Русский                |
| ------------------- | ------------------------ | ---------------------- |
| die Konsole         | console                  | консоль                |
| die Standardausgabe | standard output (stdout) | стандартный вывод      |
| die Pipe            | pipe                     | труба (канал)          |
| das Geheimnis       | secret                   | секрет                 |
| zufällig erzeugen   | generate randomly        | сгенерировать случайно |
| die Zeilenschaltung | line break               | перевод строки         |
