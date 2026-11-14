# 007 · Тест контраста токенов: палитра проверяется до появления экрана

Date: 2026-11-14 · Task: 007 (план: `docs/plans/007-token-contrast.md`) · PR: — · Commits: `d063e76`…(эта запись)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
В `tools/tokens` появился тест, который для **27 пар цветов** в **обеих темах** (всего 54 проверки) считает контраст по формуле WCAG 2.1 и сравнивает с порогом:

- **текст ≥ 4.5:1** — WCAG 1.4.3 Contrast (Minimum);
- **элементы интерфейса ≥ 3:1** (рамки полей, кольцо фокуса, ручка Switch, заливка отмеченного чекбокса) — WCAG 1.4.11 Non-text Contrast.

Пары взяты из того, что UI **реально рисует**. Список лежит в одном файле `contrast-pairs.mts`, и у каждой пары записано, где она используется: «primary button :active», «placeholder in a field with an error» и так далее.

**Зачем это нужно (аналогия из жизни).**
axe — как инспектор, который проверяет готовые комнаты: он видит только то, что уже построено (story), и проверяет только текст. Тест контраста проверяет **краску ещё на складе**: если кто-то заменит зелёный на чуть более светлый, тест скажет «на бейдже success текст станет нечитаемым» ещё до того, как этой краской покрасят хоть одну стену.

**Как это работает, шаг за шагом.**

1. **`resolveColor(tokens, name, theme)`** находит цвет токена в теме и раскрывает ссылки: `switch-knob` → `{text-on-brand}` → `#ffffff` (светлая) или `#12161c` (тёмная).
   - Если имени нет, функция бросает ошибку. Опечатка в списке пар роняет тест, а не пропускает пару молча (урок задачи 005: «тест, который не может провалиться, ничего не проверяет»).
   - Если значение не hex, например `rgba(…)` у `overlay-scrim`, функция тоже бросает ошибку: у полупрозрачного цвета контраст зависит от того, что под ним, и по токенам его честно не посчитать.
2. **Формула WCAG 2.1.**
   - **Относительная яркость** (relative luminance) — насколько цвет светлый для глаза, от 0 (чёрный) до 1 (белый). Каждый канал R, G, B сначала «распрямляется» из гамма-кривой sRGB в линейный свет, потом каналы складываются с весами 0.2126 / 0.7152 / 0.0722: зелёный глаз видит ярче всего.
   - **Контраст** = `(L светлого + 0.05) / (L тёмного + 0.05)`, от 1:1 (одинаковые цвета) до 21:1 (чёрный на белом).
3. **Сравнение без округления.** Первая версия сравнивала значение, округлённое до двух знаков, и тогда 4.495 прошло бы как 4.5. По WCAG пороги точные: 4.499:1 — провал. Исправлено до коммита, тест стал строже.
4. **Тест формулы на известных значениях:** чёрный на белом = 21:1, цвет на самом себе = 1:1, `#767676` на белом = 4.54:1. Это классический «самый светлый серый, который ещё проходит».
5. **Встроенная мутационная проверка** — постоянная часть теста. В копии палитры в памяти `text-secondary` заменяется на светло-серый `#c0c0c0`, и `findContrastFailures` обязана найти пару «text-secondary on bg-surface (light)».
6. **Ручная мутация** на настоящем `tokens.json`, при чистом рабочем дереве:
   - `success` в светлой теме: `#1e7b4a` → `#1f8a4c`. На глаз разница почти незаметна, а контраст бейджа success падает с 4.59 до **3.82**;
   - тест упал и назвал пару и место: «success on success-subtle (light, WCAG 1.4.3) ≥ 4.5:1 — Badge success: 3.82 ≥ 4.5»;
   - откат: `git checkout -- docs/design/tokens.json`.
7. **Кэш.** Цель `tokens:test` уже содержит `docs/design/tokens.json` во входах: изменение цвета обязательно перезапускает тест, устаревший зелёный результат из кэша невозможен. Проверено до начала работы.

**Самый узкий запас — первый кандидат на падение.** `success` на `success-subtle`, светлая тема: **4.59** при пороге 4.5, то есть запас 0.09. Любая правка зелёного или его фона почти наверняка уронит именно эту пару первой. Следующие по узости:

