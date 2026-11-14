# 010 · Storybook на GitHub Pages — первый CD: build once, deploy the tested artifact

Date: 2026-11-14 · Task: 010 (план: `docs/plans/010-storybook-pages.md`, ADR-0005) · PR: — · Commits: `c72b2a3`, `d966a63`, `3c63fe7`, (эта запись)

**Адрес: <https://alexaadler2026.github.io/kontur/>**

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Библиотеку компонентов теперь видно по одной ссылке, без клонирования репозитория. Каждый зелёный прогон CI на `main` публикует Storybook на **GitHub Pages** — бесплатном хостинге статических файлов прямо из репозитория. Это первый **CD** (continuous delivery: автоматическая публикация после того, как проверки прошли).

**Главный принцип — build once, deploy the tested artifact** («собери один раз, публикуй то, что проверил»).

- **Артефакт** — архив файлов, который один job в GitHub Actions передаёт другому.
- В job `main` шаг `build-storybook` собирает Storybook. Шаг e2e берёт **эту же сборку из кэша Nx** и прогоняет по ней axe и клавиатурные тесты.
- Затем **эта же папка** загружается как артефакт Pages, а job `deploy-storybook` публикует её **без пересборки**.

**Аналогия из жизни.** Аптека не отправляет покупателю «такую же» упаковку, собранную заново после проверки: она отправляет **ту самую**, на которой стоит штамп контроля качества. Пересобранная — уже другая, даже если рецепт тот же.

**Как это работает, шаг за шагом.**

1. **Job `main`** — как раньше: формат, токены, lint, тесты, сборки, e2e + axe. В конце, **только на `main`**, — шаг `upload-pages-artifact` с папкой `dist/storybook/ui-storybook`. Артефакт хранится 14 дней.
2. **Job `deploy-storybook`.**
   - `needs: main` — стартует только если `main` зелёный.
   - `if:` — только `main` и не `pull_request`. PR, включая PR из форков, никогда его не запускают. Тот же `if` стоит на шаге загрузки, поэтому PR даже не создаёт артефакт Pages.
3. **Минимальные права.**
   - Весь workflow по умолчанию работает с `contents: read`.
   - Только `deploy-storybook` получает `pages: write` и `id-token: write`. **OIDC** (`id-token`) — GitHub выдаёт job одноразовый токен для Pages вместо хранимого секрета.
   - Это проверено разбором `ci.yml`: в списке jobs с правом записи только `deploy-storybook`.
4. **Очередь вместо отмены на `main`.** Раньше новый push отменял идущий прогон и мог оборвать публикацию на середине. Теперь отмена работает только для PR, а на `main` прогоны идут по очереди. У deploy-job своя группа `pages` без отмены.
5. **Подпуть.** Pages раздаёт сайт с `/kontur/`, а не с корня. Перед коммитом я раздал сборку под `/kontur/` локально и открыл story: 0 ответов ≥ 400, шрифты загружены. Пути в сборке Storybook относительные, правка не понадобилась.

**Первый деплой — сбой и его причина.**

- Прогон `43615502853`, попытка 1: job `main` зелёный, артефакт загружен, но `deploy-storybook` упал с `HttpError: Not Found … Ensure GitHub Pages has been enabled`.
- По API: `has_pages: false`, `GET /repos/…/pages` → 404. Pages не был включён в настройках, хотя окружение `github-pages` уже существовало (его создал сам deploy-job).
- Владелец включил Pages и нажал «Re-run failed jobs». Попытка 2 зелёная.
- **Заодно это первая реальная проверка «быстрого отката» из ADR-0005.** Перезапуск deploy-job опубликовал уже проверенный артефакт этого прогона, ничего не пересобирая.

**Проверка опубликованного адреса (`curl`, 2026-11-14):**

```
200 text/html        3189 B   /kontur/
200 text/html        3189 B   /kontur/index.html
200 text/html       16966 B   /kontur/iframe.html
200 application/json  7666 B  /kontur/index.json
200 font/woff2       15000 B  /kontur/IBMPlexSans-500-cyrillic.8f83abe510ff79cc.woff2
```

