# 046 · Задача 8-3: экран входа, выход, язык

Date: 2026-11-24 · Task: 8-3 (plan `docs/plans/044-sign-in.md`) · PR: — · Commits: `473b3ef`…

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

1. **Нативный select в libs/ui:** `<k-select-wrap>` + `select[k-select]` (решение владельца).
2. **Язык:** переключатель на экране входа; выбор сохраняется в `localStorage` и при
   следующем запуске важнее языка браузера.
3. **Экран входа** `/login` по `Anmelden.md`: широкий экран, узкий (390 px) и тёмная тема.
4. **Подключение `auth-client` к SignFlow:**
   - адаптер над сгенерированным `SessionService`;
   - маршруты с guard'ами: `/` только для вошедших, `/login` — для остальных;
   - interceptor 401.
5. **Временный выход на главной:** «Angemeldet als …» и «Abmelden». Тост показывается
   только при неудаче.
6. **e2e:** вход → главная → выход; неверный пароль; глубокая ссылка; язык после
   перезагрузки; axe для широкого экрана, мобильного и тёмной темы.

**Зачем это нужно (аналогия из жизни).** Это проходная из журнала 045, теперь с дверью и
окошком. Окошко (экран входа) говорит на языке посетителя и запоминает язык. Ошибку оно
называет так, чтобы человек понял, что делать, но не узнал лишнего: «e-mail или пароль
неверны», без уточнения, что именно.

**Как это работает, шаг за шагом.**

1. **Signal Forms** (`@angular/forms/signals`, ADR-0021) — формы на сигналах. Модель
   `{email, password}` — это сигнал, правила `required` и `email` описаны рядом с формой.
2. **Когда видна ошибка поля.** Её показывают после ухода из поля или после попытки
   отправить (`errorDisplay`). Пока человек печатает, новая ошибка не появляется, а
   исправленная исчезает сразу. При отправке с ошибками фокус уходит на первое неверное
   поле.
3. **Ответы сервера:**
   - 401 → одна ошибка над кнопкой, без отметки полей, чтобы не выдать, что было неверно;
   - 429 → предупреждение с минутами из заголовка `Retry-After`, округление вверх: 61 с —
     это «2 минуты», никогда не «1»;
   - 503 и «нет сети» → общие тексты ADR-0008;
   - 422 → ошибка уходит в то поле, на которое указывает `pointer`.
4. **Повторная озвучка.** В начале каждой отправки сообщение сбрасывается, а запрос
   всегда асинхронный. Поэтому каждая неудача вставляет **новый** элемент alert, и
   скринридер снова читает тот же текст. Сначала я сделал ещё и ключ `@for`, но мутация
   показала, что он лишний, и я его убрал.
5. **Язык.** `readSavedLang` и `saveLang` обёрнуты в `try/catch`. В приватном режиме даже
   _чтение_ `window.localStorage` бросает исключение, поэтому хранилище передаётся
   функцией-геттером, и обращение происходит внутри `try`. Чужое значение (`fr`)
   игнорируется. У каждого варианта в списке есть `lang`, и скринридер читает «Русский»
   русским голосом (WCAG 3.1.2).
6. **Touch-размеры** включаются ниже единственного брейкпоинта 960 px: `matchMedia`
   переключает `size` полей и кнопки, CSS убирает карточку.
7. **«Сессия истекла».** Пометка приходит в `state` навигации от interceptor'а. Экран
   показывает info-alert над формой, не live: он есть с момента открытия страницы, а не
   появляется в ответ на действие.

**Найдено по дороге.**

- **`size="sm"` у нативного select.** `size` — это ещё и стандартный атрибут `<select>`
  (сколько строк видно). Статический `size="sm"` оставался в DOM, и select переставал
  быть combobox. Тест библиотеки этого не видел, потому что передавал `[size]`
  привязкой. Нашёл тест переключателя языка. Исправление: директива снимает атрибут.
  Тест на статический `size` добавлен (сначала красный).
- **Скрытые live-области Toast.** У них тоже есть роли `alert` и `status`. Широкий
  локатор `getByRole('alert')` в e2e находил два элемента. Toast при этом работает
  правильно; локаторы теперь ищут внутри формы или `main`.
- **401 в консоли.** Chrome пишет каждый ответ 4xx как «Failed to load resource». 401 от
  `GET /session` — нормальный ответ «никто не вошёл», поэтому e2e пропускает ровно эту
  строку и ничего больше.

**Измерь, прежде чем чинить.** Два раза за день правдоподобное объяснение оказалось
неверным.

