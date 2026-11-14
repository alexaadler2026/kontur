# 003 · Токены Kontur: CSS генерируется из tokens.json

Date: 2026-11-14 · Task: 003 (план: `docs/plans/003-design-tokens.md`) · PR: — · Commits: `dcc8a29`…(эта запись)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Приложения больше не выглядят как «голый» HTML. Фон страницы теперь `--bg-page` (`#f7f8fa`), текст `--text-primary` (`#161b22`), шрифт IBM Plex Sans. Все эти значения не написаны руками: их **генерирует** маленькая программа `tools/tokens` из файла дизайн-системы `docs/design/tokens.json`.

- **Токен** — это именованное значение дизайна. Например, `--brand` = `#0e5a6b` в светлой теме и `#4fb3c4` в тёмной.
- **Генератор** превращает JSON в CSS: 10 правил `@font-face`, переменные для светлой и тёмной темы, отступы, радиусы, классы текста `.h1` … `.mono-sm`.
- **Golden-тест** («золотой эталон») проверяет, что результат совпадает с эталонным `docs/design/tokens.css` правило в правило.
- **CI** падает, если кто-то поменял JSON и забыл перегенерировать CSS.

**Зачем это нужно (аналогия из жизни).**
`tokens.json` — это рецепт, а `tokens.css` — блюдо. Раньше блюдо приходилось готовить по памяти: переписывать цвета руками и надеяться, что ничего не перепутал. Теперь блюдо готовит автомат строго по рецепту. Golden-тест — дегустатор, который сравнивает результат с эталонной тарелкой шеф-повара. CI — контролёр, который не выпустит в зал тарелку, приготовленную по старому рецепту.

**Как это работает, шаг за шагом.**

1. **`generateTokensCss(tokens)`** (`tools/tokens/src/generate-tokens.mts`) — **чистая функция**: получает объект из JSON и возвращает строку CSS, ничего не читает и не пишет на диск. Поэтому её легко тестировать.
   - **Шрифты:** для каждого latin-начертания из `type.fonts` сразу добавляется кириллический двойник из `type.fontSubsets.files` (то же семейство, вес, стиль). У каждого свой `unicode-range` из `fontSubsets.unicodeRanges`.
   - **Темы:** цвета и тени собираются по `color.themes`. Первая тема (`light`) получает селектор `:root, [data-theme="light"]`, то есть действует по умолчанию. `dark` получает `[data-theme="dark"]`. Ссылка `{brand}` превращается в `var(--brand)`.
   - **Остальное:** блок `:root` с отступами, радиусами, размерами и `--font-sans`/`--font-mono`; классы текстовых стилей, у `.label` есть `letter-spacing`, у `.mono` есть `tabular-nums`.
2. **Golden-тест** (`generate-tokens.spec.mts`) написан **до** генератора и сначала был красным: `Cannot find module`. Он разбирает эталон и результат парсером **postcss** и сравнивает правила без учёта пробелов. Затем отдельно проверяет: 10 `@font-face`, 26 переменных в каждой теме, 10 классов. Его «чувствительность» проверена: при порче генератора (другой `font-display` или пропавший `letter-spacing`) тест падал.
3. **CLI** (`cli.mts`) запускается обычным `node`, без сборки. **Node 24 умеет «стирать» типы TypeScript** (type stripping): удаляет аннотации и выполняет оставшийся JavaScript. CLI пишет `libs/ui/src/styles/tokens.css` и копирует 10 файлов шрифтов. С флагом `--check` он ничего не пишет, только сравнивает и при расхождении завершается с кодом 1.
4. **`erasableSyntaxOnly`** в `tools/tokens/tsconfig.json`. Type stripping умеет только _удалять_ типы. Но есть конструкции TypeScript, которые превращаются в настоящий JavaScript-код:
   - `enum`;
   - `namespace`;
   - parameter properties (`constructor(private x: string)`).

   Node на них падает при запуске (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). Опция заставляет компилятор TypeScript запрещать их заранее (`error TS1294`). Важная деталь: Node и Vitest типы **не проверяют**, поэтому добавлена цель `typecheck` (`tsc`), и она запускается в CI.

