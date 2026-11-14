# 004 · Button и IconButton — первый компонент Kontur UI

Date: 2026-11-14 · Task: 004 (план: `docs/plans/004-button.md`) · PR: — · Commits: `a3b7c1b`…(эта запись)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
В библиотеке `@adlersoft/kontur-ui` появились первые компоненты:

- `<button k-button>` и `<a k-button>` — кнопка в четырёх вариантах (primary, secondary, ghost, danger) и трёх размерах (md 36 px, sm 32 px, touch 44 px);
- `<button k-icon-button>` — кнопка только с иконкой, размеры md и sm.

У кнопки есть состояния `disabled` и `loading`. Их видно в Storybook. Каждую story проверяет axe (автоматическая проверка доступности по WCAG 2.1 AA). Ещё один e2e-тест доказывает, что браузер скачивает кириллический шрифт только тогда, когда на странице есть русский текст.

Button — шаблон для остальных 20 компонентов. Поэтому главное в этой задаче — не сама кнопка, а правила, по которым будут делаться следующие компоненты. Они записаны в ADR-0003.

**Зачем это нужно (аналогия из жизни).**
Первый компонент — как первая квартира в новом доме, которую строители сдают как образец. На ней проверяют проводку, двери и сантехнику. Если в образце розетки стоят криво, кривыми будут все 20 квартир. Поэтому на первой кнопке мы аккуратно решили, где лежат стили, как писать тесты и как проверять доступность.

**Как это работает, шаг за шагом.**

1. **Атрибутный селектор.** `selector: 'button[k-button], a[k-button]'`. Компонент «садится» на настоящий `<button>`, а не оборачивает его своим тегом. Поэтому браузер сам даёт всё нативное: роль `button`, фокус по Tab, Enter/Space и работу внутри `<form>`. Так требует контракт из `api-contracts.d.ts`.
2. **Классы эталона на host.**
   - **Host** — это сам элемент, на котором сидит компонент (здесь `<button>`).
   - Компонент ставит на него классы из `components.css`: `k-btn k-btn--primary`.
   - **Размер md — это отсутствие модификатора**, как в эталоне. Класса `k-btn--md` нет, есть только `k-btn--sm` и `k-btn--touch`.
   - Классы считает `computed()` — **вычисляемый сигнал**, который пересчитывается сам, когда меняются входы `variant()`, `size()` и `loading()`.
3. **Где лежат стили (ADR-0003).**
   - Общее лежит в `libs/ui/src/styles/kontur-base.css`: кольцо фокуса для всех `k-*`, `@keyframes`, блок `prefers-reduced-motion` и база страницы. Файл подключается глобально рядом с `tokens.css` и заменил прежний `base.css`.
   - Стили одного компонента лежат рядом с ним: `button.css` содержит только секцию Button.
   - `ViewEncapsulation.None` выключает переименование селекторов. Без этого Angular добавил бы к ним уникальные атрибуты, и класс `k-btn` перестал бы совпадать с эталоном.
   - Оба CSS-файла перенесены из эталона **дословно** и исключены из Prettier, чтобы их можно было сравнивать с `components.css` построчно.
4. **`type="button"` по умолчанию.**
   - У `<button>` без `type` браузер считает `type="submit"`, и кнопка «Abbrechen» внутри формы отправила бы её.
   - Компонент читает **статический** атрибут через `HostAttributeToken('type')`. Если его нет, ставит `button`. Явный `type="submit"` сохраняется.
5. **`loading`: клики блокируются, фокус остаётся.**
   - **Почему не `disabled`.** Фокус ушёл бы на `<body>` (WCAG 2.4.3), и пользователь клавиатуры «потерялся» бы.
   - **Что выставляется вместо этого:** `aria-busy="true"` и `aria-disabled="true"`. Подпись скрыта через `color: transparent`, поэтому доступное имя «Speichern» не пропадает. Спиннер — это `::after` из эталона.
   - **Почему не только CSS.** CSS эталона (`pointer-events: none`) блокирует только мышь. Enter и Space браузер превращает в `click`.
   - **Обработчик в capture-фазе.** Поэтому на элемент вешается обработчик `click` в **capture-фазе** — на этапе «погружения» события, до обычных слушателей. На самом элементе он срабатывает раньше `(click)` потребителя, вызывает `stopImmediatePropagation()` (дальше событие никто не получит) и `preventDefault()` (ни отправки формы, ни перехода по ссылке).
