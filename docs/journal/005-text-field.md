# 005 · TextField — FormField + Input: подпись, подсказка и ошибка для скринридера

Date: 2026-11-14 · Task: 005 (план: `docs/plans/005-text-field.md`) · PR: — · Commits: `32abfd1`…(эта запись)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
В библиотеке появилось текстовое поле:

```html
<k-form-field label="Vertragsbeginn" hint="z. B. 01.01.2027" required [error]="…">
  <input k-input formControlName="start" />
</k-form-field>
```

- `k-form-field` рисует подпись, подсказку и сообщение об ошибке точно как в макете `TextField.html`. Главное — он **связывает** их с полем, чтобы скринридер прочитал: «Vertragsbeginn, обязательное, недопустимое значение, z. B. 01.01.2027, Datum im Format TT.MM.JJJJ».
- `k-input` — директива на обычном `<input>` или `<textarea>`. Поле остаётся нативным, поэтому реактивные формы Angular работают с ним без дополнительного кода.

Попутно найден и исправлен баг кэша Nx: Storybook мог собираться из старого кэша без новых story.

**Зачем это нужно (аналогия из жизни).**
Представь бумажный бланк. Зрячий человек видит, что подпись «Datum» стоит над клеточками, а красная пометка «неверный формат» — под ними. Незрячий человек «видит» бланк через скринридер, и ему нужно сказать явно: эта подпись относится к этому полю, эта пометка — тоже к нему. `k-form-field` и есть тот, кто проводит стрелочки от подписи и пометок к полю.

**Как это работает, шаг за шагом.**

1. **Связь подписи.** `k-form-field` генерирует id (`k-field-1`, `k-field-2` …), и `<label for="k-field-1">` указывает на поле. Если у `<input>` есть свой явный `id`, используется он: компонент видит директиву через `contentChild(InputDirective)`.
   - **contentChild** — это сигнал-запрос «найди среди того, что мне передали внутрь (content), такую директиву».
2. **Подсказка и ошибка.**
   - У поля `aria-describedby="k-field-1-hint k-field-1-error"`: **сначала подсказка, потом ошибка**. Так делает GOV.UK Design System, потому что подсказка часто объясняет, как исправить ошибку. Поэтому при ошибке подсказка не исчезает.
   - Ошибка ставит на поле `aria-invalid="true"` и класс `is-invalid` (красная рамка и розовый фон из токенов `--error` и `--error-subtle`).
   - Текст ошибки сопровождает иконка с `aria-hidden`, она чисто декоративная.
3. **Обязательность.** Звёздочка `<span class="k-required" aria-hidden="true">*</span>` видна глазом, но не входит в имя поля для скринридера: он скажет «обязательное» благодаря `aria-required="true"`, а не «звёздочка».
4. **Как поле и директива «разговаривают».**
   - `k-form-field` кладёт себя в DI под токеном `K_FORM_FIELD`.
   - **DI (внедрение зависимостей)** — механизм Angular: компонент «объявляет», что он может дать, а вложенный элемент «просит» это через `inject()`.
   - **InjectionToken** — это «ключ» для такой просьбы.
   - Директива делает `inject(K_FORM_FIELD)` и получает сигналы `describedBy`, `invalid`, `required`.
   - Почему токен, а не прямо класс компонента: компонент импортирует директиву (для `contentChild`), и если бы директива импортировала компонент, получился бы **циклический импорт**. Токен лежит в третьем файле и разрывает цикл.
5. **Без `k-form-field` — понятная ошибка.**
   - `<input k-input>` вне обёртки остался бы без подписи, то есть без доступного имени.
   - В dev-режиме директива сразу бросает `k-input must be placed inside k-form-field`. Разработчик видит проблему при первом запуске, а не на аудите доступности.
   - В production-сборке проверка выключена (`isDevMode()`).
6. **Формы.**
   - Свой **ControlValueAccessor** (адаптер между формой Angular и элементом) не нужен: `<input>` нативный, и Angular подключает стандартный `DefaultValueAccessor`.
   - Тест проверяет типизированный `FormGroup`: ввод попадает в форму, `setValue` — в поле, `disable()` блокирует поле.
