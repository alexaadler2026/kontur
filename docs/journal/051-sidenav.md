# 051 · UI-4a: SideNav в libs/ui

Date: 2026-11-26 · Task: план 051, шаг UI-4a · PR: — · Commits: feat(ui): add k-sidenav, k-sidenav-item, k-sidenav-group

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
В библиотеке компонентов появилась боковая навигация из трёх частей:

- `<k-sidenav ariaLabel="…">`: ориентир (landmark) `<nav>`, то есть «раздел страницы», к
  которому скринридер умеет прыгать. Слоты (места для своего содержимого): `[kSidenavBrand]`
  сверху, пункты, `[kSidenavFooter]` внизу (профиль).
- `<a k-sidenav-item [count]="3">`: пункт-ссылка, иконку вставляет приложение;
- `<k-sidenav-group label="Verwaltung">`: группа пунктов с подписью.

Стили взяты 1:1 из `docs/design/components.css`. Есть 6 stories (Default, Active item,
Counts, Group, Focused, Dark theme), 7 unit-тестов и 2 e2e-теста в настоящем Chromium.
Попутно починена установка: в `node_modules` у пакета `nx` пропала папка `dist/bin`.
Повреждённую копию удалили, `pnpm install --frozen-lockfile` поставил её заново, код
репозитория не менялся.

**Зачем это нужно (аналогия из жизни).**
SideNav как оглавление на стене в офисном здании: этажи (пункты), «вы здесь» (активный
пункт), отдельный блок «Служебные помещения» (группа). Библиотека делает саму табличку, а
что на ней написано и куда ведут стрелки, решает здание (приложение с роутером).

**Как это работает, шаг за шагом.**

1. Библиотека **не знает о роутере**. Какой пункт активен, приложение сообщает атрибутом
   `aria-current="page"` (`routerLinkActive` + `ariaCurrentWhenActive="page"`). CSS
   оформляет пункт по этому атрибуту. Поэтому компонент подойдёт и Belegscan, и Storybook.
2. **Счётчик.** Доступное имя (то, что зачитывает скринридер) должно быть «Entwürfe, 3», а
   не «Entwürfe3». Для этого рядом с текстом стоит невидимый span с «, 3», а у видимого
   числа есть `aria-hidden="true"`, чтобы его не прочитали дважды.
3. **Почему так сложно, две ловушки:**
   - jsdom (браузер-имитация в unit-тестах) обрезает пробелы по краям каждого элемента:
     span «, » плюс span «3» дают «Entwürfe,3». Поэтому «, 3» лежит в одном span.
   - Настоящий Chromium ставит пробел между flex-элементами и вокруг `position:absolute`:
     обычный «sr-only» давал «Entwürfe , 3». Поэтому текст и скрытый span завёрнуты в один
     `.k-sidenav-text`, а скрытый span строчный и спрятан через `font-size: 0`.
   - Вывод: unit-тест такую ошибку не ловит, её нашёл только e2e в браузере.
4. **Видимый фокус.** Общее правило фокуса Kontur (`kontur-base.css`) не перечисляет
   `.k-sidenav-item`, поэтому в `sidenav.css` добавлены те же токены: `--focus-width`,
   `--focus-ring`, отступ 2px. Story «Focused» показывает фокус статически через `.is-focus`.
5. **Группа:** `role="group"` + `aria-labelledby` на id подписи. id уникальный (счётчик
   `nextId`, как у Tag и Checkbox).

**Какие были альтернативы и почему отказались.**

- `aria-label` на ссылке с полным текстом. Отказались: компонент не знает текст пункта
  (его передаёт приложение), пришлось бы дублировать его во входном параметре.
- Иконка по имени (`icon="file-text"`, как в контракте). Отказались: для этого нужен
  реестр всех иконок Lucide в бандле; вставка `<svg lucide…>` проще и не тянет лишнего.
- Обычный «sr-only» с `position:absolute`. Отказались: Chromium добавляет пробел (см. выше).

**Что может сломаться и как починить.**

- Симптом: имя «Entwürfe , 3» → Причина: скрытый span стал блочным или вышел из
  `.k-sidenav-text` → Что делать: держать его строчным внутри обёртки, запустить
  `sidenav.spec.ts` в e2e.
- Симптом: axe в тёмной story ругается на контраст → Причина: обёртка story без
  `color: var(--text-primary)`, логотип наследует светлый цвет от `body` → добавить цвет
  обёртке.
- Риск: текст с `font-size: 0` в редких скринридерах может пропускаться. Проверить вручную
  в NVDA при сборке каркаса (8a-1).

