# 015 · ADR-0021 (волна 1, перед задачей 8): формы на Signal Forms

Date: 2026-11-17 · Task: ADR-0021 + прототип · [ADR-0021](../adr/0021-forms-signal-forms.md) · Commits: a7aecb2…(this entry)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- **Решение.** Все формы SignFlow и Belegscan пишем на **Signal Forms**, это записано в ADR-0021. В CLAUDE.md правило «Typed reactive forms» заменено на «Signal Forms».
- **Прототип.** В Storybook появилась story «Forms / Sign-in» — форма входа: e-mail и пароль на наших `k-form-field` и `k-button`. Прототип показывает:
  - **когда** появляется ошибка;
  - как ошибка сервера попадает к нужному полю;
  - как показать общую ошибку «неверный e-mail или пароль».

**Термины (одной фразой).**

- **Signal Forms** — формы Angular, где состояние формы — сигналы. Модель — обычный `signal({ email, password })`, форма — `form(model, schema)`.
- **Схема** (schema) — функция с правилами проверки: `required(path.email)`, `email(path.email)`.
- **`[formField]`** — директива, которая связывает поле ввода с частью формы.
- **`submit()`** — отправка: если форма неверна, Angular не вызывает действие (action), а помечает все поля как «тронутые».
- **touched** («тронуто») — человек уже побывал в поле и ушёл из него.
- **Problem Details** — стандартный формат ошибок API (RFC 9457, ADR-0008). Внутри есть `errors[]`, где у каждой ошибки JSON Pointer на поле, например `/email`.
- **JSON Pointer** — путь к месту в JSON: `/signers/0/email` = «первый подписант, поле email».
- **`role="alert"`** — скринридер сразу зачитывает текст, как только тот появляется.

**Зачем это нужно (аналогия из жизни).**

- **Правило показа ошибок — как вежливый проверяющий.** Он не кричит «ошибка!», пока ты ещё пишешь. Он говорит, когда ты отложил ручку (ушёл из поля) или сдал работу (нажал «Отправить»). А если ты сам исправил ошибку — сразу убирает замечание.
- **Общая ошибка входа — как охранник без подсказок.** Он говорит «пропуск недействителен», а не «фамилия верная, но код неверный». Иначе злоумышленник узнал бы, что такой человек существует (перебор учётных записей, ADR-0010).

**Как это работает, шаг за шагом.**

1. **Модель и правила:** `form(signal({email:'', password:''}), path => { required(path.email); email(path.email); required(path.password); })`.
2. **Когда видна ошибка** — функция `errorDisplay(field)`:
   - при уходе из поля (`blur`) и после отправки она **запоминает вид ошибки** (например, `required`);
   - показывает ошибку, только пока у поля всё ещё есть ошибка **этого вида**;
   - поэтому, пока человек печатает, новая ошибка («неверный e-mail») не появляется, а исправленная («Pflichtfeld») исчезает сразу.
3. **Отправка:** `submit(form, { action, onInvalid })`.
   - Если поля неверны, `onInvalid` ставит фокус на первое ошибочное поле (`focusBoundControl()`).
   - Если поля верны, `action` вызывает «сервер». В прототипе это имитация; настоящий API придёт в задачах 1 и 7.
4. **Ответ сервера** разбирает `mapProblem(problem, form)`:
   - запись `errors[]` с указателем `/email` становится ошибкой поля `form.email` — Signal Forms сами показывают её у поля;
   - ошибка без поля (неверный e-mail или пароль) становится **общей ошибкой**: один текст над кнопкой с `role="alert"`, а не у поля «пароль».
5. **Тексты:** код ошибки превращается в ключ перевода `errors.<code>` (так в ADR-0008). Например, `errors.validation.email` и `errors.auth.invalid_credentials`. Клиентское правило `email` использует тот же ключ, что и сервер. Немецкие тексты в стиле макетов: «Pflichtfeld», обращение на «Sie».
6. **Тесты:**
   - 6 e2e-тестов сначала были красными на пустой заглушке, потом все зелёные;
   - **мутация:** если вместо моего правила поставить простое «показывать, когда touched», падает именно тест «пока печатает, новая ошибка не появляется» — значит, тест действительно проверяет правило;
   - axe-проверка прошла по форме.

**Какие были альтернативы и почему отказались.** Главная альтернатива — Reactive Forms; подробно — в вопросе ниже. Template-driven формы не подходят для больших редакторов: правила в шаблоне трудно тестировать. Оба подхода сразу — два способа делать одно и то же.

**Источник «stable».**

- В установленном `@angular/forms` 22.2.6 у `form()`, `submit()`, `FieldState` стоит пометка `@publicApi 22.0`. Это то, с чем мы реально компилируем.
- В официальном changelog в разделе forms релиза 22.0.0: «graduate signal forms APIs to public API».
- Вторичный источник: статья Ninja Squad «What's new in Angular 22.0» — «Signal Forms are stable!».
- На странице angular.dev пометки о стабильности нет, а блог Angular не открылся (403). Всё это записано в ADR честно.

**Что может сломаться и как починить.**

- **Ошибка появляется прямо во время ввода.**
  - Причина: ошибку показывают по `touched` напрямую, без `errorDisplay`.
  - Что делать: использовать правило из прототипа.
