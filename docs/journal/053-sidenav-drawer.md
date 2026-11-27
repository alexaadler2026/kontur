# 053 · UI-4b: мобильное меню (drawer) на нативном `<dialog>`

Date: 2026-11-27 · Task: план 051, шаг UI-4b · PR: — · Commits: feat(ui): add k-sidenav-drawer on a native modal dialog

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
`<k-sidenav-drawer [(open)]="menuOpen" ariaLabel="Menü">` — выезжающая слева панель для
мобильного меню. Внутрь кладётся `<k-sidenav>`, внизу слот `[kDrawerFooter]` для
переключателей языка и темы. Построено на нативном `<dialog>` и `showModal()`, без
`@angular/cdk`. Кнопка-«бургер», которая открывает меню, принадлежит приложению (шаг 8a-4).

Поведение (требования владельца):

- фокус при открытии — на кнопку «Schließen» (текст из `KonturIntl.closeLabel`);
- закрывают: кнопка, Escape, клик по затемнению (`::backdrop`), клик по пункту меню;
- **любое** закрытие ставит `open = false`; после Escape меню открывается снова;
- после закрытия фокус возвращается на кнопку, которая открыла меню;
- ширина 232px, но не больше `calc(100vw - 56px)`, чтобы на узком экране оставалась
  полоска затемнения, по которой можно ткнуть;
- страница под открытой панелью не прокручивается.

**Зачем это нужно (аналогия из жизни).**
Drawer как гардеробная стойка с занавеской: открыл, и всё остальное в комнате временно
«за стеклом» (нельзя трогать). Закрыть можно по-разному: кнопкой, жестом (Escape) или
просто отойдя (клик мимо). Но в журнале у входа всегда отмечается одно: «закрыто».

**Как это работает, шаг за шагом.**

1. `open` — это `model()`, двусторонний сигнал: приложение пишет `true`, drawer пишет
   `false`. Эффект (`effect`) следит за ним: `true` → `showModal()` и фокус на кнопку
   закрытия, `false` → `dialog.close()`.
2. **Одна точка синхронизации.** Все способы закрытия ведут к нативному событию `close`, в
   нём `open.set(false)`. Escape браузер обрабатывает сам (`cancel` → `close`), и
   рассинхрона нет: иначе после Escape `open` остался бы `true`, и повторное нажатие
   «открыть» ничего бы не делало.
3. **Клик по затемнению.** У диалога нет внутренних отступов, панель заполняет его целиком,
   поэтому клик, у которого `target` — сам `<dialog>`, может прийти только с
   `::backdrop`. Клик по `a[k-sidenav-item]` тоже закрывает меню.
4. **Прокрутка.** Модальный диалог не запрещает прокрутку страницы. Одна строка CSS
   `html:has(.k-sidenav-drawer[open]) { overflow: hidden; }` делает это без JavaScript.
5. **Стили** собраны из токенов: `--overlay-scrim`, `--bg-surface`,
   `--shadow-overlay-md`. В `components.css` drawer пока не описан, владелец дополнит его по
   этой реализации.
6. **Тесты.** В jsdom нет `showModal()`, поэтому unit-тесты (5 штук) подставляют замену
   (ставит `open`, шлёт `close`) и проверяют логику: синхронизацию, клик по пункту и по
   затемнению. Настоящее поведение проверяют 7 e2e-тестов в Chromium, а axe — открытую
   панель в светлой и тёмной теме.

**Что выяснилось по ходу (важно для собеседования).**

- **Ловушка фокуса у `showModal()` не жёсткая.** После последнего элемента Chromium отдаёт
  фокус интерфейсу браузера (адресной строке), а не первому элементу диалога. Страница под
  диалогом при этом неактивна (inert). Мой первый тест ждал «фокус всегда внутри» и упал.
  Правильное требование — «Tab никогда не попадает на страницу под панелью», так тест и
  переписан.
- **Chromium сам возвращает фокус** на элемент, который был в фокусе до `showModal()`, и
  делает это после события `close`. Поэтому мутация «убрать мой `opener.focus()`» тест не
  покраснила. Красным его сделала мутация, которая мешает браузеру запомнить кнопку: снять
  фокус до `showModal()`. Мой `focus()` оставлен как страховка для других движков и для
  jsdom.
- **Мутационная проверка:** `show()` вместо `showModal()`, без закрытия по клику, без
  блокировки прокрутки, жёсткая ширина → 6 из 7 e2e красные. Отдельная мутация фокуса →
  оба теста фокуса красные.

**Какие были альтернативы и почему отказались.**

- CDK Overlay (как в контракте дизайна). Отказались (решение владельца в плане 051): новая
  зависимость, а нативный `<dialog>` даёт модальность, inert и Escape бесплатно.
- Блокировка прокрутки через JavaScript (`document.body.style.overflow`). Отказались: CSS
  `:has()` проще, и его не надо не забыть «вернуть».
- Слушать `keydown.escape` самому. Отказались: браузер уже делает это через `cancel`, а
  второй обработчик даёт два пути закрытия и риск рассинхрона.