5. **Nx-цели** в `tools/tokens/project.json`:
   - `generate`: inputs — `tokens.json`, шрифты, исходники; outputs — CSS и шрифты; кэшируется. Повторный запуск без изменений берёт результат из кэша (`Cache: 1/1 hit`);
   - `check`: проверяет, что закоммиченный CSS актуален;
   - `test`: golden-тест;
   - `typecheck`: проверка типов (`tsc`).
6. **Подключение.**
   - В `project.json` каждого приложения и Storybook в `styles` добавлены `tokens.css` и `base.css`. `base.css` написан руками: только `margin: 0` и `var(--bg-page)`/`var(--text-primary)`.
   - У `<body>` стоит класс `body`: шрифт 14/20 берётся из сгенерированного стиля, а не дублируется.
   - Сборщик Angular (esbuild) сам находит `url("fonts/…woff2")` и кладёт файлы в сборку с хэшем в имени.
   - `ng-package.json` (`assets`) кладёт стили и шрифты в npm-пакет.
7. **E2E** проверяет в настоящем Chromium:
   - фон `rgb(247, 248, 250)`, цвет текста `rgb(22, 27, 34)`, шрифт начинается с `"IBM Plex Sans"`;
   - 10 зарегистрированных начертаний;
   - `document.fonts.load(…, 'Ä')` загружает latin-файл, а `…'Ж'` — файл с кириллическим `unicode-range`.
8. **CI:** новый шаг «Design tokens up to date» (`tokens:check`) запускается всегда. `tokens.json` лежит вне проектов Nx, и `affected` мог бы его изменение пропустить.

**Какие были альтернативы и почему отказались.**

- **Style Dictionary.** Это стандарт индустрии, но у нашего JSON свой формат. Пришлось бы писать конвертер плюс кастомные форматы для тем, `@font-face` и классов, то есть конфигурации больше, чем кода. Вернёмся к нему, если появятся iOS/Android или несколько брендов (ADR-0002).
- **Скопировать `tokens.css` руками.** Значения тихо разъедутся с дизайн-системой, а README дизайна прямо требует генерации.
- **Не коммитить сгенерированный CSS, генерировать при сборке.** Ревьюер не увидит в PR, какой CSS реально изменился.
- **Сравнивать CSS как текст.** Тест падал бы из-за пробелов: в эталоне несколько переменных стоят на одной строке. postcss сравнивает смысл, а не форматирование.
- **Файлы `.ts` вместо `.mts`.** Node выдавал предупреждение, что тип модуля не указан. Добавлять `"type": "module"` в корневой `package.json` ради одного скрипта — слишком широкое изменение.

**Что может сломаться и как починить.**

- Симптом: CI падает на «Design tokens up to date» с `tokens.css is out of date`. → Причина: поменяли `tokens.json` или шрифты и не перегенерировали. → Что делать: `pnpm nx run tokens:generate`, закоммитить `libs/ui/src/styles`.
- Симптом: кто-то поправил `tokens.css` руками. → Причина: в шапке файла написано «Do not edit», но правку не заметили. → Что делать: `tokens:check` поймает её; править нужно JSON, а не CSS.
- Симптом: `error TS1294` в `typecheck`. → Причина: в `tools/tokens` появился `enum` или похожая конструкция. → Что делать: заменить на union-тип (`type Theme = 'light' | 'dark'`) или объект `as const`.
- Симптом: golden-тест падает после нового снапшота дизайна. → Причина: эталон `tokens.css` и JSON разошлись, или в JSON появилось новое поле. → Что делать: сравнить, научить генератор новому полю и не трогать эталон.
- Симптом: в браузере шрифт — системный, а не Plex. → Причина: стили не подключены в `project.json`, или у `<body>` нет `class="body"`. → Что делать: проверить оба места; e2e-тест это ловит.