- `warning` на `warning-subtle` (светлая) — 4.60;
- `border-input` на `bg-page` (светлая) — 3.33 при пороге 3;
- `border-input` на `bg-surface` (тёмная) — 3.51.

**Что сознательно не входит в список (с причиной в комментарии `contrast-pairs.mts`).**

- **Disabled-состояния.** WCAG 1.4.3 и 1.4.11 явно исключают неактивные элементы.
- **Hover danger-кнопки.** Он сделан фильтром `brightness(0.92)`, а не токеном, поэтому проверить его по токенам нельзя. Я посчитал вручную и нашёл нюанс:
  - в **светлой** теме текст белый, и затемнение красного **повышает** контраст: 6.57 → 7.41;
  - в **тёмной** теме `text-on-brand` тёмный (`#12161c`), и затемнение фона **понижает** контраст: 6.39 → 5.46. Пока это выше 4.5, но утверждение «затемнение только повышает контраст» верно лишь для светлой темы. Это записано в комментарии и задано владельцу вопросом.
- **`overlay-scrim`** — полупрозрачный цвет.

**Какие были альтернативы и почему отказались.**

- **Только axe.** Он не проверяет контраст элементов интерфейса и видит только отрисованные story.
- **Проверять все пары токенов со всеми.** Получилось бы сотни бессмысленных пар (например, `error` на `success-subtle`), а реальные проблемы утонули бы в шуме. Список того, что реально рисуется, честнее.
- **Цифры контраста в описании `tokens.json` (`usage`).** Это документация, а не проверка: её никто не пересчитает при правке.
- **Своя библиотека расчёта (`color`, `wcag-contrast`).** Формула — 10 строк, и её проще объяснить, чем зависимость.

**Что может сломаться и как починить.**

- Симптом: тест падает с `X ≥ 4.5` после правки палитры. → Причина: новый цвет не держит контраст. → Что делать: поправить цвет в дизайн-системе. **Порог не трогать.**
- Симптом: `Unknown colour token`. → Причина: токен переименовали или в списке опечатка. → Что делать: обновить `contrast-pairs.mts` в том же коммите, что и переименование.
- Симптом: `not a hex colour`. → Причина: в список пар попал rgba-токен. → Что делать: такие пары не проверяются по токенам, их место в комментарии-исключении.
- Симптом: компонент рисует новую комбинацию цветов, а теста нет. → Причина: пару не добавили. → Что делать: добавлять пару в том же PR, что и компонент.

**Вопрос с собеседования по этой теме.**

- В: Как вы обеспечиваете контраст цветов в дизайн-системе?
- О:
  - Контраст проверяется на двух уровнях. axe в e2e проверяет текст на отрисованных компонентах.
  - Unit-тест на токенах проверяет палитру целиком: список реально используемых пар (текст 4.5:1 по WCAG 1.4.3, элементы интерфейса 3:1 по 1.4.11) в обеих темах, по формуле WCAG 2.1, без округления.
  - Тест защищён от «пустого прохода»: опечатка в имени токена роняет его, а встроенная мутация доказывает, что он ловит плохую палитру.
  - Правка палитры, которая ломает контраст, падает в CI до того, как попадёт на экран.

## 🇬🇧 What and why (full)

**What was done.**
A test in `tools/tokens` checks **27 colour pairs** in **both themes** (54 checks) against WCAG 2.1: text ≥ 4.5:1 (1.4.3) and UI components ≥ 3:1 (1.4.11). The pairs are what the UI really draws; they live in one list (`contrast-pairs.mts`) with the criterion and where each is used.

**Why (real-life analogy).** axe inspects finished rooms (rendered stories) and only text. This test checks the paint in the warehouse: a slightly lighter green fails before any wall is painted.

**How it works, step by step.**

1. **`resolveColor`** follows aliases. It throws on unknown names (a typo fails instead of skipping, lesson of 005) and on non-hex values (alpha cannot be judged from tokens).
2. **WCAG 2.1 relative luminance**: each channel is linearized from sRGB gamma and weighted 0.2126 / 0.7152 / 0.0722. The contrast is `(L1 + 0.05) / (L2 + 0.05)`.
3. **Exact comparison without rounding.** The first draft rounded to 2 decimals, so 4.495 would have passed. Fixed before the commit.
4. **The formula is tested on known values:** 21:1, 1:1, and `#767676` on white = 4.54:1.
5. **A built-in mutation check** on a broken palette copy.
6. **A manual mutation** on the real `tokens.json` (clean tree, reverted with `git checkout`): `success` `#1e7b4a` → `#1f8a4c` dropped Badge success from 4.59 to **3.82**, and the test named the pair and where it is used.
7. **Cache.** `tokens:test` already lists `tokens.json` as an input, so a colour change always reruns it.