6. **`<a k-button disabled>`.** У ссылки нет нативного `disabled`. Компонент ставит `aria-disabled="true"`, `tabindex="-1"` (ссылка уходит из порядка Tab) и класс `is-disabled` из эталона. Клик гасит тот же обработчик.
7. **IconButton.**
   - `ariaLabel` — это `input.required()`: без него шаблон **не скомпилируется**. Кнопка без текста обязана иметь имя для скринридера.
   - Размер sm (`k-icon-btn--sm`) взят из блока «Contract completion (v2)», который владелец дизайна добавил в `components.css` в этой задаче.
8. **Тесты — Angular Testing Library** (ATL). ATL ищет элементы так, как это делает пользователь или скринридер: `getByRole('button', { name: 'Speichern' })`. Внутренности компонента тест не трогает. 12 тестов покрывают:
   - классы по умолчанию и модификаторы;
   - `type` внутри формы (submit не происходит / происходит);
   - `disabled`;
   - `loading`: мышь, Enter, Space, фокус;
   - отключённую ссылку;
   - IconButton.

   Тесты написаны первыми и сначала были красными (`Cannot find module './button'`).

9. **Storybook** показывает 7 story: Playground с переключателями, Variants, Sizes, States, As link, Icon buttons, Long labels.
10. **e2e для Storybook** (`apps/ui-storybook-e2e`, Playwright). Тесты открывают каждую story напрямую через `iframe.html?id=…`, без интерфейса Storybook.
    - **axe по 7 story:** 0 нарушений. axe ограничен `#storybook-root`, потому что проверяем компонент, а не страницу Storybook.
    - **Шрифты:** story с немецким текстом даёт **0 запросов** к `*-cyrillic.woff2` и хотя бы один к latin `IBMPlexSans-500`. Story с русским текстом загружает `IBMPlexSans-500-cyrillic`. Так проверяется, что `unicode-range` из задачи 003 реально экономит трафик. Переключателя языка пока нет, поэтому проверка сделана на story с русским текстом.

**Чувствительность тестов проверена («мутации»).**

- Убрал блокировку клика → 2 unit-теста упали.
- Убрал `type="button"` по умолчанию → упал тест с формой.
- Направил «немецкий» e2e на русскую story → тест увидел 3 cyrillic-запроса и упал.
- Стёр `ariaLabel` у IconButton → axe нашёл нарушение `button-name`.

После каждой проверки код возвращён на место.

**Что пошло не по плану (и почему так даже лучше).**

- **`ngServerMode is not defined`.** Без e2e мы бы этого не узнали: Storybook _собирался_ зелёным, но любой Angular-компонент в нём падал при отрисовке. До этой задачи в Storybook была только MDX-страница, без компонентов.
  - **Причина.** Angular 22 читает глобальную переменную `ngServerMode`. Сборщик Angular CLI подставляет на её место `false`, а webpack-сборка Storybook этого не делает.
  - **Решение.** Одна строка в `.storybook/preview.ts`: `ngServerMode = false`. Storybook работает только в браузере, поэтому это значение верно.
- **Сборка `libs/ui` переведена с `@nx/angular:package` на `@angular/build:ng-packagr`.** Unit-test билдер Angular для библиотек работает только с этим исполнителем. Опции у них совпадают, а в npm-пакете ничего не изменилось.
- **Уточнён красный тест.** В jsdom уже действует CSS эталона, и user-event честно отказался кликать по элементу с `pointer-events: none`. Я включил в тесте режим «кликать, игнорируя CSS» (`pointerEventsCheck: Never`). Так тест доказывает, что клик блокирует **сам компонент**, а не только CSS. Проверка стала строже, не слабее.
- **Static-сервер Storybook для e2e получил порт 4402.** По умолчанию он занял бы 4200, как signflow.

**Какие были альтернативы и почему отказались.**

- **Свой элемент `<k-button>` вместо атрибута.** Пришлось бы вручную воспроизводить роль, фокус, клавиатуру и поведение в форме. Это хуже для доступности и противоречит контракту.
- **Emulated-инкапсуляция с `:host(.k-btn--primary)`.** CSS разошёлся бы с эталоном, и перенос 20 компонентов перестал бы быть механическим.
- **`disabled` во время `loading`.** Фокус теряется, а скринридер не сообщает, что идёт загрузка.
- **Блокировать клики только через CSS.** Клавиатура такую блокировку обходит.
- **`@storybook/addon-a11y` вместо e2e.** Аддон показывает панель с нарушениями, но CI не роняет. e2e роняет. Аддон можно добавить позже, как удобство.

