# 052 · UI-4a доработка: общий visually-hidden и цвет текста SideNav

Date: 2026-11-27 · Task: план 051, UI-4a (замечания владельца) · PR: — · Commits: fix(ui): shared k-visually-hidden; k-sidenav sets its text colour

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

1. В `kontur-base.css` появился общий класс `.k-visually-hidden`: текст для программ
   чтения с экрана, невидимый на экране (обычный приём «sr-only»: `position: absolute`,
   1×1 px, `clip`). Скрытая «, 3» в пункте SideNav теперь использует его вместо
   `font-size: 0`.
2. `.k-sidenav` теперь сам задаёт цвет текста `var(--text-primary)`. Заплатка в тёмной
   story убрана.

**Зачем это нужно (аналогия из жизни).**

- Общий класс как одна общая табличка «Служебный вход» вместо самодельной на каждой двери:
  одинаковое поведение везде, править в одном месте.
- Цвет: компонент, который сам красит стену (фон), должен сам выбрать и цвет букв на ней.
  Иначе буквы возьмут цвет из соседней комнаты.

**Как это работает, шаг за шагом.**

1. **Имя пункта со счётчиком.** Решение владельца — вариант B: стандартный класс важнее
   точного пробела. Chromium ставит пробел вокруг элемента с `position: absolute`, когда
   вычисляет доступное имя, поэтому в браузере имя «Entwürfe , 3». Скринридеры пробел
   перед запятой не произносят. jsdom этот пробел не добавляет, поэтому unit-тест
   по-прежнему видит «Entwürfe, 3», а e2e-тест в Chromium проверяет «Entwürfe , 3».
   Требование изменилось, поэтому e2e-тест поменян в том же коммите, причина записана в
   комментарии к тесту.
2. **Контраст: виноват компонент, не story.** У `.k-sidenav` есть фон `--bg-surface`, но
   не было цвета текста. Пункты, подпись и аватар красят себя сами, а содержимое слота
   brand («SignFlow») наследовало цвет снаружи. В тёмной story снаружи был светлый
   `text-primary` от `body`, то есть тёмный текст на тёмном фоне. Проверка: заплатку из
   story убрал, цвет добавил в компонент, и axe в тёмной story проходит без нарушений.
   Так же сделано у `.k-btn--secondary` с тем же фоном. В `components.css` этой строки
   нет, это расхождение стоит передать в дизайн.

**Какие были альтернативы и почему отказались.**

- Строчный вариант `.k-visually-hidden-inline` (без `position: absolute`). Отказались
  (решение владельца): второй нестандартный класс ради пробела, которого не слышно.
- `font-size: 0` (было). Отказались: нестандартный приём, редкие скринридеры могут
  пропускать такой текст.
- Оставить цвет в story. Отказались: тогда та же ошибка появится в любом месте, где
  SideNav стоит в поддереве с другой темой.

**Что может сломаться и как починить.**

- Симптом: e2e ищет «Entwürfe, 3» и не находит → Причина: это старое требование →
  проверять «Entwürfe , 3» в Chromium.
- Симптом: axe ругается на контраст в слоте SideNav → проверить, что у `.k-sidenav` есть
  `color` и что содержимое слота не задаёт свой цвет из другой темы.

**Вопрос с собеседования по этой теме.**

- В: Почему компонент, задающий `background`, должен задавать и `color`?
- О: Цвет текста наследуется от предков, а фон — нет. Если компонент красит только фон,
  контраст его содержимого зависит от того, куда его поставили. Пара фон+текст из одной
  темы гарантирует контраст в любом контексте, в том числе в поддереве с `data-theme`.

**Проверка вручную (PowerShell).**

```powershell
pnpm nx test ui                                                   # Tests 174 passed
$env:CI='true'; pnpm nx e2e ui-storybook-e2e --grep "SideNav|axe"   # все passed
```

## 🇬🇧 What and why (full)

**What was done.** A shared `.k-visually-hidden` (standard sr-only) in `kontur-base.css`
replaces `font-size: 0` in the SideNav count. `.k-sidenav` now sets
`color: var(--text-primary)`, and the dark story workaround is gone.
**Why (real-life analogy).** One shared "staff only" sign instead of a home-made one per
door. A component that paints the wall picks the letter colour too.
**How it works, step by step.** (1) Owner's decision B: Chromium adds a space around an
absolutely positioned box in the accessible name, so the browser name is "Entwürfe , 3".
Screen readers do not speak it. jsdom does not add it (the unit test still sees
"Entwürfe, 3"). The e2e test changed with the requirement, in this commit. (2) The
contrast failure was the component's: it set a background but no text colour, so slot
content inherited the light theme's colour from `body`. With the colour on `.k-sidenav`
and the story workaround removed, axe passes in the dark story.
**Alternatives considered and why rejected.** An inline-only hidden class (a second
non-standard class for an inaudible space); `font-size: 0` (non-standard, may be skipped);
fixing the colour in the story (the bug would return in any themed subtree).
**What can break and how to fix it.** e2e expecting "Entwürfe, 3" is the old requirement.
A contrast issue in a SideNav slot: check `color` on `.k-sidenav`.
**Interview question on this topic.** Q: Why set `color` together with `background`?
A: Colour is inherited, background is not. A background-only component's contrast depends
on where it is placed; a pair from one theme is safe in any context.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Bibliothek hat jetzt eine gemeinsame Klasse `.k-visually-hidden`. Sie versteckt Text auf
dem Bildschirm, aber Screenreader lesen ihn vor. Der Zähler in der Seitennavigation nutzt
diese Klasse. Chromium fügt dabei ein Leerzeichen ein: „Entwürfe , 3“. Man hört es nicht,
deshalb hat der Owner diese Lösung gewählt. Außerdem setzt `k-sidenav` jetzt selbst die
Textfarbe. Vorher hat der Logotext die Farbe von außen geerbt, und im dunklen Thema war der
Kontrast zu schwach. Jetzt besteht die Story den axe-Test ohne Sonderlösung.

### Fachwortschatz

| Deutsch             | English         | Русский           |
| ------------------- | --------------- | ----------------- |
| visuell versteckt   | visually hidden | визуально скрытый |
| die Vererbung (CSS) | inheritance     | наследование      |
| der Kontrast        | contrast        | контраст          |
| die Textfarbe       | text colour     | цвет текста       |
| der Hintergrund     | background      | фон               |
