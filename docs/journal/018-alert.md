# 018 · UI-17: Alert (InlineAlert + Banner)

Date: 2026-11-17 · Task: UI-17 (фаза 1, перед задачей 8) · Spec: [Alert.md](../design/components/Alert.md) · Commits: 78b9df0, 536f95c, (this entry)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- **`k-alert`** в `libs/ui` — сообщение внутри страницы. Сам не исчезает и сам не получает фокус.
  - Тон: `info` (по умолчанию), `success`, `warning`, `error`. У каждого тона свой фон, кромка и своя **форма** иконки.
  - Вариант: `inline` (в форме или блоке) или `banner` (во всю ширину, вверху каркаса).
  - Есть заголовок `title`, строка действий `<div k-alert-actions>` и кнопка закрытия `dismissible`.
- **KonturIntl** получил `closeLabel` — это имя кнопки закрытия: «Schließen», «Close», «Закрыть».
- **Storybook**: stories Inline, Banner, Dark theme, Dismissible, Re-announce. Ключ `kontur.closeLabel` добавлен в de/en/ru.
- **Отдельный коммит `docs(design)`**: по решению владельца исправлены `Alert.md` и контракт. Почему — ниже, в разделе про повторное озвучивание.

**Термины (одной фразой).**

- **Живая область (live region)** — элемент с `role="alert"` или `role="status"`. Когда он появляется, экранная читалка сама произносит его текст.
- **`role="alert"`** — срочное сообщение: читалка прерывает текущую речь. Подходит для ошибок и предупреждений.
- **`role="status"`** — вежливое сообщение: читалка дождётся паузы. Подходит для информации и успеха.
- **Tabbable** — элемент, до которого можно дойти клавишей Tab: ссылка, неотключённая кнопка, поле ввода.
- **Controlled component** («управляемый компонент») — состояние (здесь: показан ли Alert) хранит хост, а компонент только сообщает о событиях.

**Аналогия.** Alert — это табличка на двери: «Сегодня закрыто». Toast — как объявление по громкой связи: прозвучало и пропало. Табличку снимает завхоз (хост), а не она сама. Но прежде чем табличку снимут, она показывает, куда идти дальше: фокус переходит на следующую дверь.

**Как это работает, шаг за шагом.**

1. **Роль только при `live`.** `live=true` значит, что сообщение появилось в ответ на действие пользователя: error/warning получают `role="alert"`, info/success — `role="status"`. Без `live` роли нет вообще. Сообщение «Сеанс истёк» после перехода на страницу входа есть с самого начала, и читалка встретит его в обычном порядке чтения.
2. **Иконка по тону** выбирается через `@switch`: `LucideInfo`, `LucideCircleCheck`, `LucideTriangleAlert`, `LucideCircleAlert` из `@lucide/angular` (ADR-0022). Иконка декоративная (`aria-hidden`): смысл несёт текст, а форма иконки нужна тем, кто плохо различает цвета (WCAG 1.4.1).
3. **Повторное озвучивание.** Читалка молчит, если в живой области ничего не поменялось. Две неудачные попытки входа подряд дают одинаковый текст, и вторую ошибку читалка бы не произнесла. Поэтому хост пересоздаёт элемент:
   ```html
   @for (n of [submitCount()]; track n) { @if (n > 0) { <k-alert tone="error" live>…</k-alert> } }
   ```
   `@for` с ключом `track n`: когда счётчик меняется, меняется ключ. Angular уничтожает старый элемент и вставляет новый, а новую живую область читалка озвучивает. **Почему не `@if (submitCount())`**: после первой ошибки условие истинно и таким остаётся (1, 2, 3 — всё «истина»). Angular ничего не пересоздаёт, и второе объявление не звучит. В дизайне было написано «`@if` по счётчику» — это исправлено отдельным коммитом `docs(design)`.
4. **Закрытие.** По кнопке компонент **сначала** переносит фокус, **потом** отправляет `dismissed`. Фокус уходит на следующий элемент после алерта, до которого можно дойти Tab. Если такого нет — на `h1` страницы (ему ставится `tabindex="-1"`, чтобы на заголовок можно было поставить фокус из кода). Порядок важен: если бы хост убрал алерт раньше, фокус остался бы на исчезнувшей кнопке и улетел на `<body>`.
5. **Видимостью владеет хост.** Сам себя компонент не прячет. Хост держит `visible = signal(true)` и пишет `@if (visible())`. Так у видимости один источник правды.
6. **Мелочь про `title`.** Входное свойство называется `title`. Angular оставляет статический атрибут `title="…"` и на самом теге `<k-alert>`, а это всплывающая подсказка браузера и лишнее описание для читалки. Поэтому в `host` стоит `'[attr.title]': 'null'`, и тест это проверяет.