**Что может сломаться и как починить.**

- Симптом: в Storybook вместо компонента ошибка `ngServerMode is not defined`. → Причина: из `preview.ts` пропала строка с `ngServerMode`. → Что делать: вернуть её; e2e это поймает.
- Симптом: кнопка внутри формы отправляет форму. → Причина: `type` задан через биндинг `[type]`, а `HostAttributeToken` видит только статический атрибут. → Что делать: писать `type="submit"` статически.
- Симптом: стили кнопки не применяются. → Причина: компонент не используется ни в одном шаблоне, и его CSS не загружен; или не подключён `kontur-base.css` (пропадает кольцо фокуса). → Что делать: проверить `styles` в `project.json`.
- Симптом: e2e signflow падает с `Port 4200 is already in use`. → Причина: локально запущен `nx serve signflow`. → Что делать: остановить его или запустить e2e без `CI=true`, тогда Playwright использует уже запущенный сервер.

**Вопрос с собеседования по этой теме.**

- В: Почему ваш Button — это атрибут на `<button>`, а не компонент `<k-button>`?
- О: Так сохраняется нативная семантика: роль, фокус, Enter/Space, `disabled` и поведение в форме даёт сам браузер, а скринридер видит обычную кнопку. Обёртка `<k-button><button>` усложнила бы проброс атрибутов вроде `type`, `aria-*` и `form`, а свой элемент с `role="button"` пришлось бы целиком доучивать клавиатуре. Сверху добавлено только то, чего у нативной кнопки нет: варианты, `loading` с `aria-busy`, блокировка кликов без потери фокуса и `type="button"` по умолчанию.

## 🇬🇧 What and why (full)

**What was done.**
`@adlersoft/kontur-ui` now has its first components:

- `<button k-button>` and `<a k-button>`: 4 variants and 3 sizes (md 36, sm 32, touch 44 px), `disabled` and `loading`;
- `<button k-icon-button>`: sizes md and sm, with a required `ariaLabel`.

There are 12 behaviour tests with Angular Testing Library and 7 Storybook stories. A new e2e project runs axe on every story and checks that the cyrillic font files load only for Russian text. The patterns are recorded in ADR-0003 and will be reused by the other 20 components.

**Why (real-life analogy).**
The first component is the show flat of a new building. If the wiring is wrong there, it will be wrong in all 20 flats. So this task fixes the rules — where styles live, how tests are written, how accessibility is checked — not just one button.

**How it works, step by step.**

1. **Attribute selector** (`button[k-button], a[k-button]`). The browser keeps the native role, focus, Enter/Space and form behaviour.
2. **Reference classes on the host element**, computed by a `computed()` signal. Size md is the absence of a modifier; there is no `k-btn--md`.
3. **Styles (ADR-0003).**
   - Shared rules are in `kontur-base.css`, loaded globally: focus ring, keyframes, reduced motion, page base.
   - Component rules sit next to the component (`button.css`).
   - `ViewEncapsulation.None` keeps the selectors identical to the reference.
   - Both files are verbatim ports, excluded from Prettier so they stay diffable.
4. **`type="button"` by default** via `HostAttributeToken('type')`, so a button inside a `<form>` does not submit it. An explicit static `type="submit"` is kept.
5. **`loading`.**
   - The button is not `disabled`, so the focus stays. It gets `aria-busy` and `aria-disabled`, and the label is visually hidden while the accessible name remains.
   - A capture-phase `click` listener on the element runs before the consumer's `(click)` handlers. It calls `stopImmediatePropagation()` and `preventDefault()`, which blocks mouse, Enter and Space. CSS `pointer-events` alone blocks only the mouse.
6. **Disabled links** get `aria-disabled="true"`, `tabindex="-1"`, the reference class `is-disabled` and the same click guard.
7. **IconButton:** `ariaLabel` is `input.required()`, so a missing accessible name is a compile error. `k-icon-btn--sm` comes from the owner's "Contract completion (v2)" block.
8. **Tests** query by role and name, as users and screen readers do. They were written first and were red at the start.
9. **E2E for stories** opens each story via `iframe.html?id=…`.
   - **axe**, scoped to `#storybook-root`: 0 violations on all 7 stories.
   - **Fonts:** German story → 0 requests to `*-cyrillic.woff2`; Russian story → `IBMPlexSans-500-cyrillic` is requested.

