# 002 · CI: полная проверка main вместо «пустого зелёного»

Date: 2026-11-14 · Task: исправление к 001 · PR: — · Commits: `fix(ci): …`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Первый запуск CI на GitHub был зелёным за 46 секунд, но в логе стояло `NX  No tasks were run`: ни lint, ни тесты, ни сборка не запускались. Теперь CI работает по-разному в зависимости от события:

- **push в `main` или ручной запуск** (новая кнопка «Run workflow») — проверяются **все** проекты (`nx run-many`);
- **pull request** — проверяются только затронутые проекты (`nx affected`), как и раньше.

**Зачем это нужно (аналогия из жизни).**
Представь охранника, который проверяет только тех, кто вошёл после последней проверки. Если журнал проверок пуст, он сравнивает с «вчера», видит, что новых людей нет, и пишет «всё в порядке», хотя в здании никого не проверял. Зелёный CI, который ничего не проверил, опаснее красного: он даёт ложную уверенность.

**Как это работает, шаг за шагом.**

1. **Что пошло не так.** `nx affected` запускает задачи только для проектов, изменившихся между двумя коммитами: base и head.
2. **Откуда берётся base.** Его ищет `nrwl/nx-set-shas`: это последний коммит `main`, на котором CI был зелёным. При первом запуске такого коммита нет, и action взял предыдущий коммит (`f84d5dc`).
3. **Почему ничего не запустилось.** Между `f84d5dc` и `4880998` менялась только документация. Ни один проект не затронут, поэтому Nx не запустил ни одной задачи, и шаг завершился успешно.
4. **Исправление.** В `ci.yml` появилась переменная `NX_RUN`. Для pull request она равна `affected`, для всего остального — `run-many`. Команды стали такими: `pnpm nx $NX_RUN -t …`.
5. **`nx-set-shas`** теперь запускается только для pull request, потому что только там нужен base.
6. **`workflow_dispatch`** добавляет кнопку ручного запуска во вкладке Actions.

**Какие были альтернативы и почему отказались.**

- **Вариант А: оставить `affected` везде и на `main` передавать `--base=HEAD~1`.**
  Отказались: изменение только в документации всё равно даст «пустой зелёный» запуск.
- **Вариант Б: везде `run-many`.**
  Отказались: в PR это лишняя работа. Когда проектов станет много (бэкенды, библиотеки), CI сильно замедлится.
- **Вариант В: Nx Cloud.**
  Отказались: внешний сервис и аккаунт. Решили не подключать его (ADR-0001).

**Что может сломаться и как починить.**

- **Симптом:** в PR стоит `No tasks were run`.
  **Причина:** PR меняет только документацию.
  **Что делать:** ничего, это правильное поведение. Код проверен на `main`.
- **Симптом:** CI на `main` стал медленнее.
  **Причина:** проверяется всё.
  **Что делать:** это ожидаемо. Если станет слишком медленно, отдельной ADR решить вопрос с кэшем (Nx Cloud или кэш GitHub Actions).
- **Симптом:** кнопки «Run workflow» нет.
  **Причина:** изменение ещё не запушено.
  **Что делать:** `git push`.

**Вопрос с собеседования по этой теме.**

- В: Чем опасна команда `nx affected` в CI и как это компенсировать?
- О: `affected` проверяет только то, что изменилось относительно base. Если base определён неверно, проверка может ничего не запустить и всё равно «пройти». Так бывает на первом запуске, после force-push или при изменении только документации. Поэтому основная ветка проверяется полностью (`run-many`), а `affected` используется для скорости в pull request. Кроме того, в логе зелёного запуска нужно убедиться, что задачи действительно выполнялись.

## 🇬🇧 What and why (full)

**What was done.**
The first CI run on GitHub was green in 46 seconds, but its log said `NX  No tasks were run`: nothing was linted, tested or built. CI now runs differently depending on the event:

- **Push to `main` or a manual run** (new "Run workflow" button): all projects are checked with `nx run-many`.
- **Pull request:** only the affected projects are checked with `nx affected`, as before.

**Why (real-life analogy).**
Picture a guard who only checks people who entered since the last check. With an empty check log, he compares with "yesterday", sees no newcomers and reports "all fine" without checking anyone. A green CI run that checked nothing is worse than a red one, because it creates false confidence.

**How it works, step by step.**

1. **How `affected` works.** `nx affected` runs tasks only for the projects that changed between a base and a head commit.
2. **Where the base comes from.** `nrwl/nx-set-shas` picks the last commit on `main` with a green CI run. On the very first run there is none, so it fell back to the previous commit (`f84d5dc`).
3. **Why nothing ran.** Between `f84d5dc` and `4880998` only docs changed. No project was affected, so no tasks ran and the step succeeded.
4. **The fix.** `NX_RUN` is `affected` for pull requests and `run-many` otherwise; the commands are now `pnpm nx $NX_RUN -t …`.
5. **`nx-set-shas`** now runs only for pull requests, the only place a base is needed.
6. **`workflow_dispatch`** adds a manual run button in the Actions tab.

**Alternatives considered and why rejected.**

- **A: keep `affected` everywhere with `--base=HEAD~1` on `main`.** A docs-only commit would still produce an empty green run.
- **B: use `run-many` everywhere.** It wastes time in PRs and gets slow as backends and libraries are added.
- **C: Nx Cloud.** It is an external service and account, rejected in ADR-0001.

**What can break and how to fix it.**

- **`No tasks were run` in a PR.** The PR changes only docs. This is correct, because `main` is fully verified.
- **CI on `main` gets slower.** This is expected. If it becomes too slow, decide on caching (Nx Cloud or the GitHub Actions cache) in an ADR.
- **No "Run workflow" button.** The change has not been pushed yet; run `git push`.

**Interview question on this topic.**

- **Q:** What is the risk of `nx affected` in CI, and how do you mitigate it?
- **A:** `affected` checks only what changed relative to a base. If the base is wrong, the run can execute nothing and still pass. This happens on the first run, after a force push, or with docs-only changes. So the main branch is always fully verified with `run-many`, and `affected` is used for speed in pull requests. Also check the log of a green run to make sure tasks actually ran.

## 🇩🇪 Kurzfassung (Niveau B1)

Der erste CI-Lauf auf GitHub war grün, aber er hat nichts geprüft: Im Log stand „No tasks were run“. Der Grund: `nx affected` prüft nur geänderte Projekte, und der letzte Commit hat nur die Dokumentation geändert. Jetzt prüft die CI bei jedem Push auf `main` alle Projekte mit `nx run-many`. Bei Pull Requests prüft sie weiter nur die betroffenen Projekte, damit sie schnell bleibt. Außerdem gibt es jetzt einen Button für einen manuellen Lauf. Die wichtigste Lehre: Ein grüner Haken ist nur etwas wert, wenn wirklich Aufgaben gelaufen sind.

### Fachwortschatz

| Deutsch                | English          | Русский                          |
| ---------------------- | ---------------- | -------------------------------- |
| der Hauptzweig         | main branch      | основная ветка                   |
| der Pull Request       | pull request     | pull request (запрос на слияние) |
| der Basis-Commit       | base commit      | базовый коммит                   |
| betroffen              | affected         | затронутый                       |
| der manuelle Auslöser  | manual trigger   | ручной запуск                    |
| die falsche Sicherheit | false confidence | ложная уверенность               |
| das Protokoll (Log)    | log              | лог, журнал выполнения           |
