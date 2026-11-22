# 025 · Task 1d: SignFlow e2e against the real, built API

Date: 2026-11-21 · Task: roadmap 1 (end-to-end slice), part 1d — task 1 complete · PR: — · Commits: after `5870341`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
До 1d браузерные тесты SignFlow отвечали на `GET /api/v1/health/live` сами: подставляли
ответ через `page.route`. Теперь подмены нет. Перед тестами Nx собирает и запускает
**настоящий** `signflow-api` на порту **4310** и собранный SignFlow на **4300**. Строка
«API: OK, Version 0.1.0» в тесте прошла всю цепочку: браузер → статика → прокси `/api` →
NestJS. Задача 1 (сквозной срез) на этом закрыта.

Термины:

- **e2e (end-to-end)** — тест «от начала до конца»: настоящий браузер кликает по
  настоящему приложению.
- **Прокси** — посредник: принимает запрос и пересылает его дальше, здесь `/api/*` → API.
- **Один origin** — страница и API на одном адресе (схема + хост + порт). Браузеру тогда
  не нужен **CORS** — механизм, который разрешает запросы на чужой адрес.
- **Path traversal (выход за пределы папки)** — атака: в URL пишут `/../`, чтобы сервер
  отдал файл вне папки сайта, например `package.json` или ключи.

**Зачем это нужно (аналогия из жизни).**
Подмена в тесте — это репетиция с актёром, который читает за партнёра. Для проверки
сцены годится, но премьера идёт с настоящим партнёром. 1d — первая премьера: фронт и бэк
встретились по-настоящему.

**Как это работает, шаг за шагом.**

1. **`signflow-api:serve-e2e`**: `node dist/apps/signflow-api/src/main.js`, зависит от
   `build`, `PORT=4310` через `options.env` цели Nx. Запись `PORT=4310 node …` не
   работает в PowerShell, а `env` работает везде. Обычный `serve` (`@nx/js:node`) — это
   режим разработки с пересборкой, для e2e нужен готовый `dist`.
2. **Почему свой сервер статики.** Прежний `@nx/web:file-server` использует свой
   `proxyUrl` для режима SPA (все неизвестные пути → `index.html`). Прокси `/api` в нём
   без поломки SPA не сделать. Поэтому `apps/signflow-e2e/static-server.mjs`, около 50
   строк на `node:http`, без зависимостей:
   - `/api/*` → пересылает на `localhost:4310` (API выключен → 502);
   - путь — файл внутри `dist/apps/signflow/browser` → отдаёт файл;
   - иначе → `index.html` (маршруты Angular, страница 404 приложения).
3. **Проверка пути (по требованию владельца).** `path.resolve(root, '.' + путь)`, затем
   итоговый путь должен начинаться с `root + sep`, иначе **404**. Берётся «сырой» путь, а
   не `new URL()`: тот сам выкидывает `/../`, и проверка работала бы только «по везению».
   Декодированный `%2f` тоже ловится, так как проверка идёт после `decodeURIComponent`.
4. **Сервер временный.** В задаче 22 e2e переходят на Docker-образы с Caddy, как в проде
   (ADR-0014), и файл удаляется. Это записано в начале файла и в `next-steps.md` у
   задачи 22.
5. **`playwright.config.mts`**: `webServer` — массив из двух серверов: API (готов, когда
   отвечает `/api/v1/health/live`) и статика (4300). Плагин Nx 24 понимает массив и сам
   ставит обе цели в граф задач. Порты e2e: 4300 / 4301 / 4402 / **4310**.
6. **`smoke.spec.ts`**: `page.route` и чтение контракта убраны. Ожидаемая версия читается
   из `apps/signflow-api/package.json` — из того же файла, откуда её берёт API. В
   `implicitDependencies` `signflow-e2e` вместо контракта теперь `signflow-api`: при
   изменении API `nx affected` запустит эти e2e.

**Тесты: красный первым и мутации.**

- **Красный** (подмена убрана, сервер ещё старый): «Expected: API: OK, Version 0.1.0 ·
  Received: API nicht erreichbar»; новые тесты пути: «Expected: 404 · Received: 200».
- **Зелёный:** 8/8 в `signflow-e2e`, включая axe и страницу 404.
- **Мутация 1** — убрать проверку пути: тесты пути красные. Отдельно руками: без проверки
  сервер **действительно** отдаёт корневой `package.json` по `/../../../../package.json` и
  по `/..%2f..%2f..%2f..%2fpackage.json`; с проверкой оба — 404. То есть тест ловит
  настоящую дыру, а не только ответ-заглушку.
