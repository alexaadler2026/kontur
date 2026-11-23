# 042 · UI-1: Spinner, Progress, ProgressRing и KonturIntl.locale

Date: 2026-11-23 · Task: UI-1 (roadmap §7, plan `docs/plans/042-progress.md`) · PR: — · Commits: `30ff9ea`…`6a68703`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
В библиотеке `libs/ui` появились три индикатора «идёт работа»:

- `<k-spinner label="Lädt" />` — крутящийся кружок, когда неизвестно, сколько ждать;
- `<k-progress label="Text erkennen" [value]="68" />` — полоса с подписью и процентом
  (68 %); `[value]="null"` — «бегущая» полоса, когда процента ещё нет;
- `<k-progress-ring label="…" [value]="68" showValue />` — то же кольцом, как в макете.

Первым понадобится спиннер на кнопке «Anmelden» (задача 8), полоса — при загрузке PDF
(16) и разборе страниц (20).

Вдобавок у `KonturIntl` (сервис со встроенными текстами библиотеки) появился сигнал
`locale` — локаль языка интерфейса (`de-DE`, `en-GB`, `ru-RU`). **Сигнал** — значение,
которое само сообщает Angular, что оно поменялось, и экран перерисовывается.

До кода — отдельный коммит `docs(design)` с решениями владельца: процент через `Intl`,
у полос в макете нет имени, один брейкпоинт 960 px, уточнения к Toast (для UI-2).

**Зачем это нужно (аналогия из жизни).**
Табло на вокзале: мало показать полоску «загружено на 68 %», надо ещё сказать, _что_
загружается. Человек на табло смотрит, а незрячему табло читает **скринридер**
(программа, которая проговаривает экран). Если у полосы нет имени, он слышит только
«индикатор, 68 %» — и не понимает, чего именно ждёт.

**Как это работает, шаг за шагом.**

1. `k-progress` рисует строку «подпись слева, процент справа» и под ней полосу.
2. У полосы `role="progressbar"` и `aria-labelledby` = id видимой подписи. **ARIA** —
   атрибуты, которые объясняют скринридеру, что это за элемент. Так полоса получает имя
   из того же текста, который видит глаз, — переводить отдельно ничего не надо.
3. Число ограничивается 0–100 (`clampPercent`): −5 → 0, 140 → 100, полоса не вылезает.
4. Процент форматирует `Intl.NumberFormat(locale, { style: 'percent' })`: де «68 %»,
   en «68%», ru «68 %». Между числом и знаком в de/ru стоит **неразрывный пробел**
   (U+00A0), чтобы «%» не уехал на новую строку. Руками это легко забыть — поэтому Intl.
5. Тот же текст уходит в `aria-valuetext`, а видимая копия помечена `aria-hidden`:
   скринридер прочитает процент один раз, а не два.
6. `locale` — сигнал, поэтому при смене языка процент перерисовывается сам. В SignFlow
   и Storybook адаптер берёт локаль активного языка из `languages.json`.
7. `value = null` — класс `is-indeterminate`, нет `aria-valuenow` и процента: так
   стандарт ARIA говорит «длительность неизвестна».
8. Кольцо — SVG из макета (48 px, радиус 20); дуга рисуется через
   `stroke-dasharray`/`stroke-dashoffset` (длина окружности 2πr ≈ 125,66, при 68 %
   «открыто» 32 % ≈ 40,21). SVG — украшение (`aria-hidden`), имя у самого элемента.
9. Стили перенесены 1:1 из `components.css`, только токены. При «меньше движения» в
   настройках системы полоса не бегает, спиннер крутится медленнее (это уже было в
   `kontur-base.css`).

**Проверено.**

- Тесты сначала красные (нет модулей), потом зелёные: ui 127, signflow 30.
- Мутации: процент «руками» → 8 тестов падают; без ограничения 0–100 → 2; без имени → 3.
- `nx affected -t lint test build e2e` (CI=true): всё зелёное, axe по stories — 37 из 37.
- Руками: `pnpm nx run ui-storybook:storybook`, открыть _Components → Progress → States_,
  переключить язык в панели: в en процент без пробела «68%», в de/ru «68 %».

**Какие были альтернативы и почему отказались.**

- Процент строкой `` `${value} %` ``. Отказались: в en пробела быть не должно, а в de/ru
  нужен неразрывный; Intl знает это сам (решение владельца).
- `LOCALE_ID` / `PercentPipe` Angular. Отказались: `LOCALE_ID` задаётся при старте и не
  меняется при смене языка на лету.
- `aria-label` на полосе. Отказались: это вторая копия текста; `aria-labelledby` берёт
  имя из видимой подписи — что видно, то и слышно.

**Что может сломаться и как починить.**

- Симптом: тест не находит «68 %» через `getByText`. → Причина: Testing Library по
  умолчанию превращает неразрывный пробел в обычный. → Что делать: искать с
  `normalizer: (t) => t` (так сделано в `progress.spec.ts`).
- Симптом: новая своя реализация `KonturIntl` не компилируется. → Причина: появился
  обязательный член `locale`. → Что делать: добавить `locale` (сигнал строки BCP 47).