**Вопрос с собеседования по этой теме.**

- В: Как вы гарантируете, что CSS-переменные в коде совпадают с дизайн-системой?
- О: Дизайн-токены лежат в одном JSON — это источник правды. CSS из него генерирует скрипт и коммитит результат, чтобы изменения были видны на code review. Golden-тест сравнивает вывод генератора с эталонным CSS дизайн-системы правило в правило, через CSS-парсер, а не построчно. В CI отдельная проверка перегенерирует CSS в памяти и падает, если закоммиченный файл устарел. Руками значения никто не переписывает, а рассинхрон ловится машиной.

## 🇬🇧 What and why (full)

**What was done.**
The apps no longer look like bare HTML. The page background is `--bg-page` (`#f7f8fa`), the text colour is `--text-primary` (`#161b22`) and the font is IBM Plex Sans. None of these values is typed by hand: a small program, `tools/tokens`, **generates** them from the design-system file `docs/design/tokens.json`.

- **A design token** is a named design value, e.g. `--brand` = `#0e5a6b` in light and `#4fb3c4` in dark theme.
- **The generator** turns the JSON into CSS: 10 `@font-face` rules, light and dark theme variables, spacing, radius and text-style classes `.h1` … `.mono-sm`.
- **A golden test** proves the output equals the reference `docs/design/tokens.css` rule for rule.
- **CI** fails when someone changes the JSON and forgets to regenerate the CSS.

**Why (real-life analogy).**
`tokens.json` is the recipe and `tokens.css` is the dish. Before, the dish was cooked from memory: copy the colours and hope nothing is wrong. Now a machine cooks strictly by the recipe. The golden test is the taster comparing it with the chef's reference plate, and CI is the inspector who stops a plate cooked from an old recipe.

**How it works, step by step.**

1. **`generateTokensCss(tokens)` is a pure function:** JSON object in, CSS string out, no file system.
   - **Fonts:** every latin face from `type.fonts` is followed by its cyrillic twin from `type.fontSubsets.files`, each with the `unicode-range` of its subset.
   - **Themes:** colours and shadows are grouped by `color.themes`. The first theme is the default (`:root, [data-theme="light"]`), and `{brand}` becomes `var(--brand)`.
   - **The rest:** a `:root` block with spacing, radius, sizes and font stacks, plus one class per text style.
2. **The golden test was written first** and was red at the start (`Cannot find module`). It parses the reference and the output with **postcss** and compares rules ignoring whitespace. Breaking the generator on purpose made it fail, so the test is sensitive.
3. **The CLI runs on plain `node`**, because Node 24 strips TypeScript types and runs the remaining JavaScript. It writes the CSS and copies the fonts. With `--check` it only compares and exits with code 1 on drift.
4. **`erasableSyntaxOnly`.** Type stripping can only _remove_ types. `enum`, `namespace` and parameter properties generate runtime code, so Node fails on them at runtime (`ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX`). The option makes the TypeScript compiler reject them up front (`error TS1294`). Because Node and Vitest never type-check, a `typecheck` target (`tsc`) was added and runs in CI.
5. **Nx targets:**
   - `generate` is cached, with inputs (JSON, fonts, source) and outputs (CSS, fonts); a second run is a cache hit;
   - `check` verifies the committed CSS is up to date;
   - `test` runs the golden test;
   - `typecheck` runs `tsc`.
6. **Wiring:**
   - the apps and the Storybook host list `tokens.css` and `base.css` in `styles`;
   - `<body class="body">` reuses the generated text style;
   - esbuild bundles the fonts with hashed names;
   - `ng-package.json` ships the styles and fonts in the npm package.
