# 006 · Checkbox — первый собственный элемент формы (ControlValueAccessor)

Date: 2026-11-14 · Task: 006 (план: `docs/plans/006-checkbox.md`) · PR: — · Commits: `72210fc`…(эта запись)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- **`<k-checkbox>`** — чекбокс из дизайн-системы:
  - подпись, подсказка и ошибка **текстом**;
  - состояние «частично выбран» (indeterminate);
  - работает с реактивными формами Angular **и** с новыми Signal Forms.
- **ADR-0004** — правило для всех будущих элементов форм (Radio, Switch, Select, DatePicker).
- **Дизайн-снапшот v3** (подготовил владельца дизайна):
  - ошибка чекбокса стала текстом, а не только красным цветом;
  - галочки рисуются маской цвета `text-on-brand`;
  - новый токен `switch-knob`.

  Генератор токенов справился без изменений кода.

**Зачем это нужно (аналогия из жизни).**
У TextField значение хранит само поле `<input>`, форма Angular читает его напрямую. У чекбокса-компонента значение «внутри» компонента, и форме нужен **переводчик**. Это как розетка и вилка из другой страны: прибор (компонент) работает, но в стену (форму Angular) его не вставить без переходника. ControlValueAccessor — такой переходник, и у всех наших элементов форм он одинаковый.

**Как это работает, шаг за шагом.**

1. **Внутри — настоящий `<input type="checkbox">`** в разметке эталона: `<label class="k-check"><input type="checkbox">AGB akzeptiert</label>`. Браузер сам даёт фокус по Tab, переключение пробелом, клик по подписи и роль «флажок» для скринридера. Своего кода клавиатуры нет.
2. **ControlValueAccessor (CVA)** — «переходник» из 4 методов, которые вызывает форма:
   - `writeValue(v)`: форма → компонент. Компонент кладёт значение в сигнал `checked`;
   - `registerOnChange(fn)`: форма даёт функцию, компонент вызывает `fn(true/false)` при событии `change`;
   - `registerOnTouched(fn)`: компонент вызывает её на `blur`. Так форма узнаёт, что поле «трогали», и может показать ошибку;
   - `setDisabledState(d)`: `control.disable()` → сигнал `disabled` → нативный атрибут `disabled`.
3. **`NG_VALUE_ACCESSOR` + `forwardRef`.** Компонент регистрирует себя как переходник в `providers`. `forwardRef(() => CheckboxComponent)` нужен потому, что класс упоминается **внутри собственного декоратора**: в момент чтения декоратора класс ещё не определён. `forwardRef` откладывает обращение «на потом».
4. **Ошибка — текстом (v3).**
   - `error: string | null` показывает сообщение с иконкой, `aria-invalid="true"` на поле и `aria-describedby` (подсказка, затем ошибка), как у TextField.
   - До v3 ошибка была `boolean`, то есть только красная рамка. Это нарушало WCAG 1.4.1 (нельзя передавать смысл только цветом) и 3.3.1 (ошибку нужно описать текстом).
5. **`indeterminate` — это `model()`, а не `input()`.**
   - **model()** — сигнал-вход, который компонент может менять сам, и изменение уходит обратно родителю (`[(indeterminate)]`).
   - По клику браузер сам снимает «частично выбран». С обычным `input()` родитель продолжал бы думать, что состояние смешанное, а DOM — нет. С `model()` компонент ставит `false`, и родитель получает `indeterminateChange`.
6. **Signal Forms.** Во время работы проверил по типам `@angular/forms` 22.2.6:
   - Signal Forms **стабильны** (`@publicApi 22.0`), а CVA для них — «режим обратной совместимости».
   - CLAUDE.md и контракт требуют CVA и реактивные формы, поэтому владелец выбрал CVA плюс обязательный тест с Signal Forms. Тест показывает, что тот же компонент работает с `[formField]`: значение в обе стороны и `disabled` из схемы формы.
   - Решение для самих приложений будет отдельным ADR перед первым экраном SignFlow.
7. **Иконка ошибки — общий внутренний компонент `svg[k-error-icon]`.** Он стоит прямо на элементе `<svg>`, поэтому DOM как в макете. В шаблоне пути записаны как `<svg:path>`: префикс говорит Angular, что элементы из пространства имён SVG. Без префикса Angular даже не скомпилирует шаблон (`NG8001`), а тест дополнительно проверяет namespace во время выполнения.
8. **Стили.** Секция «Checkbox / Radio / Switch» — одна на три компонента, поэтому один файл `choice.css` (ADR-0003). Radio и Switch подключат его же.
9. **Тесты (9 unit + 3 e2e).**
   - Reactive Forms: клик и Space пишут в форму, `setValue`, `touched` после blur, `disable()`.
   - Signal Forms.
   - indeterminate, hint/error.
   - В e2e (настоящий Chromium): Tab и кольцо фокуса `#0e5a6b`, Space, клик по подписи, ошибка после «Weiter».
   - axe проверяет все story, включая тёмную тему.

