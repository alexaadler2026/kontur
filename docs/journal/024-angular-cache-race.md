# 024 · Angular cache race: Storybook failed with ENOENT in fresh parallel runs

Date: 2026-11-21 · Task: found in 1c, fixed before 1d · PR: — · Commits: `fix(deps)` after `74308a4`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
В свежем параллельном прогоне (`nx run-many … build build-storybook --skip-nx-cache`)
сборка Storybook падала с `ENOENT: no such file or directory … .angular/cache/21.2.30/…`.
Теперь в корневом `package.json` закреплён `@angular-devkit/build-angular` **`22.2.7`**:
у всех сборщиков Angular одна версия, а значит одна папка кэша. Ошибка ушла.

Термины:

- **Кэш сборки (`.angular/cache`)** — папка, куда Angular складывает уже скомпилированные
  файлы, чтобы следующая сборка шла быстрее. Внутри — по подпапке на версию сборщика.
- **`@angular/build`** — новый сборщик Angular (esbuild); им собираются наши приложения.
- **`@angular-devkit/build-angular`** — старый сборщик на webpack; через него собирает
  Storybook.
- **Гонка (race condition)** — ошибка, которая появляется только тогда, когда две задачи
  идут одновременно и мешают друг другу.

**Зачем это нужно (аналогия из жизни).**
Два повара в одной кухне. Новый повар каждое утро выбрасывает из холодильника всё, что
подписано не его именем: «это старьё». Старый повар как раз положил туда заготовки и
через минуту за ними приходит — а их нет. Исправление: оба подписывают продукты одним
именем, и выбрасывать нечего.

**Как это работает, шаг за шагом.**

1. **Причина в исходниках.** `@angular/build` 22, файл `src/utils/purge-cache.js`: в
   начале каждой сборки удаляет из `.angular/cache` все подпапки, кроме своей версии
   (`22.2.7`).
2. Storybook (`@storybook/angular` 10.6.7) собирает через `@angular-devkit/build-angular`.
   pnpm подобрал его сам, в версии **21.2.30**, и тот писал в `.angular/cache/21.2.30`.
3. Nx запускает сборки параллельно. Сборка SignFlow стартует → удаляет `21.2.30` →
   Storybook в этот момент пишет туда → `ENOENT`. Отдельно Storybook собирается без ошибок —
   поэтому и гонка.
4. **Шаг 1 по порядку владельца — обновить Storybook?** Нет: ни 10.6.8, ни бета 11.0.0
   не умеют собирать через `@angular/build`, все требуют `build-angular`. Обновление
   причину не убирает.
5. **Исправление.** `build-angular` 22 принимают все: `@storybook/angular`
   (`>=18 <23`) и `@nx/angular` 24.0.6 (`>=20 <23`). Закрепили `22.2.7` в корневом
   `package.json`.
6. **Ловушка при исправлении.** Сначала поставили `~22.2.7`. pnpm выбрал **22.2.8**, а
   тот требует `@angular/build` **ровно** 22.2.8. Получилось два `@angular/build` (22.2.7 и
   22.2.8), то есть снова две папки кэша. Поэтому версия **точная, без `~`**. Проверка:
   `pnpm why @angular/build` → `Found 1 version`.
7. **Правило, чтобы не вернулось:** `@angular/build` и `@angular-devkit/build-angular`
   обновляются вместе, на одну версию (`docs/plans/next-steps.md`, раздел «Обновление
   зависимостей»).

**Доказательство.**

- До исправления: `rm -rf .angular/cache` + свежий параллельный прогон → 7 строк `ENOENT`,
  `ui-storybook:build-storybook` упал; в кэше папки `21.2.30` и `22.2.7`.
- После: три прогона подряд, каждый с `rm -rf .angular/cache` и `--skip-nx-cache` →
  0 `ENOENT`, все цели зелёные (12 проектов), в кэше одна папка `22.2.7`.
- `CI=true pnpm nx run-many -t e2e` — e2e Storybook (с axe) работает на новом сборщике.

**Какие были альтернативы и почему отказались.**

- Обновить Storybook: не помогает (см. шаг 4).
- Свой путь к кэшу для Storybook: лечит симптом, две версии сборщика остаются. Был
  запасным шагом 2.
- Отдельный шаг CI для Storybook: медленнее и прячет проблему; запасной шаг 3.
- Выключить кэш Angular (`cli.cache.enabled: false`): сборки медленнее, причина остаётся.

**Что может сломаться и как починить.**