7. **Текст ошибки передаёт потребитель** (`[error]="…"`). Компонент не переводит `control.errors` в текст сам: тексты нужно переводить, а i18n ещё не выбран. Story «Reactive form» показывает типовой приём: ошибка появляется после blur или после попытки отправки.
8. **Стили.**
   - Секция «Form field» эталона перенесена в `form-field.css` целиком и дословно, плюс `.k-required`.
   - В секции есть общие правила с Select (`.k-field, .k-select { … }`). Поэтому в ADR-0003 дописано правило: «одна секция эталона — один файл; его подключают все компоненты, которым он нужен». Select потом подключит этот же файл, а не скопирует правила.
9. **ESLint.** Для директив правило требовало camelCase (`kInput`), контракт называет директиву `k-input`. Стиль поменян на kebab-case, теперь атрибуты везде пишутся одинаково (`k-button`, `k-input`).
10. **Тесты.**
    - **Unit, 11 новых.** Добавлен `@testing-library/jest-dom`. Он даёт проверки «глазами скринридера»: `toHaveAccessibleName`, `toHaveAccessibleDescription`, `toBeInvalid`, `toBeRequired`, `toBeDisabled`.
    - **e2e: axe.** Список story больше не прописан руками: тест берёт все story из `index.json` Storybook, и каждый новый компонент автоматически попадает под проверку. Если ожидаемых story в списке нет, срабатывает «сторож» (guard): прогон, который ничего не проверил, не станет зелёным.
    - **e2e: TextField.** Клик по подписи переводит фокус в поле. Tab показывает кольцо фокуса `2px solid #0e5a6b`: это `--focus-ring` = `var(--brand)` из `tokens.json`.

**Мутации (тесты ловят то, что должны).**

- Убрал подсказку из `aria-describedby` → упали 2 теста.
- Убрал dev-проверку → упал тест «fails fast».
- Код каждый раз возвращал на место.

**Найденный баг: устаревший Storybook из кэша.** Его поймал как раз новый «сторож».

- **Симптом.** e2e не нашёл story TextField: сервер отдавал Storybook без них, хотя раньше сборка с `--skip-nx-cache` их содержала.
- **Причина.** Story из `libs/ui` Storybook подключает **глобом** в `.storybook/main.ts`, а не через `import`. Поэтому в графе Nx не было связи `ui-storybook → ui`, и изменения story в `libs/ui` не меняли хэш `build-storybook`. Nx честно восстанавливал из кэша старый результат.
- **Решение.** `"implicitDependencies": ["ui"]` в `apps/ui-storybook/project.json` — явно сказать Nx, что эта связь есть. Проверено: после правки сборка без `--skip-nx-cache` пересобралась и содержит TextField.
- **CI не был затронут:** там каждый раз чистая машина без кэша.

**Уточнение моего теста.** `getByLabelText` сравнивает **текст** подписи, а в тексте есть `*`. Скринридер же видит **доступное имя** без `aria-hidden`-звёздочки. Поэтому тест на `required` ищет поле через `getByRole('textbox', { name })`. Так проверяется ровно то, что услышит пользователь, а проверка `toHaveAccessibleName` осталась.

**Какие были альтернативы и почему отказались.**

- **Один компонент `<k-text-field label …>` со своим `<input>` внутри.** Пришлось бы пробрасывать десятки атрибутов (`autocomplete`, `inputmode`, `maxlength` …) и писать ControlValueAccessor. Директива на нативном поле проще и надёжнее, и так требует контракт.
- **Ошибка заменяет подсказку.** Пользователь теряет объяснение, как исправить ошибку.
- **`role="alert"` у ошибки.** Скринридер говорил бы при каждом изменении валидации, это шумно. WCAG 3.3.1 закрыт `aria-invalid` и `aria-describedby`. Сводку ошибок после submit сделаем отдельно.
- **Ошибка из `control.errors` автоматически.** Нужен i18n, иначе тексты придётся хардкодить.
- **Вручную проверять `aria-describedby` по id вместо jest-dom.** Длинно и проверяет атрибуты, а не то, что слышит пользователь.

