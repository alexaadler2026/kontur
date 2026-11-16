# 013 · Tag и KonturIntl: встроенные тексты библиотеки на трёх языках

Date: 2026-11-16 · Task: [plan 013](../plans/013-tag-kontur-intl.md), [ADR-0006](../adr/0006-i18n-transloco.md) · PR: — · Commits: d9df073…(this entry)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- **`<k-tag>`** — тег для категорий и фильтров («NDA», «Q4-2026»). При желании у тега есть крестик «удалить».
- **`KonturIntl`** — первый встроенный текст библиотеки: слово действия у крестика.
  - В библиотеке три готовых варианта: «Entfernen» (по умолчанию), «Remove», «Удалить».
  - Приложение может подставить свой вариант. В Storybook это сделано через Transloco, поэтому слово переключается вместе с языком в тулбаре.
- **Попутно у `<k-avatar-stack>` появился `size="sm"`** для ячеек таблицы.

**Зачем это нужно (аналогия из жизни).**

- **`KonturIntl` — как сменная табличка на двери.** Производитель двери вешает табличку «Ausgang» по умолчанию. Гостиница в другой стране снимает её и вешает свою — на своём языке, и при этом не переделывает дверь.
  - Библиотека («дверь») не зависит ни от одной i18n-библиотеки.
  - Приложение («гостиница») подменяет провайдер одной строкой: `provideKonturIntl(...)`.
- **Имя крестика «Entfernen NDA», а не просто «Entfernen».** Представь три одинаковые кнопки «Удалить» без подписи, к чему они относятся: незрячий пользователь не поймёт, какой тег удалит. Поэтому имя кнопки состоит из действия и текста тега.

**Термины (одной фразой).**

- **Провайдер** (DI) — запись «когда кто-то просит `KonturIntl`, дай ему вот этот класс». `useClass` подменяет реализацию.
- **Абстрактный класс** — «договор» без готовой реализации. Каждый наследник обязан заполнить `removeLabel`.
- **`aria-labelledby`** — «моё доступное имя собери из текста этих элементов по их id». Если кнопка ссылается сама на себя, берётся её `aria-label`.
- **`translateSignal`** — функция Transloco, которая возвращает сигнал с переводом; он обновляется при смене языка.
- **`afterNextRender`** — выполнить код после того, как Angular обновит DOM. Нужно, чтобы ставить фокус на уже существующую кнопку.

**Как это работает, шаг за шагом.**

1. **`KonturIntl`** — абстрактный injectable с `providedIn: 'root'` и фабрикой `new KonturIntlDe()`. Если приложение ничего не настраивает, получается немецкий.
2. **Члены `KonturIntl` — сигналы.** Когда приложение меняет язык, сигнал меняется, и Tag перерисовывается (OnPush это видит). Это проверяет unit-тест «смена языка во время работы».
3. **Шаблон Tag:**
   - текст лежит в `<span id="…-text">`;
   - кнопка: `<button type="button" class="k-tag-x" id="…-remove" aria-label="Entfernen" aria-labelledby="…-remove …-text">`;
   - браузер собирает имя «Entfernen NDA», а код не читает `textContent`.
4. **`removed`.** Клик, Enter и Space вызывают `removed`. Сам тег **не** исчезает: удаляет его тот, кто хранит данные (список фильтров).
5. **Фокус после удаления.** Тег не знает, куда перевести фокус. Это знает только тот, кто его использует. В story «Filter bar» показан образец: после удаления фокус идёт на крестик следующего тега, если его нет — на предыдущий, если и его нет — на кнопку «Filter hinzufügen». Так клавиатурный пользователь никогда не «падает» на `<body>` (WCAG 2.4.3).
6. **Адаптер в Storybook:**
   - `TranslocoKonturIntl extends KonturIntl { removeLabel = translateSignal('kontur.removeLabel') }`;
   - подключён в `preview.ts` через `provideKonturIntl`;
   - это образец для SignFlow и Belegscan;
   - ключ `kontur.removeLabel` есть в de/en/ru, и проверка паритета это подтверждает.
7. **Тесты:**
   - **unit:** сначала красные на заглушках (11 поведенческих падений), потом 78 из 78 зелёные;
   - **e2e:** Tab → кольцо фокуса цвета `--focus-ring`; наведение → цвет `--error`; фокус после удаления; «Удалить NDA» и «Remove NDA» через тулбар;
   - **мутации:** три записанные, и каждая роняет свой e2e-тест: без `.k-tag-x` в правиле фокуса, без `focus()` в story, без адаптера;
   - **контраст:** новая пара `error` на `bg-subtle` для наведения на крестик — 5.86:1 в светлой теме, 5.23:1 в тёмной (нужно ≥ 3:1).

**Какие были альтернативы и почему отказались.**

- **Читать `textContent` тега и склеивать имя в коде.** Отказались: это хрупко (текст может быть с иконкой или вложенной разметкой), и пришлось бы следить за изменениями. `aria-labelledby` делает это силами браузера.
- **Тег сам удаляет себя из DOM.** Отказались: данные хранит тот, кто использует тег. Если тег исчезнет сам, а данные останутся, экран будет врать.
- **Тег сам переводит фокус.** Отказались: он не знает соседей и не знает, где поле фильтра.
- **Transloco внутри библиотеки.** Отказались: это запрещено ADR-0006 и lint-правилом. У потребителя может быть другая i18n-библиотека.