- **Мутация 2** — прокси на порт 4399: «Received: API nicht erreichbar». Тест и правда
  зависит от настоящего API.
- Почему в тесте свой `rawGet` на `node:http`: браузер и `fetch` нормализуют `/../` ещё до
  отправки, и запрос «чинился» бы сам.
- После прогона порты 4300 и 4310 свободны: процессы закрываются вместе с прогоном.

**История находки: `..%2f` (что случилось → как нашли → как исправили → урок).**

- **Что случилось.** Требование владельца звучало так: «запрос `/../package.json` не
  отдаёт файл». Первая проверка в голову напрашивается такая: послать запрос и увидеть 404. Но с обычным клиентом такой тест ничего не докажет. Браузер, `fetch` и
  `new URL()` по стандарту URL выкидывают `/../` ещё до отправки: запрос уходит как
  `/package.json`. Сервер получает безобидный путь, и тест зелёный **даже без защиты**.
  Вторая ловушка: `%2f` — это закодированный `/`. Для парсера URL `..%2f..%2fpackage.json`
  — один обычный сегмент, его никто не «чинит». А сервер вызывает `decodeURIComponent`,
  получает `../../package.json` и выходит из папки.
- **Как нашли.** Через мутацию: временно убрали проверку пути, запустили сервер и
  отправили оба варианта клиентом на `node:http`, который шлёт путь как есть. Оба вернули
  **корневой `package.json` репозитория** — дыра настоящая, а не теоретическая. С проверкой
  оба дают 404. Число `..` подобрано точно (4 уровня до корня): при большем числе путь
  ушёл бы выше репозитория, там `package.json` нет, и тест был бы зелёным даже с дырой.
- **Как исправили.** Проверка идёт **после** декодирования и по **итоговому** пути:
  `resolve(root, '.' + decodeURIComponent(rawPath))`, затем `startsWith(root + sep)`,
  иначе 404. Сервер берёт «сырой» `req.url`, без `new URL()`. Битая кодировка (`%E0`) даёт
  400, а не падение сервера. В тесте — оба варианта пути и свой `rawGet`.
- **Урок.** (1) Проверять нужно то, что реально откроется (итоговый путь), а не то, что
  пришло в URL. (2) Тест безопасности должен уметь отправить «плохой» запрос: если клиент
  сам его исправляет, тест зелёный и бесполезный. (3) Мутация — единственный способ
  узнать, ловит ли тест дыру: зелёный тест без мутации ничего не доказывает.

**Какие были альтернативы и почему отказались.**

- `express` + `http-proxy-middleware`: привычно, но новые зависимости ради временного
  файла.
- CORS в API и адрес API в настройках Angular: в проде страница и API на одном адресе;
  лишняя настройка окружения, которая проду не нужна.
- Свой `proxyUrl` у `@nx/web:file-server`: ломает режим SPA (вопрос из схемы самого
  executor'а).
- Сразу Docker + Caddy: это задача 22 (образы, ADR-0014), рано.

**Что может сломаться и как починить.**

- Симптом: e2e ждут сервер и падают по тайм-ауту → занят порт 4300 или 4310 (старый
  процесс) → `netstat -ano | findstr :4310`, остановить процесс.
- Симптом: «API nicht erreichbar» только в e2e → `signflow-api:build` упал или API не
  стартовал → `pnpm nx run signflow-api:serve-e2e` и смотреть вывод.
- Симптом: тест версии падает после смены версии API → он читает `package.json` API, так
  что такого быть не должно; проверить, что `dist` пересобран (`nx reset`).

**Вопрос с собеседования по этой теме.**

- В: Вы пишете маленький сервер статических файлов. На что смотреть в безопасности?
- О: В первую очередь на выход за пределы папки. Путь из URL декодирую, через
  `path.resolve` превращаю в абсолютный и проверяю, что он лежит внутри корня
  (`startsWith(root + sep)`), иначе 404. Проверяю «сырой» путь, потому что парсер URL и
  браузеры нормализуют `/../`, и тест с ними прошёл бы даже без защиты. Для теста нужен
  клиент, который шлёт путь как есть, и мутация, которая доказывает, что без проверки
  файл утекает.

## 🇬🇧 What and why (full)

**What was done.** SignFlow e2e no longer stub `GET /api/v1/health/live`. Nx builds and
starts the real `signflow-api` on 4310 and the built SignFlow on 4300; "API: OK, Version
0.1.0" now travels browser → static server → `/api` proxy → NestJS. Task 1 is complete.

**Why (real-life analogy).** A stub is a rehearsal with a stand-in reading the partner's
lines; 1d is the first performance with the real partner.

**How it works, step by step.** `signflow-api:serve-e2e` runs the built `main.js` with
`PORT=4310` via the target's `env` (works in PowerShell too). `@nx/web:file-server` uses
its `proxyUrl` for SPA fallback, so it cannot also proxy `/api`; a temporary
`apps/signflow-e2e/static-server.mjs` (~50 lines, `node:http`, no dependencies) proxies
`/api/*` to 4310, serves files from `dist/apps/signflow/browser`, and falls back to
`index.html`. Path check: `path.resolve(root, '.' + decoded path)` must start with
`root + sep`, otherwise 404; it uses the raw path because `new URL()` would drop `/../`
before the check. Task 22 replaces the file with Docker images and Caddy (ADR-0014) and
deletes it; the file header and `next-steps.md` say so. Playwright's `webServer` is an
array of both servers, which the Nx 24 plugin turns into task dependencies. The test
reads the expected version from `apps/signflow-api/package.json`, the API's own source;
`signflow-e2e` now implicitly depends on `signflow-api`.

**Red first and mutations.** Red: "Received: API nicht erreichbar" and "Expected 404,
received 200" for the traversal paths. Green: 8/8 including axe. Mutation 1 (no path
check): traversal tests red, and a manual check showed the repository `package.json` was
really served for both `/../../../../package.json` and the `%2f` variant. Mutation 2
(proxy to 4399): "API nicht erreichbar". The test uses a raw `node:http` client because
browsers and fetch normalize `/../`. Ports 4300 and 4310 are free after the run.

