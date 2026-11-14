# 008a · E2E на своих портах — никогда на dev-сервере владельца

Date: 2026-11-14 · Task: 008a (chore, без плана) · PR: — · Commits: `e55befe` (правило в README libs/ui), `f6c32d9`

## 🇷🇺 Что и зачем (коротко)

**Что сделано.**
E2E-тесты всегда поднимают **production-сборку** на собственных портах:

- signflow — **4300**;
- belegscan — **4301**;
- Storybook — **4402**.

Dev-серверы остаются на 4200, 4201 и 4400 и больше никогда не попадают в тесты.

**Почему раньше e2e попадали на мой dev-сервер (настоящая причина).**

- Плагин `@nx/playwright` сам выводит, от какой задачи зависит e2e, по строке `webServer.command` в конфиге Playwright.
- В конфиге было `isCI ? serve-static : serve`. Без `CI` зависимостью становился dev-сервер `signflow:serve` на 4200, а `reuseExistingServer` стоял `true` **всегда**.
- Итог: если на 4200 уже что-то слушало, тесты шли на это «что-то», то есть на мой dev-сервер с несохранёнными правками.

Правило «запускай с `CI=true`» из CLAUDE.md закрывало проблему лишь наполовину. Теперь она закрыта самим устройством: порт e2e **не зависит от окружения**.

**Как это работает теперь (аналогия).** Раньше тестировщик заходил в мастерскую, где идёт работа, и проверял полуготовую вещь. Теперь у него своя комната (свой порт), куда приносят готовую вещь (production-сборку).

Порядок шагов одинаковый локально и в CI:

1. Nx собирает приложение или Storybook (`build`, `build-storybook`) — из кэша, если ничего не менялось.
2. Nx запускает статический сервер (`serve-static`, `static-storybook`) на порту e2e.
3. Playwright видит, что сервер уже отвечает (`reuseExistingServer: true` — но на **своём** порту), и запускает тесты.

**Таймаут Storybook.**

- ui-storybook-e2e и раньше раздавал статическую сборку, а не dev Storybook.
- Падение по таймауту в 008 было оттого, что я запускал `playwright test` напрямую: сборка Storybook тогда шла **внутри** таймаута webServer (240 с).
- Через `nx e2e` сборка — отдельная задача Nx **до** Playwright. Поэтому таймаут 240 с удалён (по умолчанию 60 с, только на запуск сервера).
- Проверено холодным прогоном без кэша: сборка, сервер и 13/13 тестов заняли 142 с, ошибок таймаута нет.

**Проверка.**

- Мой dev-сервер слушал 4200 (pid 21992), Storybook dev — 4400.
- `CI=true pnpm nx run-many -t e2e`: signflow 3/3 (http://localhost:4300), belegscan 3/3 (4301), Storybook 13/13 (4402).
- Dev-сервер не тронут; после прогона серверы e2e закрылись.

**Известная мелочь.** Под Windows в логе бывает `EPERM … rename project-graph.json`. Это гонка записи кэша графа: `@nx/web:file-server` при отключённом демоне (`CI=true` его отключает) запускает свой nx, и два процесса пишут один файл. На результат не влияет. В CI на Linux rename перезаписывает файл атомарно, поэтому ошибки там нет.

**Правило из 008 в README libs/ui.** Если без контекста компонент не работает вообще — ошибка всегда. Если работает хуже — ошибка только в dev.

**Вопрос с собеседования.**

- В: Почему e2e не стоит гонять на dev-сервере?
- О: Dev-сервер — это не то, что увидит пользователь: другая сборка, нет оптимизаций, могут быть несохранённые правки разработчика. E2E должны проверять production-сборку, на отдельном порту, по одному и тому же порядку шагов локально и в CI. Иначе зелёный тест может проверять не тот код.

## 🇬🇧 What and why (short)

- **What changed.** E2E always run against production builds on their own ports: signflow 4300, belegscan 4301, Storybook 4402. Dev servers (4200, 4201, 4400) are never touched.
- **Root cause.** The Nx Playwright plugin infers the e2e dependency from `webServer.command`. Without `CI` it was the dev server on 4200, and `reuseExistingServer` was always `true`, so a running dev server was reused.
- **Now.** The port does not depend on env, and the task graph is the same everywhere: build (cached) → static server → Playwright.
- **Storybook timeout.** The 240 s timeout is removed: the Storybook build is an Nx task before Playwright. A cold run without cache took 142 s with no timeout.
- **Verified** with the owner's dev server on 4200: 3/3, 3/3 and 13/13 tests passed.
- **Windows-only noise.** An `EPERM` on the project-graph cache rename appears in the log; it is harmless.

## 🇩🇪 Kurzfassung (Niveau B1)

Die E2E-Tests laufen jetzt immer gegen den Produktions-Build auf eigenen Ports: 4300, 4301 und 4402. Der Entwicklungsserver auf Port 4200 wird nie mehr von Tests benutzt. Vorher hing die Testkonfiguration von der Umgebungsvariable CI ab; ohne sie hat Playwright einen laufenden Entwicklungsserver wiederverwendet. Jetzt ist der Ablauf lokal und in der CI gleich: zuerst bauen, dann den statischen Server starten, dann testen. Der Storybook-Build läuft vor Playwright als eigene Nx-Aufgabe, deshalb braucht der Webserver keinen langen Timeout mehr.

### Fachwortschatz

| Deutsch                          | English              | Русский              |
| -------------------------------- | -------------------- | -------------------- |
| der Entwicklungsserver           | dev server           | dev-сервер           |
| der Produktions-Build            | production build     | production-сборка    |
| der Port                         | port                 | порт                 |
| wiederverwenden                  | to reuse             | переиспользовать     |
| die Zeitüberschreitung (Timeout) | timeout              | таймаут              |
| die Umgebungsvariable            | environment variable | переменная окружения |
| die Aufgabenabhängigkeit         | task dependency      | зависимость задачи   |
