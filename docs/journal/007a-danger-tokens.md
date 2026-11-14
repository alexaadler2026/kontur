# 007a · Danger-кнопка: hover и active токенами вместо filter (Kontur v4)

Date: 2026-11-14 · Task: 007a (без плана, ≤ 2 логических изменений) · PR: — · Commits: `ce718ad` (дизайн v4), `841aa0e` (код)

## 🇷🇺 Что и зачем (коротко)

**Что сделано.**

- Владелец дизайна выпустил Kontur v4: новые токены `error-hover` и `error-active`. В эталоне danger-кнопка при наведении больше не затемняется фильтром `filter: brightness(0.92)`, а берёт цвет из этих токенов. В `:active` появился ещё более насыщенный цвет.
- В `libs/ui`:
  - `tokens.css` перегенерирован;
  - `button.css` перенесён дословно из эталона;
  - добавлены две пары контраста;
  - добавлена story «Hover and active» в светлой и тёмной темах;
  - добавлен e2e-тест цвета фона.

**Зачем.**

- В задаче 007 расчёт показал, что фильтр работает правильно только в светлой теме. Там текст белый, и затемнение красного повышает контраст.
- В тёмной теме текст на кнопке тёмный (`#12161c`). Затемнение фона **понижало** контраст: 6.39 → 5.46.
- Фильтр «слеп» к теме: он всегда делает темнее. Токен знает тему, поэтому в тёмной теме `error-hover` **светлее** `error`, так же как давно сделано у `brand-hover` и `brand-active`.

Контраст `text-on-brand` после v4, проверяется тестом из 007:

| Тема  | `error` | `error-hover` | `error-active` |
| ----- | ------- | ------------- | -------------- |
| light | 6.57    | 8.20          | 10.29          |
| dark  | 6.39    | 7.92          | 9.82           |

**Как проверено.**

1. **Генератор токенов не потребовал правок кода.** Его тесты читают `tokens.json` v4 напрямую и сразу прошли. Устаревший `libs/ui/tokens.css` поймала проверка `tokens:check` («out of date»). После `tokens:generate` она зелёная.
2. **Тест числа токенов: 27 → 29.**
   - Это законная правка: изменилось требование (v4 добавил два токена).
   - По правилу из CLAUDE.md она сделана в том же коммите, что и само изменение, с причиной в сообщении коммита.
   - Тест стал строже: теперь он проверяет и значения новых токенов в обеих темах.
3. **Пары контраста.** Добавлены `text-on-brand` на `error-hover` и `error-active` (WCAG 1.4.3). Комментарий с ручным расчётом фильтра удалён: проверять больше нечего, оба состояния теперь проверяет тест.
4. **e2e (настоящий Chromium).**
   - Настоящее наведение мыши на «Löschen» даёт фон `#9a1d14` и `filter: none`.
   - Нажатие даёт `#7f1810`.
   - В тёмной теме story показывает `#f58f88` и `#f8aba5`.
   - axe проверяет контраст текста новой story в обеих темах.
5. **Мутация.** Вернул старую строку с `filter` — e2e упал (`Expected rgb(154, 29, 20)`, `Received rgb(180, 35, 24)`: фон не изменился). После восстановления CSS тест снова зелёный.

**Что может сломаться.**

- Симптом: в эталоне снова появится `filter` или `opacity` для состояния. → Что делать: проверить контраст в **обеих** темах, а лучше попросить у дизайна токен.
- Симптом: в приложении не подключён `tokens.css` v4. → Причина: `var(--error-hover)` не определена, фон hover пропадает. → Что делать: проверить `styles`, `tokens:check` в CI это ловит.

**Вопрос с собеседования.**

- В: Почему hover-состояние лучше задавать токеном, а не `filter: brightness()`?
- О: Фильтр не знает темы: он всегда затемняет. В тёмной теме, где текст на кнопке тёмный, затемнение фона снижает контраст. Токен задаётся для каждой темы отдельно, в тёмной он светлее базового, а тест контраста по токенам проверяет каждое состояние. Фильтр так проверить нельзя.

## 🇬🇧 What and why (short)

- **What was done.** Kontur v4 adds the `error-hover` and `error-active` tokens. The danger button now uses them for `:hover` and the new `:active` instead of `filter: brightness(0.92)`.
- **Why.** The filter always darkens. In the dark theme the text is dark (`#12161c`), so the filter lowered its contrast (6.39 → 5.46). Tokens are per theme: lighter in dark mode, like `brand-hover`. New ratios: light 8.20 / 10.29, dark 7.92 / 9.82.
- **Checks:**
  - the generator needed no change; `tokens:check` caught the stale CSS;
  - the token-count test changed 27 → 29 in the same commit, because the requirement changed, and it now also asserts the new values;
  - two contrast pairs added;
  - an e2e test with real hover and press, plus the dark-theme story;
  - mutating back to the filter fails the e2e.
- **Interview question.** Why tokens over `filter` for states? A filter is theme-blind and cannot be contrast-checked. A token is per theme and covered by the token contrast test.

## 🇩🇪 Kurzfassung (Niveau B1)

Mit Kontur v4 gibt es zwei neue Farbtokens, `error-hover` und `error-active`, für den Danger-Button. Früher wurde der Button beim Hover mit einem Filter abgedunkelt. Im dunklen Design ist der Text auf dem Button aber dunkel, deshalb hat der Filter den Kontrast verschlechtert. Ein Token kann pro Theme einen eigenen Wert haben: Im dunklen Design ist die Hover-Farbe heller. Der Kontrasttest prüft jetzt auch diese beiden Zustände. Ein E2E-Test zeigt mit echter Maus, dass Hover und Klick die richtigen Farben haben.

### Fachwortschatz

| Deutsch                           | English                 | Русский                        |
| --------------------------------- | ----------------------- | ------------------------------ |
| der Zustand (Hover, aktiv)        | state (hover, active)   | состояние (наведение, нажатие) |
| abdunkeln                         | to darken               | затемнять                      |
| der Filter                        | filter                  | фильтр                         |
| das dunkle Design                 | dark theme              | тёмная тема                    |
| die Anforderung hat sich geändert | the requirement changed | требование изменилось          |
| neu erzeugen                      | to regenerate           | перегенерировать               |