**Мутации.**

- Выключил `setDisabledState` → упали 2 теста (Reactive и Signal Forms).
- Убрал сброс indeterminate → упал его тест.

**Тест токенов, который пришлось обновить, — и почему это честно.** Тест считал тематические токены: 26 в v2. Владелец намеренно добавил `switch-knob`, стало 27. Тест не ловил ошибку, он устарел из-за изменения требований. Golden-тест (сравнение с эталонным `tokens.css` v3) прошёл без изменений. Я обновил число и **усилил** тест: теперь он проверяет, что `--switch-knob` = `var(--text-on-brand)` в обеих темах.

**Какие были альтернативы и почему отказались.**

- **`<div role="checkbox">`.** Пришлось бы самому делать фокус, пробел, клик по подписи и состояния. Легко ошибиться, и CSS эталона стилизует нативный input.
- **Только Signal Forms (`FormCheckboxControl`).** Не работает с `formControlName`, а CLAUDE.md и контракт требуют реактивные формы. Пересмотрим в ADR про формы приложений.
- **`input()` для indeterminate.** Родитель и DOM расходятся после клика.
- **Копировать иконку ошибки в каждый компонент.** К Radio было бы три копии.

**Что может сломаться и как починить.**

- Симптом: `No value accessor for form control`. → Причина: потерялся провайдер `NG_VALUE_ACCESSOR` или `multi: true`. → Что делать: вернуть провайдер.
- Симптом: `control.disable()` не блокирует чекбокс. → Причина: `setDisabledState` не обновляет сигнал. → Что делать: тест это ловит.
- Симптом: ошибка видна, но скринридер её не читает. → Причина: передан `error` без текста или `aria-describedby` не собран. → Что делать: смотреть `toHaveAccessibleDescription` в тесте.
- Симптом: галочка не видна. → Причина: не подключён `tokens.css` v3 (`--text-on-brand`) или браузер без поддержки `mask`. → Что делать: проверить `styles`.

**Вопрос с собеседования по этой теме.**

- В: Что такое ControlValueAccessor и когда он нужен?
- О:
  - Это интерфейс-«переходник» между формой Angular и компонентом, который сам хранит значение.
  - Четыре метода: `writeValue` (форма → компонент), `registerOnChange` (компонент → форма), `registerOnTouched` (для `touched`), `setDisabledState`.
  - Регистрируется через провайдер `NG_VALUE_ACCESSOR` с `forwardRef`.
  - Нужен, когда значение не лежит в нативном поле, которое форма видит напрямую. Для `<input k-input>` он не нужен: работает встроенный `DefaultValueAccessor`.
  - В Angular 22 стабильны Signal Forms, и там предпочтительнее `FormValueControl` / `FormCheckboxControl`. Но CVA продолжает работать с ними в режиме совместимости. Я проверил это тестом, чтобы библиотека не зависела от выбора API форм в приложениях.

## 🇬🇧 What and why (full)

**What was done.**

- **`<k-checkbox>`:** label, hint and a **text** error, plus indeterminate. Works with typed reactive forms **and** Signal Forms.
- **ADR-0004** sets the pattern for every future form control.
- **Design snapshot v3:**
  - the checkbox error became text;
  - check marks are masks colored by `text-on-brand`;
  - a new `switch-knob` token.

  The token generator handled v3 without code changes.

**Why (real-life analogy).** A component that keeps its own value needs a plug adapter to fit Angular's forms socket. ControlValueAccessor is that adapter, the same for all our controls.

**How it works, step by step.**

1. **A native `<input type="checkbox">`** in the reference markup provides focus, Space, label click and the role.
2. **CVA:** four methods mapped to signals:
   - `writeValue` → `checked`;
   - `registerOnChange` → called on `change`;
   - `registerOnTouched` → called on `blur`;
   - `setDisabledState` → `disabled`.
