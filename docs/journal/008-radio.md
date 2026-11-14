# 008 · Radio — группа, в которой форма видит одно значение

Date: 2026-11-14 · Task: 008 (план: `docs/plans/008-radio.md`) · PR: — · Commits: `586bd47` (дизайн), `6fb1515`, `7380f62`, `8d94301`, (эта запись)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
Два компонента, которые работают только вместе:

- **`<k-radio-group legend name hint error required>`** — рамка группы (`<fieldset>` с заголовком `<legend>`), подсказка, ошибка и место для вариантов;
- **`<k-radio value label disabled>`** — один вариант.

Форма Angular видит одно значение: `value` выбранного варианта, или `null`, если ничего не выбрано. Работает с реактивными формами и с Signal Forms.

**Зачем это нужно (аналогия из жизни).**
Radio — как кнопки выбора станции в старом автомобильном радио: нажмёшь одну, предыдущая выскочит. Выбрать можно только один вариант, и всё вместе — **одна** настройка. Поэтому «переходник» к форме (ControlValueAccessor из 006) стоит на **группе**, а не на каждой кнопке: форме не важно, сколько кнопок, ей нужен ответ «какая станция».

**Как это работает, шаг за шагом.**

1. **Внутри — настоящие `<input type="radio">` с общим `name`.** Одинаковый `name` — это то, что браузер считает «одной группой». Отсюда бесплатно:
   - стрелки переключают выбор;
   - в группе **одна** остановка по Tab;
   - disabled-вариант стрелки пропускают;
   - клик по подписи выбирает вариант;
   - скринридер объявляет «переключатель, 2 из 3».

   Своего кода клавиатуры нет — как у Checkbox (ADR-0004).

2. **Группа и варианты общаются через `InjectionToken` `K_RADIO_GROUP`.**
   - **DI** (внедрение зависимостей) — механизм Angular, через который компонент получает нужный объект, не создавая его сам.
   - Группа регистрирует себя под ключом `K_RADIO_GROUP`. Каждый `k-radio` получает её через `inject(K_RADIO_GROUP)` и берёт оттуда `name`, текущее значение, `disabled` и `required`.
   - На событие `change` вариант вызывает `group.select(value)`.
   - Ключ-токен, а не класс группы, нужен, чтобы два файла не импортировали друг друга по кругу — тот же приём, что `K_FORM_FIELD` в 005.
3. **Какой вариант отмечен.** `checked = Object.is(group.value(), value())`: строки и числа сравниваются по значению, объекты — по ссылке. `compareWith` для объектов — в «Вне задачи».
4. **«Тронуто» (touched) — когда фокус уходит из группы целиком.**
   - Форма показывает ошибку обычно только после того, как поле «трогали» (`touched`).
   - Встроенный в Angular `RadioControlValueAccessor` отмечает touched на **каждом** blur радиокнопки. Но стрелки переводят фокус с кнопки на кнопку, и каждое нажатие — это blur. Значит, ошибка «Bitte wählen Sie…» могла бы появиться, пока человек ещё выбирает.
   - Мы слушаем `focusout` на `<fieldset>` и отмечаем touched, только если новый фокус (`relatedTarget`) **вне** группы. **Это сознательное отличие от встроенного поведения Angular.**
   - Тест: стрелки внутри группы → `touched === false`; Tab наружу → `true`.
5. **Ошибка и подсказка — на группе (контракт v3).**
   - Порядок как в GOV.UK: legend, подсказка, ошибка, варианты.
   - `aria-describedby` (подсказка, затем ошибка) стоит на `<fieldset>`: скринридер читает их, когда фокус входит в группу.
   - **`aria-invalid` на отдельные радиокнопки не ставится**: в ARIA 1.2 роль radio его не поддерживает. Красные рамки кругов даёт класс `is-invalid` на fieldset.