7. **E2E in real Chromium** checks the background, text colour and font stack, that 10 faces are registered, and that `Ä` loads a latin file while `Ж` loads the cyrillic one.
8. **CI:** "Design tokens up to date" (`tokens:check`) runs on every build, because `tokens.json` lies outside Nx projects and `affected` could miss it.

**Alternatives considered and why rejected.**

- **Style Dictionary.** Our JSON format would need a converter plus custom formats; that is more configuration than code. Revisit it for iOS/Android or multiple brands (ADR-0002).
- **Copying `tokens.css` by hand.** It drifts silently and violates the design README.
- **Generating at build time without committing.** Reviewers would not see the CSS diff.
- **Comparing the CSS as text.** Whitespace differences would break the test; postcss compares meaning.
- **`.ts` instead of `.mts`.** It triggers a Node module-type warning, and fixing that would require `"type": "module"` in the root `package.json`.

**What can break and how to fix it.**

- **CI fails with `tokens.css is out of date`.** Run `pnpm nx run tokens:generate` and commit `libs/ui/src/styles`.
- **Someone hand-edited `tokens.css`.** `tokens:check` catches it; edit the JSON instead.
- **`error TS1294` in `typecheck`.** Replace the `enum` with a union type or an `as const` object.
- **The golden test fails after a new design snapshot.** Teach the generator the new field; never edit the reference.
- **The page shows a system font.** Check the `styles` entry in `project.json` and `class="body"` on `<body>`; e2e catches this.

**Interview question on this topic.**

- **Q:** How do you guarantee that the CSS variables in code match the design system?
- **A:**
  - One JSON file holds the design tokens and is the single source of truth.
  - A script generates the CSS from it and the output is committed, so reviews show the real diff.
  - A golden test compares the generator output with the design system's reference CSS rule by rule, using a CSS parser rather than line by line.
  - CI regenerates in memory and fails if the committed file is stale. Nobody copies values by hand, and drift is caught by a machine.

## 🇩🇪 Kurzfassung (Niveau B1)

In dieser Aufgabe haben wir die Design-Tokens von Kontur in die Bibliothek `libs/ui` gebracht. Die CSS-Datei wird nicht von Hand geschrieben: Ein kleines TypeScript-Programm erzeugt sie aus `tokens.json`. Ein Golden-Test vergleicht das Ergebnis Regel für Regel mit der Referenzdatei `tokens.css`. Den Test haben wir zuerst geschrieben, erst danach den Generator. Die Apps und Storybook nutzen jetzt die Hintergrundfarbe, die Textfarbe und die Schrift IBM Plex mit lateinischen und kyrillischen Schriftdateien. Die CI schlägt fehl, wenn das CSS nicht mehr zur JSON-Datei passt. Die wichtigste Entscheidung: ein eigener Generator statt Style Dictionary, weil er einfacher zu erklären und zu testen ist.

### Fachwortschatz

| Deutsch                                 | English                | Русский                            |
| --------------------------------------- | ---------------------- | ---------------------------------- |
| das Design-Token                        | design token           | дизайн-токен                       |
| die Quelle der Wahrheit                 | single source of truth | единый источник правды             |
| der Generator                           | generator              | генератор                          |
| erzeugen / generieren                   | to generate            | генерировать                       |
| der Golden-Test (Referenzvergleich)     | golden test            | golden-тест (сравнение с эталоном) |
| die reine Funktion                      | pure function          | чистая функция                     |
| die Schriftart                          | font                   | шрифт                              |
| der Zeichensatz-Bereich (unicode-range) | unicode range          | диапазон символов                  |
| kyrillisch                              | Cyrillic               | кириллический                      |
| das dunkle Design (Dark Mode)           | dark theme             | тёмная тема                        |
| die Typprüfung                          | type check             | проверка типов                     |
| veraltet                                | out of date            | устаревший                         |
| der Zwischenspeicher (Cache)            | cache                  | кэш                                |