**The `..%2f` story (what happened → how found → how fixed → lesson).** What happened: a
test that requests `/../package.json` with a normal client proves nothing — browsers,
fetch and `new URL()` drop `/../` before sending, so the test is green even without a
guard; and `..%2f` passes the URL parser untouched but becomes `../` after the server's
`decodeURIComponent`. How found: a mutation (guard removed) plus a raw `node:http` client —
both variants returned the repository's own `package.json`; exactly four `..` reach the
root (more would overshoot and pass falsely). How fixed: check the final path after
decoding (`resolve` + `startsWith(root + sep)`, else 404), use the raw `req.url`,
malformed encoding → 400. Lesson: check what will actually be opened; a security test
must be able to send the bad request; only a mutation shows that a test catches the hole.

**Alternatives considered and why rejected.** express + http-proxy-middleware (new
dependencies for a temporary file); CORS and a configurable API URL (production is one
origin); a custom `proxyUrl` on the file server (breaks SPA mode); Docker + Caddy now
(task 22).

**What can break and how to fix it.** Web server timeout → a stale process holds 4300 or 4310. "API unreachable" only in e2e → run `nx run signflow-api:serve-e2e` and read its
output.

**Interview question on this topic.** Q: You write a small static file server — what is
the main security check? A: Path traversal: decode, `path.resolve` against the root,
require the result to stay inside the root, otherwise 404. Test with a client that sends
the raw path, since browsers normalize `/../`, and prove it with a mutation that leaks a
file without the check.

## 🇩🇪 Kurzfassung (Niveau B1)

Die E2E-Tests von SignFlow laufen jetzt gegen die echte, gebaute API und nicht mehr gegen
eine Attrappe. Nx startet die API auf Port 4310 und die gebaute Anwendung auf Port 4300.
Ein kleiner, vorübergehender Server liefert die Dateien aus und leitet `/api` an die API
weiter; so laufen Seite und API unter einer Adresse wie später in Produktion. Der Server
prüft jeden Pfad: Liegt die Datei außerhalb des Build-Ordners, antwortet er mit 404. Eine
Mutation hat gezeigt, dass ohne diese Prüfung die Datei `package.json` des Repositorys
abrufbar war. In Aufgabe 22 ersetzen Docker-Images mit Caddy diesen Server. Damit ist die
erste Aufgabe, der durchgehende Durchstich, fertig.

### Fachwortschatz

| Deutsch                       | English          | Русский                |
| ----------------------------- | ---------------- | ---------------------- |
| der Ende-zu-Ende-Test (E2E)   | end-to-end test  | сквозной тест (e2e)    |
| der Durchstich                | end-to-end slice | сквозной срез          |
| der Stellvertreter (Proxy)    | proxy            | прокси (посредник)     |
| die Weiterleitung             | forwarding       | пересылка              |
| der Verzeichnisausbruch       | path traversal   | выход за пределы папки |
| der gleiche Ursprung (Origin) | same origin      | тот же origin          |
| vorübergehend                 | temporary        | временный              |
| die Attrappe                  | stub             | заглушка               |