1. _Storybook._ Прогон axe упал с «static-storybook did not become ready within 2m». В логе
   после `build-storybook` снова шёл вывод webpack, и я решил, что `file-server`
   собирает Storybook второй раз внутри окна готовности. Убрал у него `buildTarget`.
   Замер в одинаковых условиях:

   | Конфигурация   | Итог    | axe     | Весь прогон |
   | -------------- | ------- | ------- | ----------- |
   | старая         | зелёный | 1,8 мин | 150 с       |
   | «исправленная» | зелёный | 1,8 мин | 148 с       |

   Разницы нет. В обоих логах стоит `build-storybook [local cache]`: вывод webpack — это
   **повтор из кэша**. Nx сохраняет вывод задачи и показывает его снова; второй сборки
   нет. Правку откатил, `fix(ci)` не понадобился. Вероятная причина падения — нехватка
   памяти: вскоре система сама остановила мой следующий прогон по этой причине.

2. _Тёмная тема._ Axe один раз нашёл недостаточный контраст, при повторе — нет. Гипотеза:
   переход цвета кнопки 120 мс, и axe замерил посередине. Проверка: временно растянул
   переход до 3 с. Тест прошёл и без ожидания, значит, гипотеза неверна. Затем 35 из 35
   прогонов без повторов прошли. Чинить вслепую не стал. Теперь axe в e2e пишет элемент
   и измеренный контраст, так что следующее падение будет разбираемым. Это открытая
   нестабильность, записанная в `next-steps.md`.

**Урок.** Лог показывает, _что напечатано_, а не _что выполнялось_. Гипотезу проверяет
замер «до/после» в одинаковых условиях. Если замер не подтверждает правку, она уходит,
даже если объяснение звучало убедительно. При тайм-аутах сначала проверить память машины.

**Проверено.**

- Unit: libs/ui 167; SignFlow 70: страница входа 18, главная 3, маршруты 4, язык 9,
  адаптер 3. Сначала красные прогоны.
- **Мутации пойманы:**
  - select в libs/ui: 6;
  - приложение: 11 — минуты вниз, `returnUrl` без проверки, нет фокуса, нет пометки
    «сессия истекла», alert не live, сообщение не сбрасывается, нет тоста, `DELETE` как
    `GET`, выбор не сохраняется, сохранённый язык игнорируется;
  - e2e: выбор языка не сохраняется → после перезагрузки `lang="de"` вместо `en`.
- e2e SignFlow: 21 тест за 49 с. Полная проверка `nx affected` — в отчёте к коммиту.

**Как проверить руками (PowerShell).**

```powershell
# Docker Desktop запущен; другие dev-серверы остановлены (они конкурируют за память)
$env:CI = 'true'; pnpm nx run signflow-e2e:e2e; $LASTEXITCODE
```

Ожидается `21 passed` и `0`. Глазами: `pnpm nx serve signflow-api` и
`pnpm nx serve signflow`, затем открыть `http://localhost:4200/` — откроется `/login`.

**Какие были альтернативы и почему отказались.**

- Полный combobox Select (UI-13) для языка. Решение владельца: это задача 34, сейчас
  хватает нативного select.
- Пометка «сессия истекла» в URL — решение владельца: в `state`.
- Ключ `@for` для пересоздания alert. Оказался лишним, это доказала мутация.
- Сразу вынести `form-errors` в общую библиотеку. Пока ею пользуется одна форма, а когда
  понадобится Belegscan, перенесу (правило в коде и в `next-steps.md`).

**Что может сломаться и как починить.**

- Симптом: e2e «did not become ready within 2m» для `serve-e2e`. → Причина: Docker
  Desktop ещё стартует или не хватает памяти. → Что делать: проверить Docker и
  свободную память, повторить.
- Симптом: e2e `strict mode violation: getByRole('alert')`. → Причина: скрытые
  live-области Toast. → Что делать: искать внутри формы или `main`.
- Симптом: язык не запоминается. → Причина: приватный режим (так и задумано) или
  изменился ключ `signflow.lang`.

**Вопрос с собеседования по этой теме.**

- В: Почему экран входа на неверный пароль не подсвечивает поле «Пароль»?
- О: Подсветка выдала бы, что e-mail существует, и помогла бы перебором собирать адреса
  (user enumeration). Сервер отвечает одинаково для обоих случаев (ADR-0010), и интерфейс
  тоже не должен различать: одна ошибка формы над кнопкой. Ошибки полей остаются только
  для формата (пусто, не e-mail).

