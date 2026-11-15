# 012 · Badge и Avatar: статус не только цветом, аватар как одна картинка

Date: 2026-11-15 · Task: [plan 012](../plans/012-badge-avatar.md) · PR: — · Commits: fd5b735…(this entry)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** В библиотеке появились три компонента:

- **`<k-badge>`** — бейдж статуса: «Entwurf», «Wartet», «Signiert», «Abgelehnt», «In Prüfung».
- **`<k-avatar>`** — кружок с инициалами человека: «Anna Berger» → «AB».
- **`<k-avatar-stack>`** — несколько кружков внахлёст и «+N» для остальных, например «AB JB MB +2».

**Зачем это нужно (аналогия из жизни).**

- **Бейдж — как светофор для людей, которые не различают цвета.** На светофоре сигналы отличаются не только цветом, но и местом: красный всегда сверху. У бейджа то же самое: кроме цвета, у точки своя **форма** (круг, ромб, квадрат, кольцо), и рядом **всегда текст**. Это WCAG 1.4.1: информация не должна передаваться только цветом.
- **Стек аватаров — как групповое фото с подписью.** Под фото пишут одну подпись «Отдел продаж: Анна, Йонас и ещё двое», а не подписывают каждое лицо отдельно. Для скринридера стек — **одна картинка с одной подписью**, которую передаёт приложение.

**Термины (одной фразой).**

- **`role="img"`** — говорит скринридеру «это картинка», и он читает её `aria-label`, а не содержимое.
- **`aria-hidden="true"`** — прячет элемент от скринридера; на экране он остаётся.
- **Графема** — один видимый символ, даже если он записан несколькими кодами. Например, «É» можно записать как «E» + отдельный знак ударения.
- **`Intl.Segmenter`** — встроенный в браузер API, который делит текст на графемы, слова или предложения по правилам языка.
- **`::before`** — «псевдоэлемент»: CSS рисует его перед содержимым, в HTML его нет. Точка бейджа — это `::before`.

**Как это работает, шаг за шагом.**

1. **Badge.**
   - Компонент ставит на свой элемент классы `k-badge` и `k-badge--<tone>`. У `neutral` модификатора нет, как у Button размер md.
   - CSS перенесён из эталона дословно. Например, у warning точка повёрнута на 45° (`rotate: 45deg`), и получается ромб.
   - Точка декоративная: она нарисована в CSS, поэтому скринридер читает только текст.
2. **Инициалы** считает функция `initials(name)`:
   - разбивает имя по пробелам;
   - берёт первую графему первого и последнего слова: «Ursula von der Leyen» → «UL»;
   - одно слово даёт одну букву: «Max» → «M»;
   - графемы берутся через `Intl.Segmenter`, поэтому «É» из двух кодов не разваливается.
3. **Avatar** — `role="img"` и `aria-label` с полным именем. Иначе скринридер прочитал бы «А-Бэ», и это ничего бы не значило.
4. **AvatarStack.**
   - Показывает первые `max` имён (по умолчанию 3), остальные — кружком «+N» с классом `k-avatar--more`.
   - Сам стек — `role="img"` с обязательным `ariaLabel` от приложения. Кружки внутри — `aria-hidden`, чтобы имена не читались дважды, а «+2» не звучало без контекста.
5. **Тесты.**
   - **Unit-тесты** (Angular Testing Library): я сначала увидел их красными на заглушках с пустым шаблоном — 18 падений, все поведенческие. Потом реализация, и все 66 тестов библиотеки зелёные.
   - **e2e** (Playwright) проверяют то, что видно только в настоящем браузере:
     - форму точки через `getComputedStyle(el, '::before')`;
     - размеры 28 и 22 px;
     - наложение −6px;
     - цвет «+N».
   - Цвет «+N» сравнивается не с выдуманным hex, а со значением токена `--bg-subtle`, которое вычисляет сам браузер.
   - Сила e2e доказана **мутацией**: я убрал поворот ромба и класс `--more`, и оба теста упали. После этого CSS восстановлен.
   - axe-проверка автоматически пробежала по новым story.

**Какие были альтернативы и почему отказались.**

- **Цветная точка без формы.** Отказались: дальтоник не отличит warning от error (WCAG 1.4.1). Это требование дизайна.
- **Фото вместо инициалов.** Отказались по контракту: фото — это персональные данные, и с ними сложнее (DSGVO). Инициалов достаточно.
- **У каждого аватара в стеке своё имя для скринридера.** Отказались: прозвучало бы «Anna Berger, Jonas Becker, Max Beispiel, плюс два» — длинно и без смысла «кто это». Подпись от приложения («Unterzeichnende: …») объясняет, что это за люди.
- **Вложенные `<k-avatar>` внутри стека.** Отказались: внутри одной картинки оказались бы другие картинки со своими именами. Простые `<span>` проще и честнее.

**Что может сломаться и как починить.**

