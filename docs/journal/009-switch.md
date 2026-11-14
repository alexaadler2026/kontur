# 009 · Switch — тот же чекбокс, но для мгновенных настроек

Date: 2026-11-14 · Task: 009 (план: `docs/plans/009-switch.md`) · PR: — · Commits: `2dee726` (дизайн v4.1), `3728f1a`, `34e086a`, `16469f7`, (эта запись)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- **`<k-switch label="…" [formControl]="…" />`** — переключатель «вкл/выкл» для настроек, которые применяются **сразу**, без кнопки «Speichern»: напоминания, тёмная тема. Для выбора в форме с кнопкой сохранения по правилу дизайна используется Checkbox.
- Из дизайна v4.1 дословно перенесены:
  - правило `.k-switch.is-disabled` — серая подпись, как у Checkbox и Radio;
  - расширенный класс-превью `.is-focus`.

**Зачем это нужно (аналогия из жизни).**
Checkbox — как галочка в анкете: ставишь, потом нажимаешь «Отправить». Switch — как выключатель света: щёлкнул, и свет уже горит, ничего подтверждать не надо. Внутри у них одинаковая механика (булево значение), а смысл и ожидания пользователя разные. Поэтому это два компонента, а не один с параметром.

**Как это работает, шаг за шагом.**

1. **Внутри — нативный `<input type="checkbox" role="switch">`.**
   - Браузер даёт фокус, Space и клик по подписи.
   - Атрибут `role="switch"` меняет только то, как элемент **объявляет** скринридер: «переключатель, включён» вместо «флажок, отмечен». HTML-ARIA разрешает эту роль на checkbox.
   - Enter, как у нативного checkbox, не переключает: паттерн APG для switch требует только Space.
2. **Значение — boolean через ControlValueAccessor**, так же, как у Checkbox (ADR-0004). На событие `change` новое значение сразу уходит в форму. «Мгновенно применить» — задача того, кто использует компонент. В story «Instant setting» поток `valueChanges` превращается в сигнал через **`toSignal`** (функция Angular, которая делает из потока RxJS сигнал), и сигнал сразу переключает `data-theme`.
3. **API строго по контракту — только `label`.** Мгновенная настройка не проходит валидацию, поэтому подсказке и ошибке неоткуда взяться. Лишнего API не добавляю.
4. **Повтор кода с Checkbox — осознанный.** Около 20 строк CVA совпадают. Общий базовый класс ради двух мест сложнее объяснить, чем две простые копии. При третьем boolean-контроле вынесем.
5. **Ручка в тёмной теме** — токен `switch-knob` (= `text-on-brand`, `#12161c`). Белая ручка давала 2.45:1 (ниже 3:1 по WCAG 1.4.11) — это исправление v3. Теперь его охраняют **два** теста:
   - контраст токенов (007): 7.4:1 на `brand`, 3.9:1 на `border-input`;
   - e2e: computed-цвет `::after` в тёмной story = `rgb(18, 22, 28)`.

**Порядок «сначала красный тест» (договорённость после 008).**

1. Заготовка `switch.ts`: селектор и `label`, **пустой шаблон**. Тесты падают на поведении, а не на «модуль не найден».
2. Запуск: **6 из 6 новых тестов красные**, и каждый по своей причине:
   - нет элемента с ролью `switch`;
   - `NG01203: No value accessor` — у реактивной формы нет «переходника»;
   - `NG01914` — Signal Forms не принимают хост без value accessor.
3. Реализация → 47/47 зелёные.
4. **Мутации:**
   - пустой `setDisabledState` → 2 теста упали (Reactive Forms и Signal Forms);
   - без `role="switch"` → 5 тестов упали;
   - в e2e вернул белую ручку → тест тёмной темы упал: `Expected rgb(18, 22, 28)`, `Received rgb(255, 255, 255)`.

**Проверки.**

- unit 47/47 в `libs/ui`;
- ui-storybook-e2e 16/16 через `nx e2e` с `CI=true`, на порту 4402. axe прошёл все story Switch, включая тёмную тему, а guard дополнен.

**Какие были альтернативы и почему отказались.**

- **`<button role="switch" aria-checked>`.** Пришлось бы самому делать связь с подписью и форму, а CSS эталона стилизует input.
- **Один компонент Checkbox с `variant="switch"`.** Смешал бы две разные роли и два разных API: у Checkbox есть ошибка и indeterminate, у Switch их нет.
- **Общий базовый класс CVA.** Рано: абстракция ради двух мест.

**Что может сломаться и как починить.**

- Симптом: Switch стоит в форме с «Speichern». → Причина: это ошибка UX, а не баг компонента. → Что делать: заменить на Checkbox.
- Симптом: ручка белая в тёмной теме. → Причина: не подключён `tokens.css` v3 и новее. → Что делать: проверить `styles`; e2e это ловит.
- Симптом: скринридер говорит «флажок». → Причина: потерялся `role="switch"`. → Что делать: unit-тест это ловит.