- В `index.json` опубликовано **27 story**, столько же, сколько в локальной сборке. `components-switch--dark-theme` на месте.
- Скрипт Playwright по живому адресу: 0 ответов ≥ 400; загружены IBM Plex Sans 400/500 и кириллица 500.
- `index.json` совпадает с локальным байт в байт. `iframe.html` отличается: опубликована **сборка из CI** (Linux), а не моя локальная, и хеши бандлов разные. Ровно так и должно быть: опубликован проверенный в CI артефакт.

**Почему отдельный e2e smoke по опубликованному адресу не нужен.**
axe по всем story и клавиатурные e2e уже прошли **по тем же байтам**, которые опубликованы: тот же артефакт, без пересборки. Повторять их на Pages значило бы проверять те же файлы второй раз. Отличаться может только **хостинг**:

- **подпуть** `/kontur/` — проверен до коммита локально и после деплоя по живому адресу;
- **HTTPS и заголовки** — их даёт GitHub, а `curl` показал правильные `content-type`, включая `font/woff2`.

Если позже появится то, что зависит от хостинга (Service Worker, редиректы, CSP), — тогда smoke по адресу станет нужен.

**Как откатить** (ADR-0005):

1. `git revert` плохого коммита → CI → публикация. Основной способ.
2. «Re-run jobs» у `deploy-storybook` в старом зелёном прогоне — пока жив его артефакт (14 дней). Уже опробован в этой задаче.
3. Settings → Pages → Unpublish — аварийно.

**Какие были альтернативы и почему отказались.**

- **Отдельный workflow через `workflow_run`.** Он запускается на новой машине без кэша Nx (Nx Cloud мы не используем), значит, пересобрал бы Storybook и опубликовал не то, что проверено.
- **Chromatic, Netlify или Vercel.** Это лишний аккаунт и секрет. Превью для каждого PR пока не нужно.

**Что может сломаться и как починить.**

- Симптом: deploy-job падает с `Not Found`. → Причина: Pages выключен. → Что делать: Settings → Pages → Source «GitHub Actions», затем «Re-run failed jobs».
- Симптом: сайт без стилей или шрифтов. → Причина: в сборке появились абсолютные пути (`/…`). → Что делать: проверить сборку под подпутём, как в этой задаче.
- Симптом: опубликована старая версия. → Причина: deploy стоит в очереди за предыдущим прогоном. → Что делать: смотреть Actions, это ожидаемо при частых push.

**Вопрос с собеседования по этой теме.**

- В: Как вы публикуете Storybook и почему не пересобираете его в deploy-job?
- О:
  - Принцип **build once, deploy the tested artifact**: CI собирает Storybook один раз, e2e и axe проверяют именно эту сборку, а deploy-job через `needs` публикует тот же артефакт на GitHub Pages.
  - Пересборка дала бы другие байты, которые никто не проверял.
  - Права на запись (`pages`, `id-token` через OIDC) есть только у deploy-job.
  - Deploy не запускается для pull request, в том числе из форков.
  - Откат — `git revert` или перезапуск deploy старого прогона.

## 🇬🇧 What and why (full)

**Address: <https://alexaadler2026.github.io/kontur/>**

**What was done.** Every green CI run on `main` publishes the component Storybook to GitHub Pages — the repo's first CD.

**Principle: build once, deploy the tested artifact.** The `build-storybook` step builds Storybook once. The e2e step reuses that build from the Nx cache for axe and the keyboard tests. The same folder is uploaded as the Pages artifact and published by `deploy-storybook` without a rebuild. Like a pharmacy shipping the very package that carries the QA stamp, not a freshly packed copy.

**How it works, step by step.**