- **Скринридер читает «AB» вместо имени.**
  - Причина: кружок нарисован вручную как `<span class="k-avatar">`, без компонента.
  - Что делать: использовать `<k-avatar name="…">`.
- **Подпись стека не совпадает с тем, что видно** (например, имена поменялись, а `ariaLabel` — нет).
  - Причина: подпись делает приложение.
  - Что делать: строить её из того же массива `names`.
- **e2e падает со «strict mode violation».**
  - Причина: `getByRole` ищет имя как подстроку и находит несколько элементов.
  - Что делать: `exact: true` (на этом я и споткнулся).

**Вопрос с собеседования по этой теме.**

- **В:** Как сделать статус доступным для людей, которые не различают цвета?
- **О:** Никогда не передавать информацию только цветом (WCAG 1.4.1):
  - всегда есть текст статуса;
  - есть второй визуальный признак — у нас форма точки: круг, ромб, квадрат, кольцо;
  - контраст пар «текст на фоне» ≥ 4.5:1 проверяется тестом токенов.

  Декоративные элементы (точка в `::before`) скринридер не читает, поэтому никакого лишнего шума нет.

## 🇬🇧 What and why (full)

**What was done.** Three components:

- `<k-badge>` — a status pill;
- `<k-avatar>` — initials in a circle;
- `<k-avatar-stack>` — overlapping circles plus "+N".

**Why (real-life analogy).**

- **The badge is a traffic light for colour-blind people.** Each signal differs not only by colour but by position. Our dot has a different shape per tone, and the text is always there (WCAG 1.4.1).
- **The avatar stack is a group photo with one caption.** It is one image for a screen reader, with one label from the app.

**How it works, step by step.**

1. **Badge.** It sets `k-badge k-badge--<tone>` on its host; neutral has no modifier. The CSS is ported verbatim. The dot is a decorative `::before`.
2. **Initials.** `initials(name)` takes the first grapheme of the first and the last word, via `Intl.Segmenter`, so "É" written as E plus a combining accent stays whole. One word gives one letter.
3. **Avatar.** It is `role="img"` named by the full name.
4. **AvatarStack.** It shows the first `max` names (default 3) and "+N" in `k-avatar--more`. It is one `role="img"` with the app's required `ariaLabel`; the circles inside are `aria-hidden`.
5. **Tests.**
   - Unit tests went red first against empty stubs (18 behavioural failures).
   - E2E checks computed `::before` shapes, sizes, the −6 px overlap, and the "+N" background compared with the browser's own `--bg-subtle`.
   - A recorded mutation (no diamond, no `--more`) failed both e2e tests.

**Alternatives considered and why rejected.**

- **A colour-only dot** — rejected: it fails 1.4.1.
- **Photos** — rejected: personal data, more risk.
- **A name per circle in the stack** — rejected: noisy and without context.
- **Nested `<k-avatar>` in the stack** — rejected: images inside an image.

**What can break and how to fix it.**

- **A hand-made `<span class="k-avatar">` is read as letters.** Use the component.
- **The stack label no longer matches its names.** Build the label from the same array.
- **Playwright's `getByRole` name is a substring match.** Use `exact: true`.

**Interview question on this topic.**

- **Q:** How do you make a status accessible to colour-blind users?
- **A:** Never use colour alone:
  - always show the text;
  - add a second visual cue — here the dot shape;
  - check text contrast against its background (≥ 4.5:1).

  Decorative parts stay out of the accessibility tree.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Bibliothek hat drei neue Komponenten: Badge, Avatar und Avatar-Stapel. Ein Badge zeigt einen Status, zum Beispiel „Signiert“ oder „Abgelehnt“. Der Status ist nie nur eine Farbe: Es gibt immer einen Text, und der Punkt hat je nach Status eine andere Form (Kreis, Raute, Quadrat, Ring). Ein Avatar zeigt die Initialen einer Person; für Screenreader ist er ein Bild mit dem vollen Namen. Ein Avatar-Stapel zeigt höchstens drei Personen und „+N“ für die anderen. Für Screenreader ist der ganze Stapel ein einziges Bild mit einer Beschriftung von der App. Die Unit-Tests waren zuerst rot, die E2E-Tests wurden mit einer Mutation geprüft.

### Fachwortschatz

| Deutsch                        | English                    | Русский                 |
| ------------------------------ | -------------------------- | ----------------------- |
| das Badge (das Status-Etikett) | badge                      | бейдж, значок статуса   |
| die Initialen                  | initials                   | инициалы                |
| der Avatar-Stapel              | avatar stack               | стек аватаров           |
| die Form                       | shape                      | форма                   |
| die Raute                      | diamond                    | ромб                    |
| die Farbenblindheit            | colour blindness           | дальтонизм              |
| die Beschriftung               | label                      | подпись                 |
| das Graphem                    | grapheme                   | графема                 |
| ausblenden (für Screenreader)  | hide (from screen readers) | скрыть (от скринридера) |