**Вопрос с собеседования по этой теме.**

- В: Чем Switch отличается от Checkbox и как вы его реализуете?
- О:
  - Switch — для настроек, которые применяются сразу; Checkbox — для выбора, который подтверждается отправкой формы.
  - Технически это нативный checkbox с `role="switch"`: клавиатура и форма от браузера, а скринридер говорит «вкл/выкл».
  - Значение идёт через ControlValueAccessor, как у Checkbox.
  - Контраст ручки (3:1, WCAG 1.4.11) проверяется и на уровне токенов, и в e2e в тёмной теме.

## 🇬🇧 What and why (full)

**What was done.**
`<k-switch label [formControl]>` for settings applied immediately (reminders, dark theme). In forms with a Save button, use Checkbox. `.k-switch.is-disabled` and the wider `.is-focus` preview class were ported verbatim from design v4.1.

**Why (real-life analogy).** A checkbox is a tick on a form you submit later; a switch is a light switch — the effect is immediate. Same mechanics, different meaning, so two components.

**How it works, step by step.**

1. **A native `<input type="checkbox" role="switch">`.** Focus, Space and label click come from the browser; screen readers say "on/off". Enter is not required by the APG switch pattern.
2. **A boolean through ControlValueAccessor (ADR-0004).** The "Instant setting" story turns `valueChanges` into a signal with `toSignal`, and the signal drives `data-theme`.
3. **Label only, per contract.** Instant settings are not validated.
4. **Deliberate duplication of ~20 lines of CVA with Checkbox.** It will be extracted at the third boolean control.
5. **Dark-theme knob = `switch-knob` (`#12161c`).** It is guarded twice: by the token contrast test (007) and by an e2e check of the computed `::after` colour.

**Red first.** A stub with an empty template made all 6 new tests fail for real reasons (no `switch` role, NG01203 no value accessor, NG01914 invalid formField host). Then the implementation made 47/47 pass.

**Mutations:**

- an empty `setDisabledState` → 2 failures;
- no `role="switch"` → 5 failures;
- a white knob → the e2e test failed (`rgb(255, 255, 255)`).

**Checks.** ui-storybook-e2e 16/16 via `nx e2e` with `CI=true`; axe passed all Switch stories.

**Alternatives considered and why rejected.**

- **`<button role="switch">`.** It loses the native form and label behaviour.
- **Checkbox with `variant="switch"`.** It mixes two roles and two APIs.
- **A shared CVA base class.** Premature.

**What can break and how to fix it.**

- **A switch in a Save form.** Use Checkbox.
- **A white dark-mode knob.** `tokens.css` is missing; the e2e test catches it.
- **The role is lost.** The unit test catches it.

**Interview question on this topic.**

- **Q:** Switch vs checkbox — how do you build it?
- **A:**
  - A switch is for immediate settings, a checkbox for choices that are submitted.
  - It is a native checkbox with `role="switch"`, and the value goes through ControlValueAccessor.
  - The knob contrast (WCAG 1.4.11) is tested at the token level and in a dark-theme e2e test.

## 🇩🇪 Kurzfassung (Niveau B1)

In dieser Aufgabe haben wir den Switch gebaut, einen Schalter für Einstellungen, die sofort gelten, zum Beispiel das dunkle Design. In Formularen mit „Speichern“-Button nimmt man stattdessen eine Checkbox. Technisch ist der Switch eine native Checkbox mit `role="switch"`: Tastatur und Formular kommen vom Browser, und der Screenreader sagt „ein“ oder „aus“. Den Wert tauscht er wie die Checkbox über den ControlValueAccessor aus. Diesmal haben wir die Tests zuerst rot gesehen: Gegen einen leeren Komponenten-Entwurf sind alle sechs neuen Tests gescheitert, danach waren sie grün. Ein E2E-Test prüft, dass der Schalterknopf im dunklen Design dunkel ist; ein weißer Knopf hätte zu wenig Kontrast.

### Fachwortschatz

| Deutsch                   | English               | Русский                        |
| ------------------------- | --------------------- | ------------------------------ |
| der Schalter (Switch)     | switch                | переключатель                  |
| die Einstellung           | setting               | настройка                      |
| sofort wirksam            | applied immediately   | применяется сразу              |
| der Schalterknopf         | knob                  | ручка переключателя            |
| die Schiene               | track                 | дорожка                        |
| ein / aus                 | on / off              | вкл / выкл                     |
| der Entwurf (Stub)        | stub                  | заготовка                      |
| zuerst rot, dann grün     | red first, then green | сначала красный, потом зелёный |
| die Wiederholung von Code | code duplication      | повтор кода                    |