**Вопрос с собеседования по этой теме.**

- В: Почему компонент навигации в библиотеке не использует `RouterLinkActive` сам?
- О: Библиотека не должна зависеть от роутера: её используют разные приложения и
  Storybook. Активность передаётся стандартным атрибутом `aria-current="page"`, его
  понимают и CSS, и скринридеры, и ставит его сам роутер (`ariaCurrentWhenActive`).

**Проверка вручную (PowerShell).**

```powershell
pnpm nx test ui                      # ожидание: Tests 174 passed
$env:CI='true'; pnpm nx e2e ui-storybook-e2e --grep "SideNav|axe"   # ожидание: 5 passed
pnpm nx storybook ui-storybook       # открыть Components/SideNav, нажать Tab: синяя рамка
```

## 🇬🇧 What and why (full)

**What was done.** `libs/ui` got a side navigation: `<k-sidenav>` (a `<nav>` landmark with
brand/footer slots), `a[k-sidenav-item]` (link with projected icon and optional `count`),
`<k-sidenav-group>` (`role="group"` labelled by its visible caption). Styles are verbatim
from `components.css`; 6 stories, 7 unit tests, 2 real-Chromium e2e tests, axe in light and
dark. A broken `nx` install (`dist/bin` missing) was repaired by deleting that package copy
and reinstalling from the lockfile.
**Why (real-life analogy).** A building directory board: the library makes the board, the
building (app with the router) decides what is written on it and where it points.
**How it works, step by step.** (1) No router in the library: the app sets
`aria-current="page"`, CSS styles it. (2) The accessible name is "Entwürfe, 3": a hidden
inline span holds ", 3", the visible number is `aria-hidden`. (3) jsdom trims spaces at
element edges, and Chromium inserts spaces around flex items and absolutely positioned
boxes. So the text and the hidden span share one inline wrapper, and the hidden span uses
`font-size: 0` instead of the usual absolute "sr-only". Only the browser e2e test caught the
Chromium case. (4) The focus ring uses the Kontur tokens (`--focus-width`, `--focus-ring`),
because the shared rule does not list `.k-sidenav-item`. A "Focused" story shows it via
`.is-focus`. The e2e test was proven by a mutation (rule removed → `outline-style: auto`, red).
**Alternatives considered and why rejected.** `aria-label` with the full text (the component
does not own the text); icon by name (needs a registry of every Lucide icon); standard
absolute sr-only (adds a space in Chromium).
**What can break and how to fix it.** "Entwürfe , 3": the hidden span became block-level or
left the wrapper. Dark-story contrast failure: the wrapper lacks `color: var(--text-primary)`.
Risk: `font-size: 0` text may be skipped by some screen readers; check with NVDA in 8a-1.
**Interview question on this topic.** Q: Why does the library nav not use `RouterLinkActive`
itself? A: A UI library must not depend on the router. The standard `aria-current="page"`
attribute carries the state; the router sets it via `ariaCurrentWhenActive`, and CSS and
screen readers both understand it.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Komponentenbibliothek hat jetzt eine Seitennavigation: `k-sidenav`, `k-sidenav-item` und
`k-sidenav-group`. Die Bibliothek kennt den Router nicht. Die App setzt `aria-current="page"`,
und das CSS zeigt den aktiven Eintrag. Ein Zähler wird zusammen mit dem Namen vorgelesen:
„Entwürfe, 3“. Dafür gibt es einen unsichtbaren Text, und die sichtbare Zahl ist für
Screenreader versteckt. Der Test im echten Chromium hat einen Fehler gefunden, den der
Unit-Test nicht sieht: Chromium fügt ein Leerzeichen ein. Der Fokusrahmen nutzt die
Kontur-Tokens. Ein Mutationstest beweist, dass der Test den Rahmen wirklich prüft. Die
Story „Dark theme“ ist mit axe geprüft.

### Fachwortschatz

| Deutsch                            | English         | Русский                    |
| ---------------------------------- | --------------- | -------------------------- |
| die Seitennavigation               | side navigation | боковая навигация          |
| der barrierefreie Name             | accessible name | доступное имя              |
| die Landmarke                      | landmark        | ориентир (раздел страницы) |
| der Fokusrahmen                    | focus ring      | рамка фокуса               |
| der Zähler                         | counter / count | счётчик                    |
| der Mutationstest                  | mutation test   | мутационная проверка       |
| der Bildschirmleser (Screenreader) | screen reader   | программа чтения с экрана  |