## 🇬🇧 What and why (full)

**What was done.**

- A native select in libs/ui.
- The language switch, saved in `localStorage`.
- The sign-in screen `/login` (wide, 390 px, dark).
- `auth-client` wired into SignFlow: adapter, guarded routes, 401 interceptor.
- A temporary sign-out on the start page, with a toast only on failure.
- e2e journeys and axe in three variants.

**Why (real-life analogy).** The gatehouse from entry 045 now has a door and a counter.
The counter speaks the visitor's language and remembers it. It reports an error so that
the person knows what to do, without learning more than they should.

**How it works, step by step.**

1. Signal Forms (ADR-0021): the model is a signal; the rules sit next to the form.
2. A field error shows after leaving the field or on submit; the focus goes to the first
   invalid field.
3. Server answers:
   - 401 → one form error, no field marked;
   - 429 → a warning, with minutes from `Retry-After` rounded up;
   - 503 and no connection → the shared texts;
   - 422 → the error goes to the field named by `pointer`.
4. Re-announcement: the message is cleared on every submit and the request is always
   asynchronous, so each failure inserts a new alert. A mutation proved that an extra
   `@for` key was redundant, so I removed it.
5. Language: every storage access is inside `try/catch`, and even reading
   `window.localStorage` happens inside the `try`.
6. Touch sizes apply below 960 px.
7. "Session expired" is an info alert, not live, taken from the navigation state.

**Found on the way.**

- A static `size="sm"` stayed on `<select>` as the native attribute and turned it into a
  list box; the directive now removes it.
- The Toast's hidden live regions also carry `alert` and `status` roles; e2e locators are
  now scoped to the form or `main`.
- Chrome logs the expected 401 of `GET /session`; e2e ignores exactly that line.

**Measure before fixing.**

- Storybook: a before/after measurement disproved the "second build" theory (150 s vs
  148 s, both green). The log was Nx replaying cached output. I reverted the change.
- Dark-theme contrast: the transition theory was disproved with a 3 s transition, and the
  failure did not come back in 35 runs. Not fixed blindly: axe messages now name the
  element and the measured ratio. Recorded as open.

**Verification.**

- Unit: ui 167, SignFlow 70; red first.
- Mutations caught: select 6, app 11, e2e 1.
- SignFlow e2e: 21 passed in 49 s.

**Alternatives considered and why rejected.**

- A full Select: task 34.
- The expiry mark in the URL: rejected by the owner.
- The `@for` key: redundant.
- A shared form-errors library: only when Belegscan needs it.

**What can break and how to fix it.**

- `serve-e2e` not ready → check Docker and memory.
- An alert strict-mode violation in e2e → scope the locator.
- The language is not remembered → private mode, or the key changed.

**Interview question on this topic.** Q: Why does a wrong password not mark the password
field? A: Marking it would reveal that the e-mail exists (user enumeration). The server
answers both cases the same way (ADR-0010), and so does the UI: one form error.

## 🇩🇪 Kurzfassung (Niveau B1)

SignFlow hat jetzt einen Anmeldebildschirm. Er funktioniert auf großen und kleinen
Bildschirmen und im dunklen Design. Fehler bei einem Feld erscheinen erst, wenn man das
Feld verlässt oder das Formular absendet. Bei einem falschen Passwort sagt die Seite nur
„E-Mail-Adresse oder Passwort ist falsch“, damit niemand erfährt, welche Adresse
existiert. Nach zu vielen Versuchen nennt sie die Wartezeit in Minuten, aufgerundet. Die
Sprache kann man oben rechts wählen; die Wahl bleibt nach dem Neuladen erhalten, im
privaten Modus nur für den Besuch. Auf der Startseite kann man sich vorläufig abmelden.
Zweimal hat eine Messung eine plausible Erklärung widerlegt; deshalb gilt: erst messen,
dann reparieren.

### Fachwortschatz

| Deutsch                    | English                    | Русский                 |
| -------------------------- | -------------------------- | ----------------------- |
| der Anmeldebildschirm      | sign-in screen             | экран входа             |
| die Feldfehlermeldung      | field error message        | ошибка поля             |
| die Kontenaufzählung       | user enumeration           | перебор учётных записей |
| die Wartezeit              | waiting time               | время ожидания          |
| der lokale Speicher        | local storage              | локальное хранилище     |
| die Sprachauswahl          | language switch            | переключатель языка     |
| die Bildschirmleserausgabe | screen reader announcement | озвучка скринридером    |
| die Messung                | measurement                | замер                   |