**Что может сломаться и как починить.**

- Симптом: `Error: k-input must be placed inside k-form-field`. → Причина: поле без обёртки. → Что делать: обернуть в `<k-form-field label="…">`.
- Симптом: новая story не видна в собранном Storybook или e2e её не находит. → Причина: Nx не видит зависимость, если `implicitDependencies` убрали. → Что делать: вернуть `"implicitDependencies": ["ui"]`, временно `--skip-nx-cache`.
- Симптом: скринридер не читает ошибку. → Причина: передан пустой `error`, или поле стоит вне `k-form-field`. → Что делать: передавать строку или `null`.
- Симптом: `label` не фокусирует поле. → Причина: у `<input>` задан динамический `[id]`. `HostAttributeToken` видит только статический атрибут. → Что делать: использовать статический `id` или не задавать его вовсе.

**Вопрос с собеседования по этой теме.**

- В: Как сделать текстовое поле доступным для скринридера?
- О:
  - У поля должно быть доступное имя: `<label for>` указывает на id поля.
  - Подсказка и ошибка связываются через `aria-describedby`, в порядке «подсказка, затем ошибка». Подсказка часто объясняет, как исправить ошибку.
  - Ошибка ставит `aria-invalid="true"`, а обязательность — `aria-required`. Звёздочка остаётся декоративной (`aria-hidden`).
  - Ошибки не объявляются «вживую» на каждое нажатие клавиши: после отправки показывают сводку ошибок и переводят на неё фокус.
  - У меня это делает обёртка `k-form-field` поверх нативного `<input>`, а тесты проверяют доступное имя и описание через jest-dom, то есть то, что слышит пользователь.

## 🇬🇧 What and why (full)

**What was done.**

- `<k-form-field label hint error required>` renders the mockup's label, hint and error and links them to the field. A screen reader announces name, required, invalid, hint and error.
- `<input k-input>` / `<textarea k-input>` is a directive on the native element, so Angular forms use their standard `DefaultValueAccessor`.
- A stale-Storybook cache bug in Nx was found and fixed.

**Why (real-life analogy).**
On a paper form, sighted people see which label and which red note belong to which box. A screen-reader user needs those links stated explicitly; `k-form-field` draws the arrows.

**How it works, step by step.**

1. **Label link.** A generated id (`k-field-N`) links `label[for]` to the input. An explicit static `id` wins, read via `contentChild(InputDirective)`.
2. **Hint and error.** `aria-describedby` lists the hint first, then the error (GOV.UK pattern), and both stay visible. The error sets `aria-invalid="true"` and `is-invalid`, and its icon is `aria-hidden`.
3. **Required.** A decorative `*` (`aria-hidden`) plus `aria-required="true"`, so the accessible name stays clean.
4. **Field ↔ directive communication.** It goes through DI with an `InjectionToken` (`K_FORM_FIELD`). The token lives in a third file, which avoids a circular import between the component and the directive.
5. **Dev-mode error.** `k-input must be placed inside k-form-field` is thrown in dev mode and skipped in production (`isDevMode()`).
6. **Forms.** No own ControlValueAccessor is needed. A test covers a typed `FormGroup`: value in both directions and `disable()`.
7. **The error text comes from the consumer.** Mapping `control.errors` to text waits for i18n.
8. **Styles.** The "Form field" section is ported verbatim, plus `.k-required`. ADR-0003 is amended: one reference section = one CSS file, shared by every component that needs it (Select will reuse it).
9. **ESLint.** Directive selectors are kebab-case (`k-input`), like the component selectors.
10. **Tests.**
    - jest-dom matchers check what assistive technology perceives;
    - e2e reads all story ids from Storybook's `index.json`, with a guard against an empty list;
    - TextField e2e: a label click focuses the field, and Tab shows `2px solid #0e5a6b`.