**Красный прогон и мутации.**

- Unit-тесты запускались против заготовки (только API, без поведения): **23 падения по поведению**.
- 4 теста «`live=false` → роли нет» на заготовке проходили сами. Их проверил мутацией: убрал проверку `live` — упали все четыре.
- e2e, мутация 1: убрал перенос фокуса — тест Dismissible упал.
- e2e, мутация 2: заменил в story `@for` на `@if (submitCount() > 0)` — тест Re-announce упал.
- **Изменение чужого теста.** В `tag.spec.ts` подмена `SwitchableIntl` получила строку `closeLabel`. Причина: у `KonturIntl` появился новый обязательный (abstract) член, и без этой строки тест не компилируется. Поведение Tag тест проверяет то же, что и раньше.

**Какие были альтернативы и почему отказались.**

- **Компонент сам прячет себя после закрытия (uncontrolled).** Отказались по решению владельца: тогда видимость хранилась бы в двух местах — внутри компонента и у хоста. Хост мог бы думать, что Alert показан, когда он уже скрыт. Так же устроен Tag.
- **Компонент сам отсекает или сам переозвучивает повторы** (например, очищает текст и вставляет его заново). Отказались: такие трюки по-разному работают в разных читалках. Новый элемент — самый надёжный сигнал, и так записано в контракте.
- **Фокус всегда на `h1`.** Проще, но пользователь клавиатуры теряет место в форме. Следующий элемент по Tab ближе к тому, где он был.
- **Селектор `[kAlertActions]` из контракта.** Lint библиотеки требует kebab-case для директив (`k-input`, `k-button`), поэтому `[k-alert-actions]`. Расхождение с контрактом вынесено владельцу.

**Что может сломаться и как починить.**

- Симптом: вторая одинаковая ошибка не озвучивается. → Причина: хост использует `@if (count())`. → Что делать: `@for (n of [count()]; track n)`.
- Симптом: после закрытия фокус оказывается на `<body>`. → Причина: после алерта нет элементов, до которых можно дойти Tab, и на странице нет `h1`. → Что делать: у страницы должен быть `h1` (это и так требование доступности).
- Симптом: при наведении на алерт всплывает подсказка с заголовком. → Причина: пропала привязка `[attr.title]`. → Тест «host gets no native title» упадёт.

**Вопрос с собеседования.**

- В: Чем controlled-компонент отличается от uncontrolled? Какой выбрали для Alert и почему?
- О: У uncontrolled-компонента состояние живёт внутри него: он сам решает, показан он или нет, а снаружи об этом только узнают (как у `<input>` без привязки, где значение хранит сам DOM). У controlled-компонента состояние хранит хост, а компонент лишь сообщает о намерении через событие: «меня хотят закрыть» (`dismissed`). Плюс controlled — один источник правды: хост может закрыть Alert и по таймеру, и по навигации, и по кнопке, и никогда не рассинхронизируется с компонентом. Минус — хосту нужно написать `@if` и одну строку обработчика. Для Alert выбрали controlled, как и для Tag. Но то, что хост сделать не может, компонент делает сам: переносит фокус до того, как исчезнет.

## 🇬🇧 What and why (full)

**What was done.** `k-alert` in `libs/ui`: an in-page message that never auto-dismisses and is not focusable itself. Tones info/success/warning/error (each with its own icon shape), variants inline/banner, an optional `title`, an actions row `<div k-alert-actions>` and an optional close button. `KonturIntl` gained `closeLabel` (Schließen / Close / Закрыть), also wired to Transloco in Storybook. A separate `docs(design)` commit, approved by the owner, fixed the spec and the contract: re-creation uses `@for … track`, the member is `closeLabel`, and visibility is owned by the host.

**Why (real-life analogy).** An alert is a sign on a door, not a loudspeaker announcement: it stays until someone takes it down. The caretaker (the host) takes it down; before that, the sign points you to the next door (focus moves on).