6. **`required` — нативный атрибут на каждой радиокнопке.**
   - Сначала контракт требовал `aria-required`. Но ARIA 1.2 поддерживает его только на `radiogroup`, а не на `radio`, а axe это пропускает для нативного input. Владелец исправил дизайн, это отдельный коммит.
   - Нативный `required` браузер сам передаёт скринридеру как «обязательно».
   - Всплывающую подсказку браузера при отправке формы Angular не покажет: он ставит формам `novalidate`.
   - Тест: `toBeRequired()` и отсутствие `aria-required`.
7. **`name` обязателен, и README требует, чтобы он был уникальным на странице.** Две группы с одинаковым `name` вне `<form>` браузер считает **одной**: выбор в первой снимет выбор во второй.
8. **`k-radio` без группы** — ошибка «k-radio must be placed inside k-radio-group…» **в любом режиме**. Без группы у радиокнопки нет ни `name`, ни значения, она не работает вообще. `k-input` проверяет только в dev, потому что он без поля работает, просто без подписи.

**Тесты и мутации.**

- 9 unit-тестов: разметка, ошибка и подсказка, required, Reactive Forms (клик, стрелка, `setValue`, `null`), touched, `disable()`, один disabled-вариант, Signal Forms, без группы.
- 3 e2e в Chromium:
  - Tab попадает на отмеченный вариант с кольцом фокуса `#0e5a6b`, стрелки пропускают disabled;
  - в группе одна остановка по Tab;
  - ошибка после «Weiter» становится описанием группы.
- axe проверяет 4 новые story, включая тёмную тему.
- Мутации — каждая уронила тесты:
  - пустой `setDisabledState` → 2 теста;
  - touched на каждом blur → 1;
  - `aria-required` вместо `required` → 1;
  - без общего `name` → 2.

**Какие были альтернативы и почему отказались.**

- **Свой `role="radiogroup"` на `<div>` с обработкой стрелок (roving tabindex).** Это много кода, который браузер уже даёт бесплатно, и легко ошибиться.
- **CVA на каждой радиокнопке**, как `RadioControlValueAccessor` в Angular. Тогда `formControl` пришлось бы вешать на каждый вариант, а ошибку и подсказку — дублировать.
- **Генерировать `name` автоматически.** `name` уходит в данные нативной формы; молча придумывать его не стоит (решение владельца).

**Что может сломаться и как починить.**

- Симптом: выбор в одной группе снимает выбор в другой. → Причина: одинаковый `name` на странице. → Что делать: сделать `name` уникальным.
- Симптом: значение-объект не отмечается после `setValue`. → Причина: сравнение по ссылке, а передали копию объекта. → Что делать: передавать тот же объект или ждать `compareWith`.
- Симптом: ошибка появляется слишком рано или не появляется. → Причина: в шаблоне формы ошибка завязана на `touched`. → Что делать: помнить, что touched отмечается только при уходе из группы.

**Вопрос с собеседования по этой теме.**

- В: Где у радиогруппы ControlValueAccessor и как вы отмечаете touched?
- О:
  - На группе: форма хранит одно значение, а варианты получают группу через DI-токен.
  - Варианты — нативные радиокнопки с общим `name`, поэтому клавиатура от браузера.
  - Touched я отмечаю на `focusout` группы, когда новый фокус вне fieldset. Встроенный в Angular accessor делает это на каждом blur, но стрелки внутри группы тоже вызывают blur, и ошибка появлялась бы, пока человек ещё выбирает.

## 🇬🇧 What and why (full)

**What was done.**
`<k-radio-group legend name hint error required>` with `<k-radio value label disabled>`. The form sees one value: the chosen option's `value`, or `null`. Works with reactive forms and Signal Forms.

**Why (real-life analogy).** Like station buttons on an old car radio: pressing one releases the other. It is one setting, so the forms adapter (ControlValueAccessor) sits on the **group**.

**How it works, step by step.**