**Mutations.** Each test was shown to catch the bug it targets:

- the hint removed from `describedby` → 2 tests failed;
- the dev check removed → its test failed.

**Bug found: stale Storybook from the Nx cache.**

- **Cause.** `.storybook/main.ts` loads libs/ui stories by glob, not by import, so the graph had no edge `ui-storybook → ui`, and story changes did not change the `build-storybook` hash.
- **Fix.** `"implicitDependencies": ["ui"]`. Verified that a cached run now rebuilds. CI was unaffected (fresh runner).

**Test refinement.** `getByLabelText` matches the label's text, which includes `*`. The required test now uses `getByRole('textbox', { name })`, i.e. the accessible name, which is what the test is about.

**Alternatives considered and why rejected.**

- **A monolithic `<k-text-field>`.** It would need attribute forwarding and a ControlValueAccessor.
- **The error replacing the hint.** The user loses the fix instructions.
- **`role="alert"`.** Too noisy.
- **Auto messages from `control.errors`.** They need i18n.
- **Checking ids by hand.** Tests attributes, not perception.

**What can break and how to fix it.**

- **The dev-mode error.** Wrap the input in `k-form-field`.
- **A missing story in the build.** Keep `implicitDependencies`.
- **A label click does not focus the field.** A dynamic `[id]` is not seen by `HostAttributeToken`; use a static one.

**Interview question on this topic.**

- **Q:** How do you make a text field accessible?
- **A:**
  - `label[for]` gives the field its accessible name.
  - `aria-describedby` links the hint, then the error; `aria-invalid` and `aria-required` describe the state; the asterisk is decorative.
  - There are no live announcements per keystroke; an error summary after submit gets the focus.
  - Tests assert the accessible name and description (jest-dom), not raw attributes.

## 🇩🇪 Kurzfassung (Niveau B1)

In dieser Aufgabe haben wir das Textfeld gebaut: `k-form-field` mit Beschriftung, Hinweis und Fehlermeldung und `k-input` auf dem normalen `<input>`-Element. Die Beschriftung ist über `for` mit dem Feld verbunden. Hinweis und Fehler sind über `aria-describedby` verbunden: zuerst der Hinweis, dann der Fehler, denn der Hinweis erklärt oft, wie man den Fehler korrigiert. Ein Fehler setzt `aria-invalid`, ein Pflichtfeld setzt `aria-required`. Das Sternchen ist nur dekorativ. Weil das Eingabefeld nativ bleibt, funktionieren die reaktiven Formulare von Angular ohne eigenen Adapter. Ohne `k-form-field` meldet `k-input` im Entwicklungsmodus sofort einen klaren Fehler. Außerdem prüft der E2E-Test jetzt jede Story automatisch mit axe. Dabei haben wir einen Cache-Fehler in Nx gefunden und behoben: Storybook wurde aus einem veralteten Cache geladen.

### Fachwortschatz

| Deutsch                      | English                   | Русский                |
| ---------------------------- | ------------------------- | ---------------------- |
| das Eingabefeld              | input field               | поле ввода             |
| die Beschriftung             | label                     | подпись                |
| der Hinweis(text)            | hint                      | подсказка              |
| die Fehlermeldung            | error message             | сообщение об ошибке    |
| das Pflichtfeld              | required field            | обязательное поле      |
| der zugängliche Name         | accessible name           | доступное имя          |
| die zugängliche Beschreibung | accessible description    | доступное описание     |
| ungültig                     | invalid                   | недопустимый           |
| das reaktive Formular        | reactive form             | реактивная форма       |
| die Abhängigkeitsinjektion   | dependency injection (DI) | внедрение зависимостей |
| der zyklische Import         | circular import           | циклический импорт     |
| der Entwicklungsmodus        | dev mode                  | режим разработки       |
| veralteter Cache             | stale cache               | устаревший кэш         |
| die Fehlerübersicht          | error summary             | сводка ошибок          |