3. **`NG_VALUE_ACCESSOR` with `forwardRef`.** The class is referenced inside its own decorator, before it is defined.
4. **The error is text (v3).** The message has an icon; the field gets `aria-invalid` and `aria-describedby` (hint, then error). The previous boolean error was color-only (WCAG 1.4.1, 3.3.1).
5. **`indeterminate` is a `model()`.** The browser clears it on click, and the change flows back to the parent.
6. **Signal Forms.** Verified in `@angular/forms` 22.2.6: stable (`@publicApi 22.0`), with CVA as their backwards-compatibility path. The owner chose CVA plus a mandatory Signal Forms test (`[formField]`: value both ways, disabled from the schema). The forms API for the apps gets its own ADR before the first SignFlow screen.
7. **`svg[k-error-icon]`** is a shared internal icon. `svg:` prefixes put its paths in the SVG namespace; the compiler rejects missing prefixes (NG8001), and a test checks the namespace at runtime.
8. **Styles.** One reference section gives one file, `choice.css`, shared by Radio and Switch.
9. **Tests:**
   - 9 unit tests: reactive forms, Signal Forms, touched, disable, indeterminate, hint/error;
   - 3 e2e tests in real Chromium: Tab and focus ring, Space, label click, error after submit;
   - axe on all stories, including the dark theme.

**Mutations:**

- `setDisabledState` disabled → 2 tests failed;
- the indeterminate reset removed → its test failed.

**Updated token test.** v3 adds `switch-knob` by design, so 26 themed tokens became 27. The test was outdated by a requirement change, not hiding a bug; the golden test passed unchanged. The test now also asserts the alias in both themes.

**Alternatives considered and why rejected.**

- **`role="checkbox"` on a `<div>`.** It re-implements native behaviour.
- **Signal-Forms-only control.** It does not work with `formControlName`.
- **`input()` for indeterminate.** The parent and the DOM drift apart after a click.
- **A copied icon.** It duplicates code.

**What can break and how to fix it.**

- **`No value accessor`.** The provider was lost.
- **`disable()` is ignored.** `setDisabledState` does not update the signal; the test catches it.
- **The check mark is invisible.** `tokens.css` v3 or `mask` support is missing.

**Interview question on this topic.**

- **Q:** What is a ControlValueAccessor and when do you need it?
- **A:**
  - It is the adapter between Angular forms and a component that owns its value. Its four methods are `writeValue`, `registerOnChange`, `registerOnTouched` and `setDisabledState`, and it is registered via `NG_VALUE_ACCESSOR` with `forwardRef`.
  - It is not needed for a native input, which uses the `DefaultValueAccessor`.
  - In Angular 22, Signal Forms are stable and prefer `FormValueControl` / `FormCheckboxControl`. CVA still works with them as a compatibility path, and I proved that with a test.

## 🇩🇪 Kurzfassung (Niveau B1)

In dieser Aufgabe haben wir die Checkbox gebaut, das erste eigene Formularelement der Bibliothek. Im Inneren steckt ein echtes `<input type="checkbox">`, deshalb kommen Tastatur, Fokus und Screenreader-Rolle vom Browser. Den Wert tauscht die Komponente über den ControlValueAccessor mit den Angular-Formularen aus. Diese Regel steht in ADR-0004 und gilt auch für Radio, Switch und Select. Fehler werden jetzt als Text angezeigt, nicht nur in Rot, denn eine Information darf nicht nur über Farbe vermittelt werden (WCAG 1.4.1). Wir haben geprüft, dass Signal Forms in Angular 22 stabil sind. Die Checkbox funktioniert mit reaktiven Formularen und mit Signal Forms, das zeigen zwei Tests. Welche Formular-API die Apps nutzen, entscheiden wir in einem eigenen ADR vor dem ersten Bildschirm.

### Fachwortschatz

| Deutsch                                | English                 | Русский                         |
| -------------------------------------- | ----------------------- | ------------------------------- |
| das Kontrollkästchen (die Checkbox)    | checkbox                | чекбокс, флажок                 |
| das Formularelement                    | form control            | элемент формы                   |
| der Wertzugriff (ControlValueAccessor) | value accessor          | адаптер значения (CVA)          |
| teilweise ausgewählt                   | indeterminate           | частично выбран                 |
| die Vorwärtsreferenz                   | forward reference       | опережающая ссылка (forwardRef) |
| die Farbe als einziges Merkmal         | color-only information  | передача смысла только цветом   |
| die Fehlermeldung als Text             | text error message      | текстовое сообщение об ошибке   |
| stabil / experimentell                 | stable / experimental   | стабильный / экспериментальный  |
| die Abwärtskompatibilität              | backwards compatibility | обратная совместимость          |
| der Namensraum (SVG)                   | namespace               | пространство имён               |
| das dunkle Design                      | dark theme              | тёмная тема                     |
| der Kontrast                           | contrast                | контраст                        |