1. **Native radios sharing `name`** give arrows, one Tab stop, disabled skipping, label click and the screen-reader role for free.
2. **The group and its options talk through the `K_RADIO_GROUP` InjectionToken (DI).** A token, not the class, avoids a circular import.
3. **Checked state:** `Object.is(group.value(), value())`.
4. **Touched when focus leaves the whole group** (`focusout` with `relatedTarget` outside the fieldset). Angular's built-in `RadioControlValueAccessor` marks touched on every radio blur, but arrow keys blur too, so the error would appear while the person is still choosing. This deviation is deliberate.
5. **Hint and error are described on the fieldset** (hint, then error). There is no `aria-invalid` on radios (ARIA 1.2); the red circles come from `is-invalid`.
6. **Native `required` on each radio.** The original contract said `aria-required`, which ARIA 1.2 supports on radiogroup, not on radio, and axe does not flag on native inputs. The owner fixed the design. Angular forms set `novalidate`, so no browser bubble appears.
7. **`name` is required and must be unique on the page** (README).
8. **`k-radio` outside a group** throws in every mode: it cannot work at all without one.

**Tests and mutations.**

- 9 unit tests and 3 e2e tests (focus ring, arrows skip disabled, one Tab stop, error as the group description).
- axe runs on 4 new stories.
- Mutations: an empty `setDisabledState`, touched on blur, `aria-required` instead of `required`, and a missing `name` each failed the suite.

**Alternatives considered and why rejected.**

- **A custom `role="radiogroup"` with roving tabindex.** It re-implements the browser.
- **CVA per radio.** It duplicates the control binding and the error.
- **An auto-generated `name`.** It would invent submitted data.

**What can break and how to fix it.**

- **A duplicate `name`** merges groups.
- **An object value copy** does not match by reference.
- **Touched timing.** It is set only when focus leaves the group.

**Interview question on this topic.**

- **Q:** Where does the ControlValueAccessor of a radio group live, and when is it touched?
- **A:**
  - On the group; the options get it via a DI token and stay native radios sharing `name`.
  - Touched is set on the group's `focusout` when focus leaves the fieldset. Angular's built-in accessor marks it on every blur, which arrow keys trigger too.

## 🇩🇪 Kurzfassung (Niveau B1)

In dieser Aufgabe haben wir die Radio-Gruppe gebaut: `k-radio-group` mit mehreren `k-radio`. Das Formular sieht nur einen Wert, nämlich den gewählten Eintrag, deshalb sitzt der ControlValueAccessor auf der Gruppe. Die Optionen sind echte Radio-Buttons mit gleichem `name`, so kommen Pfeiltasten und ein einziger Tab-Stopp vom Browser. Fehler und Hinweis hängen am `fieldset` über `aria-describedby`; einzelne Radio-Buttons bekommen kein `aria-invalid`. Pflichtfelder nutzen das native Attribut `required`, weil `aria-required` für die Rolle `radio` in ARIA 1.2 nicht unterstützt wird. Die Gruppe gilt erst als „berührt“, wenn der Fokus sie verlässt – anders als im eingebauten Angular-Accessor, damit der Fehler nicht schon beim Durchblättern mit den Pfeiltasten erscheint. Der `name` muss auf der Seite eindeutig sein.

### Fachwortschatz

| Deutsch                          | English                | Русский                    |
| -------------------------------- | ---------------------- | -------------------------- |
| das Optionsfeld (Radio-Button)   | radio button           | радиокнопка, переключатель |
| die Optionsgruppe                | radio group            | группа радиокнопок         |
| die Gruppenbeschriftung (legend) | legend                 | заголовок группы           |
| die Pfeiltaste                   | arrow key              | клавиша-стрелка            |
| der Tab-Stopp                    | tab stop               | остановка по Tab           |
| berührt (touched)                | touched                | «тронуто»                  |
| der Fokus verlässt die Gruppe    | focus leaves the group | фокус покидает группу      |
| das Pflichtfeld                  | required field         | обязательное поле          |
| eindeutig                        | unique                 | уникальный                 |
| die Abhängigkeitsinjektion       | dependency injection   | внедрение зависимостей     |
| das eingebaute Verhalten         | built-in behaviour     | встроенное поведение       |
| die Abweichung                   | deviation              | отклонение                 |