- Симптом: процент не меняется при смене языка. → Причина: адаптер отдаёт `locale` не
  как сигнал. → Что делать: `computed` от активного языка, как в `kontur-intl.ts`.

**Вопрос с собеседования по этой теме.**

- В: Почему у `role="progressbar"` есть и `aria-valuenow`, и `aria-valuetext`?
- О: `aria-valuenow` — само число (68), для логики и для техники. `aria-valuetext` —
  то, что скринридер скажет человеку: «68 %» по правилам языка. Без него он прочитал бы
  просто «68». А в бесконечном режиме обоих нет — так стандарт говорит «неизвестно».

## 🇬🇧 What and why (full)

**What was done.** `libs/ui` got three progress indicators: `k-spinner` (unknown
duration), `k-progress` (label row + 6 px bar; `value = null` = indeterminate) and
`k-progress-ring` (the mockup's SVG ring, optional value in the centre). `KonturIntl`
got a `locale` signal (`de-DE` / `en-GB` / `ru-RU`); the Transloco adapters in SignFlow
and Storybook derive it from the active language via `languages.json`. A separate
`docs(design)` commit recorded the owner's decisions first: percent via Intl, the
mockup's bars had no accessible name, 960 px as the one breakpoint, Toast details for UI-2.

**Why (real-life analogy).** A departure board must say _what_ is 68 % done, not only
show a bar. A screen reader user hears "progress bar, 68 %" without a name — and has no
idea what they are waiting for.

**How it works, step by step.**

1. The bar is `role="progressbar"` named by the visible label through `aria-labelledby`
   (what you see is what you hear; no second string to translate).
2. The value is clamped to 0–100.
3. The percent is `Intl.NumberFormat(locale, { style: 'percent' })` — "68 %" in de and ru
   with a non-breaking space, "68%" in en — and is exposed as `aria-valuetext`; the
   visible copy is `aria-hidden`, so it is announced once.
4. `locale` is a signal: a runtime language switch re-renders the percent.
5. Indeterminate: `is-indeterminate`, no `aria-valuenow`/`aria-valuetext`, no percent.
6. Ring: 48 px, r 20, arc via `stroke-dasharray` (2πr ≈ 125.66) and `stroke-dashoffset`
   (32 % open at 68 % ≈ 40.21); the SVG is decorative, the host carries `aria-label`.
7. CSS ported 1:1 from `components.css`, tokens only; reduced motion already handled
   in `kontur-base.css`.

Verified: red first, then green (ui 127, signflow 30); mutations caught (hand-made
percent 8 tests, no clamp 2, no name 3); `nx affected -t lint test build e2e` green,
axe 37/37 stories.

**Alternatives considered and why rejected.** A hand-built string (wrong spacing per
language); Angular `LOCALE_ID`/`PercentPipe` (fixed at bootstrap, cannot follow a runtime
switch); `aria-label` on the bar (a duplicate of the visible text).

**What can break and how to fix it.** `getByText` normalises the NBSP to a space → use an
identity `normalizer`. A custom `KonturIntl` stops compiling → implement `locale`. The
percent ignores a language switch → expose `locale` as a `computed` of the active language.

**Interview question on this topic.** Q: Why both `aria-valuenow` and `aria-valuetext`?
A: `valuenow` is the number for machines; `valuetext` is what the user hears, formatted
for their language ("68 %"). In indeterminate mode both are absent — that is how ARIA
says "unknown".

## 🇩🇪 Kurzfassung (Niveau B1)

Die Bibliothek `libs/ui` hat jetzt drei Fortschrittsanzeigen: einen Spinner, einen
Fortschrittsbalken und einen Fortschrittsring. Der Balken zeigt eine Beschriftung und
den Prozentwert. Ohne Wert läuft der Balken als „unbestimmt“ hin und her. Im Entwurf
hatten die Balken keinen zugänglichen Namen; jetzt bekommt jeder Balken seinen Namen
aus der sichtbaren Beschriftung (`aria-labelledby`). Den Prozentwert formatiert
`Intl.NumberFormat` in der Sprache der Oberfläche: „68 %“ auf Deutsch, „68%“ auf
Englisch. Dafür hat `KonturIntl` ein neues Signal `locale`. Wechselt die Sprache,
aktualisiert sich die Anzeige sofort. Die wichtigste Entscheidung: Zahlen nie von Hand
formatieren, sondern immer mit Intl.

### Fachwortschatz

| Deutsch                            | English                 | Русский                       |
| ---------------------------------- | ----------------------- | ----------------------------- |
| der Fortschrittsbalken             | progress bar            | индикатор выполнения (полоса) |
| unbestimmt                         | indeterminate           | неопределённый (бесконечный)  |
| der zugängliche Name               | accessible name         | доступное имя                 |
| der Bildschirmleser                | screen reader           | скринридер                    |
| das geschützte Leerzeichen         | non-breaking space      | неразрывный пробел            |
| das Gebietsschema                  | locale                  | локаль                        |
| die Sprachumschaltung zur Laufzeit | runtime language switch | смена языка на лету           |
| der Haltepunkt (Breakpoint)        | breakpoint              | брейкпоинт                    |