- Симптом: снова `ENOENT … .angular/cache/<версия>` → `pnpm why @angular/build` показывает
  две версии → выровнять `@angular-devkit/build-angular` и `@angular/build` на одну.
- Симптом: после `pnpm update` Angular обновился, а `build-angular` — нет (он закреплён) →
  это ожидаемо: поднять его руками до той же версии.

**Вопрос с собеседования по этой теме.**

- В: Тест падает только в CI и только иногда. С чего начнёте?
- О: С гипотезы о гонке или общем состоянии: в CI всё «свежее» и идёт параллельно. Повторю
  локально в тех же условиях — чистый кэш, параллельный запуск, без кэша Nx — и запишу
  красный прогон. Здесь причиной была общая папка кэша, которую одна версия сборщика
  чистила за другую. Найдя причину — убираю её (одна версия), а не прячу ретраями, и
  доказываю несколькими свежими прогонами подряд.

## 🇬🇧 What and why (full)

**What was done.** In a fresh parallel run, the Storybook build failed with `ENOENT …
.angular/cache/21.2.30/…`. `@angular-devkit/build-angular` is now pinned to `22.2.7` in
the root `package.json`, so all Angular builders share one version and one cache folder.

**Why (real-life analogy).** A new cook throws out everything in the fridge not labelled
with their name; the old cook's prepared food vanishes mid-shift. Fix: one label for both.

**How it works, step by step.** `@angular/build` 22 (`purge-cache.js`) deletes every
`.angular/cache` subfolder except its own version at the start of each build. Storybook
builds through `build-angular`, which pnpm had resolved to 21.2.30, writing to
`21.2.30`; a parallel SignFlow build deleted it mid-write. Updating Storybook does not
help: 10.6.8 and 11.0.0-beta still require `build-angular` and cannot use
`@angular/build`. Both `@storybook/angular` and `@nx/angular` accept `build-angular` 22, so
it is pinned. `~22.2.7` resolved to 22.2.8, which needs `@angular/build` exactly 22.2.8 —
two versions again — hence the exact pin. Rule: `@angular/build` and
`@angular-devkit/build-angular` are updated together, to the same version.

**Proof.** Before: 7 `ENOENT` lines, `build-storybook` failed, cache folders `21.2.30` and
`22.2.7`. After: three runs in a row, each with a deleted cache and `--skip-nx-cache`,
0 `ENOENT`, all green, one cache folder `22.2.7`; e2e (including Storybook with axe) green.

**Alternatives considered and why rejected.** Update Storybook (no effect); separate
Storybook cache path (treats the symptom); separate CI step (slower, hides it); disabling
the Angular cache (slower, cause remains).

**What can break and how to fix it.** `ENOENT` in `.angular/cache` again → `pnpm why
@angular/build` shows two versions → align both packages. After `pnpm update` Angular moves
but `build-angular` does not (pinned) → bump it by hand to the same version.

**Interview question on this topic.** Q: A build fails only in CI, only sometimes — where
do you start? A: Suspect shared state under parallelism. Reproduce with the same
conditions (clean cache, parallel, no task cache), record the red run, remove the cause
rather than adding retries, and prove it with several fresh runs in a row.

## 🇩🇪 Kurzfassung (Niveau B1)

Bei einem frischen, parallelen Durchlauf ist der Build von Storybook manchmal mit
`ENOENT` abgebrochen. Der Grund: Der neue Angular-Builder löscht bei jedem Start die
Cache-Ordner aller anderen Versionen. Storybook hat mit einer älteren Version (21) in
genau so einen Ordner geschrieben. Ein Update von Storybook hilft nicht, weil Storybook
weiterhin den alten Builder braucht. Wir haben deshalb `@angular-devkit/build-angular`
genau auf Version 22.2.7 festgelegt; jetzt gibt es nur einen Cache-Ordner. Drei frische
Durchläufe hintereinander waren ohne Fehler. Neue Regel: Beide Builder-Pakete werden
immer zusammen auf dieselbe Version aktualisiert.

### Fachwortschatz

| Deutsch                        | English         | Русский               |
| ------------------------------ | --------------- | --------------------- |
| der Zwischenspeicher (Cache)   | cache           | кэш                   |
| die Wettlaufsituation          | race condition  | гонка                 |
| parallel ausführen             | run in parallel | запускать параллельно |
| die Version festlegen (pinnen) | pin a version   | закрепить версию      |
| die Abhängigkeit               | dependency      | зависимость           |
| die Ursache                    | root cause      | первопричина          |
| der frische Durchlauf          | fresh run       | свежий прогон         |