- **Ошибка сервера не видна у поля.**
  - Причина: JSON Pointer не совпадает с путём в модели (например, сервер прислал `/mail`).
  - Что будет: такая ошибка уходит в общую ошибку формы. Исправить нужно имя поля в API или в модели.
- **В интерфейсе виден ключ вроде `errors.validation.xyz`.**
  - Причина: для нового кода нет перевода.
  - Что делать: добавить ключ во все три языка. Проверка паритета ключей поймает, если ключ есть только в одном языке.

**Вопрос с собеседования по этой теме.**

- **В:** Почему не Reactive Forms? В немецких проектах они почти везде.
- **О:**
  - **Почему не они.** Reactive Forms построены на RxJS (`valueChanges`, `statusChanges`), а у нас состояние на сигналах. С ними на каждом экране понадобились бы `toSignal` и подписки, то есть две модели реактивности рядом.
  - **Ошибки сервера.** В Reactive Forms для них нет стандартного места: их ставят руками через `setErrors()`, и следующая проверка может их молча стереть. В Signal Forms `submit()` сам кладёт ошибки сервера к нужным полям и убирает их, когда значение меняется.
  - **Типы.** В Signal Forms типы выводятся из модели, которая у нас уже есть. А `value` в Reactive Forms без отключённых полей (`getRawValue()`) — частый источник ошибок.
  - **Стабильность.** С Angular 22 Signal Forms — стабильный публичный API.
  - **При этом Reactive Forms я знаю и понимаю.** Наша библиотека компонентов специально работает с обоими API через ControlValueAccessor (ADR-0004), так что команда на Reactive Forms может использовать её без изменений.

## 🇬🇧 What and why (full)

**What was done.**

- ADR-0021: Signal Forms for every form; CLAUDE.md updated.
- A sign-in prototype in Storybook on our `k-form-field` and `k-button`.

**Why (real-life analogy).**

- **Errors behave like a polite examiner.** No remark while you are still writing; a remark when you put the pen down (blur) or hand in the paper (submit); the remark disappears as soon as you fix the problem.
- **The login error is a guard who gives no hints.** "Pass not valid" — never "name right, code wrong" (account enumeration).

**How it works, step by step.**

1. The form is a signal model plus a schema: `required` and `email`.
2. `errorDisplay()` records the error kind on blur or submit and shows it only while the field still has it.
3. `submit()` with `onInvalid` focuses the first invalid field.
4. `mapProblem()` turns Problem Details `errors[]` pointers into field errors. A problem without a field becomes one general `role="alert"` message above the button.
5. Texts use the keys `errors.<code>` (ADR-0008).
6. **Tests:** 6 e2e tests red first against an empty stub, then green. A recorded mutation with Angular's plain "show when touched" rule failed the typing test.

**Stability source.**

- `@publicApi 22.0` in the installed typings;
- the 22.0.0 changelog: "graduate signal forms APIs to public API";
- Ninja Squad's 22.0 article (secondary).

**What can break and how to fix it.**

- **Errors while typing:** use `errorDisplay`, not raw `touched`.
- **A server pointer that does not match a field:** it becomes a form error; fix the field name.
- **A raw key on screen:** add the translation.

**Interview question on this topic.**

- **Q:** Why not Reactive Forms, the standard in German enterprise projects?
- **A:**
  - **RxJS vs signals.** Reactive Forms are RxJS-based; in a signals app they add a second reactivity model, with `toSignal` and subscriptions on every screen.
  - **Server errors.** They have no standard home there: you call `setErrors()` by hand, and it can be overwritten silently. `submit()` in Signal Forms attaches them per field and clears them on change.
  - **Types.** Signal Forms take their types from our model; Reactive Forms have the `value` vs `getRawValue()` trap.
  - **Stability.** Signal Forms are stable public API since Angular 22.
  - **Both stay usable.** I know Reactive Forms, and our component library supports both through ControlValueAccessor (ADR-0004).

## 🇩🇪 Kurzfassung (Niveau B1)

Alle Formulare in SignFlow und Belegscan benutzen Signal Forms. Ein Prototyp in Storybook zeigt ein Anmeldeformular. Ein Fehler erscheint erst, wenn man das Feld verlässt oder auf „Anmelden“ klickt, nicht während des Tippens. Ein korrigierter Fehler verschwindet sofort. Fehler vom Server mit einem Feld-Zeiger erscheinen direkt am Feld. Bei falscher E-Mail-Adresse oder falschem Passwort gibt es nur eine allgemeine Meldung über dem Button, damit niemand erfährt, ob ein Konto existiert. Reactive Forms wurden nicht gewählt, weil sie auf RxJS basieren und unsere App auf Signals.

### Fachwortschatz

| Deutsch                                    | English             | Русский                 |
| ------------------------------------------ | ------------------- | ----------------------- |
| das Formular                               | form                | форма                   |
| die Validierung                            | validation          | проверка (валидация)    |
| die Fehlermeldung                          | error message       | сообщение об ошибке     |
| das Pflichtfeld                            | required field      | обязательное поле       |
| das Absenden                               | submit              | отправка                |
| die Serverfehler                           | server errors       | ошибки сервера          |
| die Kontoaufzählung                        | account enumeration | перебор учётных записей |
| den Fokus setzen                           | move the focus      | перевести фокус         |
| die Bildschirmleseanwendung (Screenreader) | screen reader       | экранная читалка        |