**Что может сломаться и как починить.**

- Симптом: после Escape кнопка «открыть» не работает → Причина: `open` не сброшен →
  проверить, что `(close)` на `<dialog>` вызывает `open.set(false)`.
- Симптом: клик по затемнению не закрывает → Причина: у диалога появился `padding`, или
  панель не заполняет его → вернуть `padding: 0` и `height: 100%` у панели.
- Симптом: страница прокручивается под меню → браузер без `:has()` (очень старый) →
  тогда нужен JS-вариант.

**Вопрос с собеседования по этой теме.**

- В: Чем `dialog.showModal()` отличается от `dialog.show()` для доступности?
- О: `showModal()` выводит диалог в верхний слой (top layer), делает остальную страницу
  inert (недоступной для мыши, клавиатуры и скринридеров), даёт `::backdrop` и закрытие
  по Escape. `show()` — просто видимый блок: страница под ним остаётся активной.

**Проверка вручную (PowerShell).**

```powershell
pnpm nx test ui                                                    # Tests 179 passed
$env:CI='true'; pnpm nx e2e ui-storybook-e2e --grep "drawer"        # 7 passed
pnpm nx storybook ui-storybook   # Components/SideNav → Drawer: открыть, Esc, снова открыть
```

## 🇬🇧 What and why (full)

**What was done.** `<k-sidenav-drawer [(open)] ariaLabel>`: a left drawer on a native
modal `<dialog>` (no CDK). Content: `<k-sidenav>` plus a `[kDrawerFooter]` slot. Focus on
open goes to the close button. The button, Escape, a backdrop click and an item click all
close it, and every close sets `open=false`. Focus returns to the opener. Width is
`min(232px, 100vw - 56px)`, and the page behind does not scroll.
**Why (real-life analogy).** A curtain over a wardrobe: while it is open the room is behind
glass; however you close it, the log at the door says "closed".
**How it works, step by step.** `open` is a `model()`; an effect calls `showModal()` and
focuses the close button, or calls `close()`. All closes funnel into the native `close` event,
which sets `open=false`, so there is one sync point and Escape cannot leave it stale. The panel
fills the padding-less dialog, so a click targeting `<dialog>` comes only from `::backdrop`.
`html:has(.k-sidenav-drawer[open]) { overflow: hidden }` locks scrolling. Styles come from
tokens. jsdom lacks `showModal()`: 5 unit tests use a stand-in for the logic, and 7 Chromium
e2e tests plus axe (open, light and dark) cover real behaviour.
**Findings.** The `showModal()` focus trap is not strict: after the last control Chromium moves
focus to the browser UI, while the page stays inert. The requirement is "Tab never reaches the
page", so the test asserts exactly that. Chromium also restores focus to the opener natively,
after the `close` event, so removing my `focus()` did not turn the test red. Blurring before
`showModal()` did. Mutations: 6/7 red (show(), no click close, no scroll lock, fixed width),
plus 2/2 red for focus.
**Alternatives considered and why rejected.** CDK Overlay (a new dependency, and native
dialog already gives modality, inert and Escape); a JS scroll lock (CSS `:has()` is simpler);
an own Escape handler (two close paths, risk of stale state).
**What can break and how to fix it.** Stale `open` after Escape: check `(close)`. Backdrop
click not closing: the dialog got padding. Page scrolls: a browser without `:has()`.
**Interview question on this topic.** Q: `showModal()` vs `show()` for accessibility? A:
`showModal()` uses the top layer, makes the rest inert, gives `::backdrop` and Escape;
`show()` leaves the page interactive.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Seitennavigation hat jetzt ein mobiles Menü: `k-sidenav-drawer`. Es nutzt das native
HTML-Element `<dialog>` mit `showModal()`, ohne zusätzliche Bibliothek. Beim Öffnen liegt der
Fokus auf „Schließen“. Man schließt das Menü mit dem Button, mit Escape, mit einem Klick auf den
dunklen Hintergrund oder auf einen Menüpunkt. Jedes Schließen setzt `open` auf `false`, deshalb
kann man das Menü danach wieder öffnen. Danach geht der Fokus zurück auf den Menü-Button. Die
Seite darunter scrollt nicht. Die Tests im echten Browser haben gezeigt: Der Fokus kann nach
dem letzten Element in die Browser-Leiste gehen, aber nie auf die Seite darunter.

### Fachwortschatz

| Deutsch                    | English         | Русский                  |
| -------------------------- | --------------- | ------------------------ |
| die Schublade (Drawer)     | drawer          | выезжающая панель        |
| der modale Dialog          | modal dialog    | модальное окно           |
| der Hintergrund (Backdrop) | backdrop        | затемнение под окном     |
| inaktiv (inert)            | inert           | неактивный (недоступный) |
| die Fokusrückgabe          | focus return    | возврат фокуса           |
| das Scrollen sperren       | scroll lock     | блокировка прокрутки     |
| die Zwei-Wege-Bindung      | two-way binding | двусторонняя привязка    |
