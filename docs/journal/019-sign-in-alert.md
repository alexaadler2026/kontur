# 019 · Forms/Sign-in: общая ошибка на k-alert, тексты по дизайну

Date: 2026-11-17 · Task: после UI-17, перед задачей 8 · [ADR-0021](../adr/0021-forms-signal-forms.md) · Commits: c6dbe35, c84393a, 359d456, 9f48200, f4737eb, 5c8e905, 0d382b1, bea980f, (this entry)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- **Общая ошибка формы в прототипе «Forms/Sign-in» теперь `k-alert`.** Раньше там стояла разметка ошибки поля (`.k-form-item .k-error-msg`): в Kontur не было стиля для ошибки всей формы. В v4.4 он появился (макет `AnmeldenDunkel`): `k-alert` тона error, `live`, над кнопкой отправки.
- **Каждая неудачная попытка создаёт новый элемент Alert.** Это сделано через `@for (n of [submitCount()]; track n)`, поэтому одинаковый текст озвучивается снова.
- **Тексты en/ru приведены к дизайну** (`Alert.md`, `Anmelden.md`): «Please fill in this field.», «Заполните это поле.», «Введите корректный e-mail.», «Неверный e-mail или пароль.», подпись поля «E-mail». Немецкие тексты уже совпадали.
- **ADR-0021:** пункт «Open for design» закрыт с датой. Само решение ADR не изменилось.
- **Сопутствующие правки по решениям владельца:**
  - контракт: `kAlertActions` → `k-alert-actions` (`c6dbe35`);
  - `next-steps.md`: правило для `kTooltip`, `kMenuTriggerFor`, `kCell`, `kTableToolbar` решаем в UI-6 и UI-10 (`c84393a`);
  - у алерта блокировки нет заголовка — один ключ `errors.auth.throttled`. Это поправлено в `Anmelden.md` (`359d456`) и в примерах `k-alert` (`9f48200`). Владелец обновил превью `Alert.html` и PNG (`f4737eb`): заголовок показан на примере успеха; story Inline снова повторяет превью один в один.

**Термины (одной фразой).**

- **Ключ `track`** — то, по чему Angular узнаёт «тот же самый» элемент в `@for`. Новый ключ — новый элемент.
- **Случайно работающий код** — код, который даёт верный результат по стечению обстоятельств, а не потому, что так задумано. Изменишь соседнюю деталь — и он сломается.

**Аналогия.** Раньше общую ошибку писали на стикере для поля — подходящего бланка не было. Теперь бланк есть (`k-alert`), и на каждую неудачную попытку выдаётся **новый** бланк, а не тот же с прошлого раза. Поэтому охранник (экранная читалка) каждый раз читает его вслух.

**Как это работает, шаг за шагом.**

1. `onSubmit` увеличивает `submitCount`, обнуляет `formError` и отправляет форму.
2. Фейковый сервер отвечает 401 → `mapProblem` даёт код `auth.invalid_credentials` → `formError` получает этот код.
3. Шаблон: `@for (n of [submitCount()]; track n) { @if (formError(); as code) { <k-alert tone="error" live> } }`. На каждой попытке ключ новый, поэтому `k-alert` новый. У нового `role="alert"` читалка озвучивает снова.
4. Ни одно поле не помечается ошибочным: текст не должен выдавать, что именно неверно, e-mail или пароль (ADR-0010).

**Ошибка в самом тесте (честно).** В первом варианте проверки класса регулярное выражение `\b…\b` при записи файла превратилось в управляющие символы. Такой тест падал бы на любом коде, поэтому его красный прогон ничего не доказывал. Это поймали lint (`no-control-regex`) и упавший зелёный прогон. После исправления тест проверен мутацией: со старой разметкой (`span.k-error-msg`) он падает.

**Почему тест повтора был зелёным до правки (честно).** На красном прогоне упали 2 из 7 тестов: класс `k-alert--error` и русские тексты. Тест «вторая попытка — новый элемент» прошёл сразу. Причина: старый код в начале `onSubmit` обнулял `formError`, а через 200 мс фейкового сервера ставил его снова. `@if` видел «ложь → истина» и пересоздавал элемент. Это работало **случайно**: держалось на паузе сервера и на порядке строк. Явный `track` по счётчику делает пересоздание намеренным и совпадает с контрактом. Что тест действительно ловит поломку, доказано мутацией: без `@for` **и** без обнуления `formError` тест падает.

**Изменённые проверки в e2e.** В ru-тесте поменялись ожидаемые тексты и подпись поля («E-mail», «Заполните это поле.», «Неверный e-mail или пароль.»). Причина — изменилось требование: тексты прототипа теперь берутся из дизайна.

**Какие были альтернативы и почему отказались.**

- **Оставить как есть, раз повтор и так работает.** Отказались: поведение держится на совпадении. Если сервер ответит мгновенно или кто-то уберёт обнуление, повтор молча пропадёт.
- **Переименовать ключи `forms.signIn.*` в `auth.*` из `Anmelden.md`.** Владелец решил: оставить до задачи 8. Это ключи прототипа, настоящие появятся в приложении SignFlow.
- **Сразу показать блокировку и «сеанс истёк».** Отложено до задачи 8: у фейкового сервера прототипа нет таких ответов. Блокировка там будет `k-alert` тона warning **без заголовка**, один ключ `errors.auth.throttled` (ICU, `minutes`).

**Что может сломаться и как починить.**