**How it works, step by step.**

1. A role only with `live`: error/warning → `role="alert"` (assertive), info/success → `role="status"` (polite). Without `live`, no role: the message was there on page load and is read in normal reading order.
2. The icon comes from `@switch` on the tone, from `@lucide/angular`, decorative (`aria-hidden`). Shape plus text, never colour alone (WCAG 1.4.1).
3. Re-announcement: screen readers stay silent when a live region does not change. The host re-creates the element with `@for (n of [submitCount()]; track n)`: a new track key destroys the old node and inserts a new one. `@if (submitCount())` does not work, because once the counter is 1 the condition stays true and Angular keeps the node.
4. Close: the component first moves the focus (the next tabbable element after the alert, else the page `h1` with `tabindex="-1"`), then emits `dismissed`. The host removes the alert with `@if`.
5. `[attr.title]: 'null'` on the host: the `title` input would otherwise leave a native tooltip on `<k-alert>`.

Red run: 23 behavioural failures against a stub. The four "no role without live" tests were proven by a mutation, and two e2e mutations were recorded (no focus move; `@if` instead of `@for`). `tag.spec.ts` got one line because `KonturIntl` has a new abstract member.

**Alternatives considered and why rejected.**

- A self-hiding (uncontrolled) alert: two sources of truth for visibility; rejected by the owner, consistent with Tag.
- Deduplicating or re-announcing inside the component (clearing and re-inserting the text): screen readers behave inconsistently; a new element is the most reliable signal.
- Always focusing `h1`: simpler, but the keyboard user loses their place.
- The selector `[kAlertActions]` from the contract: the library lint enforces kebab-case attribute selectors, so it is `[k-alert-actions]`; the mismatch is raised with the owner.

**What can break and how to fix it.** The second identical error is silent → the host uses `@if (count())` → use `@for … track`. Focus lands on `<body>` → nothing tabbable after the alert and no `h1` → every page needs an `h1`. A native tooltip appears → the `[attr.title]` binding was removed; a unit test guards it.

**Interview question on this topic.** Q: Controlled vs uncontrolled component — which one is `k-alert` and why? A: Uncontrolled components keep their state inside (like an unbound `<input>`, where the DOM holds the value); controlled components let the host own the state, and the component only reports intent through an event. `k-alert` is controlled: the host owns visibility, so it can close the alert on a click, a timer or a navigation without ever getting out of sync. The cost is one `@if` and one handler in the host. What the host cannot do — move the focus before the button disappears — the component does itself.

## 🇩🇪 Kurzfassung (Niveau B1)

Wir haben die Komponente `k-alert` gebaut. Sie zeigt eine Meldung direkt auf der Seite, zum Beispiel „E-Mail-Adresse oder Passwort ist falsch.“ Die Meldung verschwindet nicht von selbst. Es gibt vier Töne (Info, Erfolg, Warnung, Fehler), und jeder Ton hat ein eigenes Symbol, damit die Bedeutung nicht nur über die Farbe erkennbar ist. Wenn `live` gesetzt ist, liest der Screenreader die Meldung sofort vor. Damit ein zweiter gleicher Fehler wieder vorgelesen wird, erzeugt die Seite das Element mit `@for … track` neu; `@if` reicht dafür nicht. Beim Schließen setzt die Komponente den Fokus zuerst auf das nächste Element und meldet dann `dismissed`. Die wichtigste Entscheidung: Die Sichtbarkeit gehört der Seite (kontrollierte Komponente), nicht der Komponente selbst – so gibt es nur eine Quelle der Wahrheit.

### Fachwortschatz

| Deutsch                         | English                | Русский                      |
| ------------------------------- | ---------------------- | ---------------------------- |
| die Meldung                     | message, alert         | сообщение                    |
| der Live-Bereich                | live region            | живая область                |
| der Screenreader                | screen reader          | экранная читалка             |
| erneut vorlesen                 | re-announce            | озвучить повторно            |
| der Fokus                       | focus                  | фокус                        |
| schließen                       | dismiss, close         | закрыть                      |
| die kontrollierte Komponente    | controlled component   | управляемый компонент        |
| die einzige Quelle der Wahrheit | single source of truth | единственный источник правды |
| die Schaltfläche                | button                 | кнопка                       |
| der Ton (Farbton)               | tone                   | тон                          |