**Mutation checks.** Each test was shown to catch the bug it targets:

- the click guard removed → 2 unit tests failed;
- the default `type` removed → the form test failed;
- the German font test pointed at the Russian story → it failed;
- the empty `ariaLabel` → axe reported `button-name`.

**Deviations.**

- **Storybook crashed** with `ngServerMode is not defined`. Angular 22 reads that global; the CLI defines it at build time, Storybook's webpack build does not. The fix is one line in `preview.ts`. Only the e2e test revealed it, because the Storybook build itself stayed green.
- **The `libs/ui` build moved** to `@angular/build:ng-packagr`, which the Angular unit-test builder requires for libraries.
- **The red test was refined** to click through CSS `pointer-events` (`pointerEventsCheck: Never`). It now proves the component itself blocks the click — a stricter test.
- **The static Storybook server** runs on port 4402.

**Alternatives considered and why rejected.**

- **A custom `<k-button>` element.** It would have to re-implement native semantics.
- **Emulated encapsulation.** The CSS would drift from the reference.
- **`disabled` while loading.** The focus would be lost.
- **CSS-only blocking.** The keyboard bypasses it.
- **`addon-a11y` alone.** It does not fail CI.

**What can break and how to fix it.**

- **`ngServerMode is not defined` in Storybook.** Restore the line in `preview.ts`.
- **A form is submitted unexpectedly.** `type` was bound dynamically; use a static attribute.
- **No focus ring.** `kontur-base.css` is not in `styles`.
- **Port 4200 is in use during e2e.** Stop the local dev server or run the e2e without `CI=true`.

**Interview question on this topic.**

- **Q:** Why is your Button an attribute on `<button>` rather than a `<k-button>` element?
- **A:**
  - The browser provides the native semantics for free: role, focus, keyboard, `disabled` and form behaviour, and assistive technology sees a real button.
  - A wrapper would have to forward `type`, `aria-*` and `form`; a custom element would have to re-implement all of it.
  - The component adds only what native buttons lack: variants, `loading` with `aria-busy`, click blocking without losing the focus, and `type="button"` by default.

## 🇩🇪 Kurzfassung (Niveau B1)

In dieser Aufgabe haben wir die erste Komponente der Bibliothek gebaut: den Button und den Icon-Button. Der Button ist ein Attribut auf dem normalen `<button>`-Element. So bleiben Tastatur, Fokus und Formularverhalten nativ. Die Stile kommen 1:1 aus der Referenz-CSS des Designsystems. Gemeinsame Regeln wie der Fokusring liegen in `kontur-base.css`, die Regeln des Buttons liegen direkt neben der Komponente. Im Ladezustand blockiert der Button Klicks mit Maus und Tastatur, aber der Fokus bleibt erhalten. Ohne explizites `type` ist der Button `type="button"` und sendet kein Formular ab. Die Tests haben wir zuerst geschrieben, mit der Angular Testing Library. Ein E2E-Test prüft jede Story mit axe auf Barrierefreiheit und zeigt, dass kyrillische Schriftdateien nur für russischen Text geladen werden. Die wichtigste Entscheidung steht in ADR-0003: Referenzklassen auf dem Host-Element, ohne Kapselung der Stile.

### Fachwortschatz

| Deutsch                       | English             | Русский                           |
| ----------------------------- | ------------------- | --------------------------------- |
| die Schaltfläche (der Button) | button              | кнопка                            |
| der Attributselektor          | attribute selector  | атрибутный селектор               |
| das Host-Element              | host element        | host-элемент (элемент компонента) |
| die Kapselung der Stile       | style encapsulation | инкапсуляция стилей               |
| der Ladezustand               | loading state       | состояние загрузки                |
| deaktiviert                   | disabled            | отключённый                       |
| der Fokus / der Fokusring     | focus / focus ring  | фокус / кольцо фокуса             |
| die Barrierefreiheit          | accessibility       | доступность                       |
| der zugängliche Name          | accessible name     | доступное имя                     |
| das Formular absenden         | to submit a form    | отправить форму                   |
| die Erfassungsphase (Capture) | capture phase       | фаза перехвата (capture)          |
| die reduzierte Bewegung       | reduced motion      | уменьшение анимации               |
| die Zeichensatz-Teilmenge     | font subset         | подмножество шрифта               |