- Симптом: вторая ошибка подряд не озвучивается. → Причина: убран `@for … track` (и обнуление). → Что делать: вернуть `@for (n of [submitCount()]; track n)`. Тест «re-creates the alert» упадёт первым.
- Симптом: ru-тест ищет поле «Электронная почта» и не находит. → Причина: подпись теперь «E-mail», как в дизайне. → Что делать: брать тексты из `Anmelden.md`.

**Вопрос с собеседования.**

- В: Тест сразу зелёный, хотя ты написал его до правки. Это плохо?
- О: Это сигнал разобраться. Либо тест ничего не проверяет, либо поведение уже есть. Здесь поведение было, но случайное. Тогда делают мутацию: ломают то, что должно ломать поведение, и смотрят, упадёт ли тест. Тест упал, когда убрали и `@for`, и обнуление, — значит он защищает поведение. А `@for` сделал это поведение намеренным, а не случайным.

## 🇬🇧 What and why (full)

**What was done.** The form-level error of the "Forms/Sign-in" prototype is now `k-alert` (tone error, `live`, above the submit button; Kontur v4.4, mockup `AnmeldenDunkel`) instead of the field error markup. Every failed attempt re-creates it via `@for (n of [submitCount()]; track n)`, so the same text is announced again. en/ru texts follow `Alert.md` and `Anmelden.md`. ADR-0021's "Open for design" item is marked resolved. Related owner decisions: the contract uses `k-alert-actions`; the selector rule for `kTooltip`, `kMenuTriggerFor`, `kCell` and `kTableToolbar` is decided at UI-6/UI-10; the throttling alert has no title — one key `errors.auth.throttled` (fixed in `Anmelden.md` and in the `k-alert` examples).

**Why (real-life analogy).** The general error used to be written on a field sticker because no proper form existed. Now there is one, and each failed attempt gets a fresh copy, so the guard (the screen reader) reads it aloud every time.

**How it works, step by step.** 1) `onSubmit` increments `submitCount`, clears `formError`, submits. 2) The fake server answers 401 → `mapProblem` → `formError = 'auth.invalid_credentials'`. 3) `@for … track n` gives a new key per attempt, so a new `k-alert` with `role="alert"` is inserted. 4) No field is marked invalid (ADR-0010, no account enumeration).

**A bug in the test itself.** The first class check used a `…` regular expression that turned into control characters when the file was written; it would fail on any code, so its red run proved nothing. Lint (`no-control-regex`) and a failing green run caught it; after the fix a mutation (old `span.k-error-msg` markup) made it fail.

**Honest note on the red run.** Two of seven tests failed first (the `k-alert--error` class, the Russian texts). The re-creation test passed immediately: the old code cleared `formError` and set it again after the 200 ms fake server delay, so `@if` happened to re-create the node. That worked by accident. The explicit `track` key makes it intentional. A mutation (no `@for` and no clearing) made the test fail, so it does guard the behaviour.

**Changed expectations.** The ru test now expects the design texts and the "E-mail" label — the requirement changed (texts come from the design).

**Alternatives considered and why rejected.** Keep the accidental behaviour — fragile. Rename `forms.signIn.*` to `auth.*` now — the owner chose to wait for task 8. Show throttling and session-expired now — the prototype's fake server has no such responses; in task 8 throttling is a warning `k-alert` without a title, one ICU key `errors.auth.throttled`.

**What can break and how to fix it.** The second identical error is silent → `@for … track` was removed → restore it; the e2e test fails first. The ru test cannot find "Электронная почта" → the label is "E-mail" now, as in the design.

**Interview question on this topic.** Q: A test you wrote before the change was green immediately — is that bad? A: It is a signal to investigate: either the test checks nothing, or the behaviour already exists. Here it existed by accident. Prove the test with a mutation: break what should break the behaviour and see it fail. Then make the behaviour intentional.

## 🇩🇪 Kurzfassung (Niveau B1)

Im Prototyp „Forms/Sign-in“ zeigen wir den allgemeinen Formularfehler jetzt mit `k-alert` an, wie im Entwurf Kontur v4.4. Der Fehler steht über der Schaltfläche „Anmelden“ und wird vom Screenreader sofort vorgelesen. Bei jedem fehlgeschlagenen Versuch entsteht ein neues Element (`@for … track`), deshalb wird derselbe Text erneut vorgelesen. Die englischen und russischen Texte entsprechen jetzt dem Design. Ein Test war schon vor der Änderung grün, weil das alte Verhalten zufällig funktionierte. Mit einer Mutation haben wir gezeigt, dass der Test einen Fehler wirklich findet. Die Sperre nach zu vielen Versuchen kommt in Aufgabe 8: eine Warnung ohne Titel, ein Schlüssel `errors.auth.throttled`.

### Fachwortschatz

| Deutsch                     | English            | Русский            |
| --------------------------- | ------------------ | ------------------ |
| der Formularfehler          | form-level error   | общая ошибка формы |
| der fehlgeschlagene Versuch | failed attempt     | неудачная попытка  |
| neu erzeugen                | re-create          | пересоздать        |
| zufällig funktionieren      | work by accident   | работать случайно  |
| die Mutation (im Test)      | mutation           | мутация            |
| die Anmeldesperre           | sign-in throttling | блокировка входа   |
| der Übersetzungsschlüssel   | translation key    | ключ перевода      |
| die Beschriftung            | label              | подпись поля       |