**Что может сломаться и как починить.**

- **Крестик называется просто «Entfernen».**
  - Причина: текст тега пустой, или тег собран вручную без компонента.
  - Что делать: использовать `<k-tag>` с текстом внутри.
- **После удаления фокус «пропадает».**
  - Причина: потребитель не перевёл фокус.
  - Что делать: повторить образец из story «Filter bar».
- **В приложении слово действия не переключается вместе с языком.**
  - Причина: не подключён `provideKonturIntl(AppKonturIntl)`, и работает немецкий по умолчанию.
  - Что делать: подключить адаптер, как в Storybook.

**Вопрос с собеседования по этой теме.**

- **В:** Как опубликованной библиотеке компонентов поддерживать несколько языков для своих встроенных текстов и не зависеть от i18n-библиотеки?
- **О:** Через абстрактный injectable-сервис со строками (как `MatPaginatorIntl` в Angular Material):
  - библиотека даёт реализации по умолчанию (у нас de, en, ru);
  - приложение подменяет провайдер своей реализацией поверх своей i18n-библиотеки;
  - члены сервиса — сигналы, поэтому компоненты с OnPush сами перерисовываются при смене языка;
  - граница охраняется lint-правилом `no-restricted-imports`.

## 🇬🇧 What and why (full)

**What was done.**

- `<k-tag>`, with an optional remove button.
- `KonturIntl`, the library's built-in strings:
  - German (default), English, Russian;
  - replaceable with `provideKonturIntl`;
  - in Storybook driven by Transloco.
- A `size` input for `<k-avatar-stack>`.

**Why (real-life analogy).** `KonturIntl` is a replaceable door sign. The maker ships "Ausgang"; a hotel abroad hangs its own sign without rebuilding the door. And the remove button says "Entfernen NDA", not just "Entfernen": three identical "remove" buttons are useless to a screen-reader user.

**How it works, step by step.**

1. `KonturIntl` is an abstract `providedIn: 'root'` injectable whose factory returns `KonturIntlDe`.
2. Its members are signals, so OnPush components update on a language switch.
3. The remove button gets `aria-label` = the action and `aria-labelledby` = itself + the text span. The browser computes "Entfernen NDA"; no `textContent` is read.
4. Click, Enter and Space emit `removed`. The consumer removes the tag and moves the focus: next tag, else the previous one, else "Filter hinzufügen" — the pattern shown in the Filter bar story.
5. Storybook provides `TranslocoKonturIntl` (with `translateSignal`) globally: the pattern for the apps.
6. **Tests:**
   - unit tests red first (11 failures), then 78 of 78 green;
   - e2e checks the focus ring, the hover colour, focus after removal and the ru/en action word;
   - three recorded mutations, each failing its e2e test;
   - new contrast pair `error` on `bg-subtle`: 5.86 and 5.23 (≥ 3).

**Alternatives considered and why rejected.**

- **Reading `textContent`:** fragile.
- **A tag that removes itself:** the data owner must do it.
- **A tag that moves focus itself:** it does not know its neighbours.
- **Transloco inside the library:** forbidden by ADR-0006.

**What can break and how to fix it.**

- **The name is only "Entfernen":** use `<k-tag>` with its text.
- **Focus lost after removal:** follow the Filter bar pattern.
- **Built-in strings do not switch language:** provide the app's `KonturIntl`.

**Interview question on this topic.**

- **Q:** How does a published component library translate its own built-in strings without depending on an i18n library?
- **A:** With an abstract injectable strings service (the `MatPaginatorIntl` pattern). The library ships defaults; the app replaces the provider with an implementation on top of its i18n library. Signal members re-render OnPush components on a language switch, and a lint rule guards the boundary.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Bibliothek hat jetzt die Komponente Tag für Kategorien und Filter. Ein Tag kann einen Entfernen-Button haben. Der Button heißt für Screenreader „Entfernen NDA“, also Aktion plus Text des Tags, damit man mehrere Tags unterscheiden kann. Das Wort „Entfernen“ kommt aus `KonturIntl`: Die Bibliothek liefert Deutsch, Englisch und Russisch, und eine App kann eigene Texte einsetzen. In Storybook kommen die Texte aus Transloco und wechseln mit der Sprache. Nach dem Entfernen setzt die App den Fokus, zum Beispiel auf den nächsten Tag. Außerdem hat der Avatar-Stapel jetzt die Größe „sm“ für Tabellen.

### Fachwortschatz

| Deutsch                                     | English          | Русский                                     |
| ------------------------------------------- | ---------------- | ------------------------------------------- |
| das Schlagwort (der Tag)                    | tag              | тег, метка                                  |
| der Entfernen-Button                        | remove button    | кнопка удаления                             |
| der zugängliche Name                        | accessible name  | доступное имя                               |
| der Fokus                                   | focus            | фокус                                       |
| der Anbieter (Provider)                     | provider         | провайдер                                   |
| die abstrakte Klasse                        | abstract class   | абстрактный класс                           |
| eingebaute Texte                            | built-in strings | встроенные тексты                           |
| der Sprachwechsel                           | language switch  | смена языка                                 |
| der Verbraucher (der Nutzer der Komponente) | consumer         | потребитель (тот, кто использует компонент) |