1. **Job `main`.** Unchanged checks, then — on `main` only — `upload-pages-artifact` (retention 14 days).
2. **Job `deploy-storybook`.** It has `needs: main` and `if:` main and not `pull_request`, so fork PRs are excluded. The upload step has the same condition.
3. **Least privilege.** `contents: read` by default; only `deploy-storybook` has `pages: write` and `id-token: write` (OIDC). Verified by parsing `ci.yml`.
4. **Concurrency.** PR runs cancel; `main` runs queue; deploy uses the `pages` group without cancellation.
5. **Subpath `/kontur/`.** Checked locally before the commit and live after the deploy.

**First deploy failure.** Run `43615502853` attempt 1 failed with `HttpError: Not Found`: Pages was not enabled (`has_pages: false`, `GET /pages` 404). The owner enabled it and re-ran the failed job, and attempt 2 was green. That was also a real test of the fast rollback path: a re-run republishes the tested artifact without rebuilding.

**Live check:**

- `curl` returned 200 for `/`, `index.html`, `iframe.html`, `index.json` and a `.woff2` font, with correct content types;
- 27 stories were published, the same as locally;
- the Playwright script against the live URL saw 0 responses ≥ 400 and loaded the fonts;
- `index.json` is identical to the local file. `iframe.html` differs because the CI build (Linux), not my local build, is published — as intended.

**Why no separate smoke e2e on the published URL.** axe and the keyboard e2e already ran against the same bytes. Only hosting can differ: the subpath (checked locally and live) and HTTPS/headers (provided by GitHub; `curl` showed correct types). Revisit if something host-dependent appears (service worker, redirects, CSP).

**Rollback.** `git revert` (normal), re-run an older deploy within 14 days (fast, already exercised), or Unpublish (emergency).

**Alternatives considered and why rejected.**

- **A `workflow_run` workflow.** It would rebuild on a fresh runner, so the published build would not be the tested one.
- **External hosts.** They add an account and a secret, and are not needed yet.

**Interview question on this topic.**

- **Q:** How do you deploy Storybook, and why no rebuild in the deploy job?
- **A:**
  - Build once, deploy the tested artifact: the deploy job (`needs`) publishes the exact build that passed e2e and axe.
  - Write rights exist only in the deploy job, via OIDC.
  - Pull requests and forks never deploy.
  - Rollback is a revert or a re-run of an older deploy.

## 🇩🇪 Kurzfassung (Niveau B1)

Das Storybook der Komponentenbibliothek ist jetzt öffentlich unter <https://alexaadler2026.github.io/kontur/> erreichbar. Nach jedem grünen CI-Lauf auf `main` wird es automatisch auf GitHub Pages veröffentlicht – das ist unser erstes Continuous Delivery. Das Prinzip heißt „build once, deploy the tested artifact“: Wir veröffentlichen genau den Build, den die E2E-Tests und axe geprüft haben, ohne ihn neu zu bauen. Nur der Deploy-Job hat Schreibrechte, und Pull Requests – auch aus Forks – lösen keinen Deploy aus. Der erste Deploy ist fehlgeschlagen, weil GitHub Pages in den Einstellungen nicht aktiviert war; nach dem Aktivieren hat ein erneuter Start des Jobs funktioniert. Zurückrollen kann man mit `git revert` oder mit einem erneuten Start eines älteren Deploys.

### Fachwortschatz

| Deutsch                            | English                                | Русский                               |
| ---------------------------------- | -------------------------------------- | ------------------------------------- |
| die Bereitstellung (Deployment)    | deployment                             | публикация, деплой                    |
| die kontinuierliche Auslieferung   | continuous delivery                    | непрерывная доставка (CD)             |
| das Artefakt                       | artifact                               | артефакт                              |
| einmal bauen, Geprüftes ausliefern | build once, deploy the tested artifact | собери один раз, публикуй проверенное |
| die Berechtigung                   | permission                             | право доступа                         |
| das Prinzip der minimalen Rechte   | least privilege                        | принцип минимальных прав              |
| zurückrollen                       | to roll back                           | откатить                              |
| der Unterpfad                      | subpath                                | подпуть                               |
| die Warteschlange                  | queue                                  | очередь                               |
| aktivieren                         | to enable                              | включить                              |
| erneut ausführen                   | to re-run                              | перезапустить                         |
