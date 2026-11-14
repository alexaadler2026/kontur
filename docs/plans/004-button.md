# План задачи 004: Button (+ IconButton) в libs/ui

## Контекст (зачем)

Токены есть (003), компонентов пока нет. Button — первый компонент `@adlersoft/kontur-ui`.
На нём закрепляем шаблон для всех остальных 20 компонентов:

- как переносим `components.css`;
- как реализуем контракт из `api-contracts.d.ts`;
- как тестируем (Angular Testing Library);
- как документируем (Storybook);
- как проверяем доступность (axe по каждой story).

Плюс по твоей просьбе — e2e-проверка ленивой загрузки шрифтов: немецкий текст → 0 запросов к `*-cyrillic.woff2`, русский текст → cyrillic грузится.

**Источники:**

- `docs/design/components/Button.md`, `Button.html`/`.png`;
- секция Button и правило фокуса в `docs/design/components.css`;
- контракт `ButtonProps`/`IconButtonProps` в `docs/design/api-contracts.d.ts`.

**Контракт:**

- **`<button k-button>` / `<a k-button>`.** Атрибутный селектор на нативном элементе, нативная семантика сохраняется.
  - `variant`: `primary | secondary | ghost | danger`, по умолчанию `secondary`;
  - `size`: `md | sm | touch` (36/32/44), по умолчанию `md`;
  - `loading`: скрывает подпись, показывает спиннер, ставит `aria-busy="true"`, блокирует клики;
  - `disabled`.
- **`<button k-icon-button>`.** `ariaLabel` обязателен, `size`: `md | sm`.

**Где Button будет виден.** Только в Storybook. В приложениях ему пока нечего показать: любой видимый текст в продукте должен идти через i18n, а ADR по i18n ещё нет. Демо-кнопки с захардкоженным текстом в приложение не добавляю.

---

## Ключевые технические решения

### 1. Стили — ADR-0003 «Component styles: k-* classes ported 1:1, ViewEncapsulation.None; shared styles in kontur-base.css»

- **Общие стили — в `libs/ui/src/styles/kontur-base.css`**, дословно из `components.css`:
  - секция «base»: `box-sizing`, `.k-body`, `.k-num`, `.k-label`, `.k-caption`, `.k-link`;
  - правило `:focus-visible` / `.is-focus` для всех `k-*` целиком, как в эталоне;
  - все `@keyframes` (`k-spin`, `k-shimmer`, `k-indeterminate`);
  - весь блок `@media (prefers-reduced-motion: reduce)`.

  Сюда же переезжает правило `body` из нынешнего `base.css`, а сам `base.css` удаляется: один общий файл вместо двух.
  Общего правила `.k-ico` в эталоне нет: все правила для иконок привязаны к компонентам (`.k-btn .k-ico`, `.k-menu-item .k-ico` …), поэтому они остаются в CSS своих компонентов.

- **Подключение глобально** рядом с `tokens.css`: `styles` у signflow, belegscan и ui-storybook. В npm-пакет файл попадает через уже настроенные `assets` (`src/styles/**`).
- **Компонентные стили — рядом с компонентом.** `libs/ui/src/lib/button/button.css` содержит **только** секцию Button (вместе с `.k-btn .k-ico`, `.k-icon-btn`) и `.k-icon-btn--sm` из блока «Contract completion».
- В ADR-0003 правило звучит так: «общие стили — в kontur-base.css, компонентные — рядом с компонентом».
- Компонент ставит на свой host классы `k-btn k-btn--<variant> k-btn--<size>`. Классы совпадают с эталоном 1:1, поэтому макеты в `docs/design/screens/*.html` и наш компонент описываются одними и теми же классами.
- `ViewEncapsulation.None`, иначе Angular перепишет селекторы и класс `k-btn` на нативном `<button>` перестанет совпадать с эталоном.
- **Альтернатива:** Emulated + `:host(.k-btn--primary)`. Отклонена: CSS разошёлся бы с эталоном, и переносить остальные 20 компонентов стало бы сложнее.
- **Риск:** глобальные стили. Снижается тем, что все классы начинаются с префикса `k-`.

### 2. Блокировка кликов при `loading`

- **Почему не CSS.** В эталоне `pointer-events: none` блокирует только мышь. Enter и Space на `<button>` всё равно вызовут `click`.
- **Почему не `disabled`.** Если сделать кнопку `disabled` во время загрузки, фокус «улетает» на `<body>`: это плохо для клавиатуры (WCAG 2.4.3).
- **Решение.**
  - Кнопка остаётся фокусируемой, получает `aria-busy="true"` и `aria-disabled="true"`.
  - На host вешается обработчик `click` в **capture-фазе**: на самом элементе он срабатывает раньше обычных `(click)` потребителя и вызывает `stopImmediatePropagation()` + `preventDefault()`. Порядок гарантирован спецификацией DOM.