**Narrowest margin — first candidate to fail.** `success` on `success-subtle` (light): **4.59** vs 4.5. The next narrowest:

- `warning` on `warning-subtle` (light): 4.60;
- `border-input` on `bg-page` (light): 3.33 vs 3;
- `border-input` on `bg-surface` (dark): 3.51.

**Excluded on purpose (commented in the list).**

- **Disabled states:** exempt under WCAG.
- **Danger hover:** a CSS filter, no token. Computed by hand: the light theme gains contrast (6.57 → 7.41), but in the dark theme the dark text **loses** contrast (6.39 → 5.46), still ≥ 4.5. A question for the owner.
- **`overlay-scrim`:** alpha.

**Alternatives considered and why rejected.**

- **axe only.** No non-text contrast, rendered stories only.
- **All pairs with all.** Noise.
- **Numbers in `tokens.json` `usage` texts.** Documentation, not a check.
- **A contrast library.** The formula is 10 explainable lines.

**What can break and how to fix it.**

- **A ratio fails after a palette change.** Fix the colour, never the threshold.
- **`Unknown colour token`.** Update the list in the rename commit.
- **`not a hex colour`.** The pair belongs to the exclusions.
- **A new component combination is untested.** Add the pair in the same PR.

**Interview question on this topic.**

- **Q:** How do you ensure colour contrast in a design system?
- **A:**
  - Two levels: axe on rendered components for text, and a unit test on the tokens for the real pairs (4.5:1 text, 3:1 UI components) in both themes, exact WCAG 2.1 formula, no rounding.
  - It is guarded against passing on empty input, and a built-in mutation proves it catches a bad palette.
  - A palette change that breaks contrast fails CI before it reaches a screen.

## 🇩🇪 Kurzfassung (Niveau B1)

In dieser Aufgabe haben wir einen Test für den Farbkontrast der Design-Tokens geschrieben. Er prüft 27 Farbpaare in beiden Themes nach der WCAG-2.1-Formel: Text braucht mindestens 4,5:1, Bedienelemente wie Rahmen und Fokusring mindestens 3:1. Die Paare stehen in einer Liste, und bei jedem Paar steht, wo es in der Oberfläche benutzt wird. Ein Tippfehler im Tokennamen lässt den Test scheitern, statt das Paar zu überspringen. Wir haben gezeigt, dass der Test funktioniert: Ein etwas hellerer Grünton senkt den Kontrast des Success-Badges von 4,59 auf 3,82, und der Test schlägt fehl. Das engste Paar ist Success-Text auf hellem Success-Hintergrund mit 4,59:1; es wird bei einer Farbänderung wahrscheinlich als Erstes scheitern. Deaktivierte Elemente sind nach WCAG ausgenommen und stehen deshalb nicht in der Liste.

### Fachwortschatz

| Deutsch                               | English             | Русский                          |
| ------------------------------------- | ------------------- | -------------------------------- |
| der Kontrast / das Kontrastverhältnis | contrast ratio      | контраст / коэффициент контраста |
| die relative Leuchtdichte             | relative luminance  | относительная яркость            |
| der Schwellenwert                     | threshold           | порог                            |
| das Bedienelement                     | UI component        | элемент интерфейса               |
| der Nicht-Text-Kontrast               | non-text contrast   | контраст нетекстовых элементов   |
| der Fokusring                         | focus ring          | кольцо фокуса                    |
| das Farbpaar                          | colour pair         | пара цветов                      |
| die Farbpalette                       | colour palette      | палитра                          |
| runden                                | to round            | округлять                        |
| deaktiviert / inaktiv                 | disabled / inactive | неактивный                       |
| die Mutationsprüfung                  | mutation check      | мутационная проверка             |
| der Spielraum (Puffer)                | margin              | запас                            |