### 3. `disabled` для `<a k-button>`

У ссылки нет нативного `disabled`. Поэтому ставим `aria-disabled="true"` и `tabindex="-1"`, а клик блокируем тем же capture-обработчиком. У `<button>` — нативный атрибут `disabled`.

### 4. Тесты — Angular Testing Library (как требует CLAUDE.md)

- Новые devDependencies: `@testing-library/angular`, `@testing-library/dom`, `@testing-library/user-event`.
- У `libs/ui` возвращается цель `test` (Vitest через `@angular/build:unit-test`, как у приложений).

### 5. `type="button"` по умолчанию

У `<button>` без атрибута `type` браузер считает `type="submit"`, и кнопка внутри `<form>` отправит форму. Поэтому `<button k-button>` и `<button k-icon-button>` получают `type="button"`, **если `type` не задан явно**. Для этого на host ставится `[attr.type]`: значение берётся из `HostAttributeToken('type')` (`inject(new HostAttributeToken('type'), { optional: true }) ?? 'button'`). Для `<a k-button>` атрибут `type` не ставится.

### 6. ESLint

`@angular-eslint/component-selector` в `libs/ui` сейчас разрешает только элементы. Расширяю до `type: ['element', 'attribute']`: этого требует контракт `button[k-button]`.

---

## Шаги и коммиты (тесты — первыми в каждом шаге)

### Коммит 0 · `docs(design): complete component styles for contract variants (v2)`

Твои изменения коммичу как есть, отдельным коммитом: `components.css` (блок «Contract completion (v2)») и `Button.md`/`.html`/`.png`.

### Коммит 1 · `docs(adr): record component styling approach (ADR-0003)`

ADR-0003 и строка в оглавлении ADR.

### Коммит 2 · `test(ui): set up Angular Testing Library and test target for libs/ui`

devDependencies, цель `test` в `libs/ui/project.json`, правило ESLint для селекторов.

### Коммит 3 · `feat(ui): add k-button and k-icon-button`

**Сначала** `button.spec.ts` (ATL + user-event) — красный. Тесты описывают поведение:

1. **Значения по умолчанию.** `<button k-button>Speichern</button>` получает классы `k-btn k-btn--secondary`, и **никакого модификатора размера**: в эталоне md — это отсутствие модификатора. Роль `button`, имя «Speichern».
2. **Варианты и размеры.**
   - `variant="primary" size="touch"` → `k-btn--primary k-btn--touch`;
   - `size="sm"` → `k-btn--sm`;
   - класса `k-btn--md` не бывает никогда.
     2a. **`type`.**
   - кнопка внутри `<form>` без `type` → `type="button"`, клик **не** вызывает `submit`;
   - с явным `type="submit"` → клик вызывает `submit`;
   - то же для `k-icon-button`.
3. **`disabled` у `<button>`.** Есть нативный `disabled`; клик мышью не вызывает обработчик потребителя.
4. **`loading`.**
   - стоят `aria-busy="true"` и `aria-disabled="true"`, есть класс `is-loading`;
   - клик мышью, **Enter и Space** не вызывают обработчик;
   - кнопка остаётся в фокусе;
   - доступное имя («Speichern») не пропадает: подпись скрыта визуально, а не удалена.
5. **`<a k-button disabled href="/x">`.** Стоят `aria-disabled="true"` и `tabindex="-1"`, клик не уходит в обработчик и не меняет навигацию.
6. **`<button k-icon-button ariaLabel="Schließen">`.** Есть `aria-label="Schließen"` и класс `k-icon-btn`; `size="sm"` → `k-icon-btn--sm` (из блока «Contract completion (v2)»). `ariaLabel` — `input.required`: без него шаблон не скомпилируется.

**Затем реализация:**

- `libs/ui/src/lib/button/button.ts` — `ButtonComponent`, standalone, OnPush, `input()` с `booleanAttribute` для `loading`/`disabled`, `host` bindings, `inject(ElementRef)`, capture-обработчик через `Renderer2.listen` с `DestroyRef`;
- `libs/ui/src/lib/button/icon-button.ts`;
- `libs/ui/src/lib/button/button.css` (только Button);
- `libs/ui/src/styles/kontur-base.css` (общее, см. решение 1) + подключение в `project.json` трёх проектов; удаление `base.css`; e2e приложений должны остаться зелёными;
- экспорт в `libs/ui/src/index.ts`;
- `peerDependencies` (`@angular/core`) вернутся в `libs/ui/package.json`: правило `@nx/dependency-checks` теперь их потребует.

### Коммит 4 · `docs(ui): add Button stories`

`libs/ui/src/lib/button/button.stories.ts`:

- Variants, Sizes;
- States (disabled, loading);
- AsLink;
- IconButton (иконка — inline SVG в стиле Lucide из макета; ADR про `lucide-angular` — позже, с первым компонентом, где иконка обязательна);
- **LongLabels**: «Auftragsverarbeitungsvertrag» и русский «Подписать документ», чтобы проверить, что кнопка не обрезает длинные немецкие и русские слова.

Подписи в stories — это примеры для документации, а не текст продукта, поэтому правило i18n их не касается.

### Коммит 5 · `test(ui-storybook): e2e for stories — axe and lazy font subsets`

Новый проект **`apps/ui-storybook-e2e`** (Playwright). `webServer`: `nx run ui-storybook:static-storybook`. Story открываются напрямую через `iframe.html?id=…`, без интерфейса Storybook.

1. **axe по каждой story Button:** WCAG 2.1 A/AA, 0 нарушений. Это первая автоматическая проверка доступности самих компонентов.
2. **Шрифты (пункт 4 из 003):**
   - story `Variants` с немецким текстом («Speichern», «Abbrechen», «Löschen»): после `document.fonts.ready` запросов к `/*-cyrillic*.woff2/` — **0**, к latin `IBMPlexSans-500` — **≥ 1**;
   - story `LongLabels` с русским текстом: запрос к `IBMPlexSans-500-cyrillic` — **≥ 1**.
   - Считаю запросы через `page.on('request')`, кэш браузера отключён: каждый тест открывает новый context.

Переключателя языка нет, поэтому проверяю на story с русским текстом, как ты разрешил.

CI: проект подхватится существующим шагом e2e (`nx run-many -t e2e`), ничего менять не нужно.

### Коммит 6 · `docs(journal): add entry 004 button`

- журнал 004 (RU/EN/DE + Fachwortschatz);
- `docs/plans/004-button.md` с отклонениями;
- статус в `libs/ui/README.md`.

---

## Вне задачи

- `lucide-angular` и ADR про иконки;
- `@storybook/addon-a11y` (панель axe в самом Storybook) — можно отдельно;
- деплой Storybook и приложений (ссылка для рекрутера);
- i18n ADR → первые экраны.

## Проверка (руками)

| Команда                                                         | Ожидание                                                                                    |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `pnpm nx test ui`                                               | все тесты Button/IconButton зелёные (≈ 10)                                                  |
| `pnpm nx lint ui`                                               | без ошибок, атрибутный селектор `k-button` разрешён                                         |
| `pnpm nx storybook ui-storybook` → http://localhost:4400        | раздел **Button**: варианты, размеры, состояния; Tab — видимое кольцо фокуса `--focus-ring` |
| там же: story States, loading-кнопка → Tab + Enter              | ничего не происходит, фокус остаётся на кнопке                                              |
| `pnpm nx e2e ui-storybook-e2e`                                  | axe по всем story — 0 нарушений; немецкая story — 0 запросов cyrillic; русская — ≥ 1        |
| `pnpm nx run-many -t lint test typecheck build build-storybook` | всё зелёное                                                                                 |
| CI после push                                                   | зелёный, в шаге e2e три e2e-проекта                                                         |

---

## Отклонения от плана при выполнении (2026-11-14)

| Что                                                                                                    | Почему                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Сборка `libs/ui`: `@nx/angular:package` → `@angular/build:ng-packagr` (и `targetDefaults` в `nx.json`) | Unit-test билдер Angular для библиотек принимает только этот `buildTarget`. Опции те же, npm-пакет не изменился                                                         |
| В красном тесте: `userEvent.setup({ pointerEventsCheck: Never })` для `disabled`/`loading`             | В jsdom действует CSS эталона, и user-event отказывается кликать по `pointer-events: none`. Теперь тест доказывает, что клик блокирует сам компонент, — проверка строже |
| `apps/ui-storybook/.storybook/preview.ts`: `ngServerMode = false`                                      | Story падали с `ngServerMode is not defined`: Angular 22 читает этот глобал, CLI подставляет его при сборке, а webpack Storybook — нет. Нашёл e2e                       |
| `static-storybook` на порту 4402                                                                       | По умолчанию 4200 — конфликт с signflow                                                                                                                                 |
| axe ограничен `#storybook-root`                                                                        | Проверяем компонент, а не служебную страницу iframe Storybook                                                                                                           |
| `kontur-base.css` и `libs/ui/src/lib/**/*.css` в `.prettierignore`                                     | Дословный перенос из `components.css`; построчное сравнение с эталоном                                                                                                  |
| Добавлена story Playground (controls)                                                                  | Удобно руками проверить все комбинации `variant`/`size`/`loading`/`disabled`                                                                                            |
| Класс `is-disabled` на `<a k-button disabled>`                                                         | `:disabled` не существует для ссылок; эталон стилизует этот случай через `.k-btn.is-disabled`                                                                           |
