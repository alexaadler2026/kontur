# 043 · UI-2: KonturToast — всплывающие сообщения

Date: 2026-11-23 · Task: UI-2 (roadmap §7, plan `docs/plans/043-toast.md`) · PR: — · Commits: `0048097`…`bc3ec1c`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
В `libs/ui` появился сервис `KonturToast`. **Сервис** — класс, который Angular создаёт
один раз и выдаёт любому, кто попросит через `inject()`. Любой экран пишет одну строку:

```ts
inject(KonturToast).show('Erinnerung wurde gesendet.', { tone: 'success' });
```

— и в углу экрана появляется **тост**: короткое сообщение, которое само исчезает или
ждёт, пока его закроют. Он понадобится уже в задаче 8: «Сессия истекла», ошибки сети.

Подключение одно, при старте приложения: `provideKonturToast()` в списке провайдеров.

Ещё в этой задаче:

- в `KonturIntl` добавлено слово для озвучки действия: `actionLabel` (de «Aktion»,
  en «Action», ru «Действие»);
- `Toast.md` дополнен твоими решениями (отдельный коммит `docs(design)`).

**Зачем это нужно (аналогия из жизни).**
Объявление на вокзале. Табло (видимый тост) — для тех, кто смотрит. Громкоговоритель
(невидимая live-область) — для тех, кто не видит. Громкоговоритель висит на стене
заранее: если бы его приносили вместе с объявлением, первые слова никто бы не услышал.
И диктор говорит один раз — табло не повторяет его вслух.

**Как это работает, шаг за шагом.**

1. При старте `provideKonturToast()` создаёт компонент `<k-toast-region>` и кладёт его
   в конец `<body>`. Внутри две пустые **live-области** — элементы, изменения в которых
   скринридер (программа, читающая экран вслух) объявляет сам:
   - `role="status"` — вежливо, когда закончит фразу; для info и success;
   - `role="alert"` — сразу; для warning и error.

   Обе спрятаны с экрана классом «только для скринридера».

2. `show()` кладёт тост в очередь (сигнал со списком). На экране первые 3, остальные
   ждут, пока закроется один из видимых.
3. Когда тост появляется на экране, в нужную область уходит текст: заголовок +
   сообщение + «Aktion: Wiederholen», если есть действие. Без этого незрячий не узнал бы
   о кнопке.
4. **Повтор.** Скринридер объявляет только _изменение_. Если записать тот же текст ещё
   раз, ничего не изменится, и он промолчит. Поэтому область сначала очищается, а текст
   пишется через 100 мс (так же делает Angular CDK). Два сообщения за эти 100 мс
   объединяются, ни одно не теряется.
5. **У видимого тоста роли нет**, иначе текст прочитался бы дважды.
6. **Таймер** — только у info и success без действия: 5000 мс или `durationMs`. Он идёт
   с момента появления на экране, а не с вызова `show()`: тост из очереди не должен
   «истечь», пока его никто не видел. Пока на тосте курсор или фокус, таймер стоит;
   оставшееся время сохраняется (WCAG 2.2.1 — «достаточно времени»).
7. **Фокус** (место, куда идут нажатия клавиатуры). Тост его никогда не забирает. Если
   пользователь вошёл в тост клавишей Tab и закрыл его, фокус возвращается туда, откуда
   пришёл (компонент запоминает `relatedTarget` события `focusin`). Если того элемента
   уже нет — на `h1`, как у Alert.
8. **Расположение.** Внизу справа с отступом 16 px. При ширине меньше 960 px (единственный
   брейкпоинт Kontur) — сверху по центру. Пустая область не перехватывает клики
   (`pointer-events: none`).
9. **Без `provideKonturToast()`** `show()` пишет понятную ошибку в консоль, но не роняет
   приложение: «работает» важнее.

**Проверено.**

- Unit-тесты сначала красные (модулей нет), потом зелёные: ui 157 (из них Toast 27),
  signflow 30.
- 7 мутаций, каждая поймана своим тестом. Мутация — я нарочно ломаю код и смотрю, что
  тест краснеет:
  - область не очищается;
  - действие не попадает в озвучку;
  - warning уходит в status;
  - нет паузы;
  - таймер стартует в `show()`;
  - фокус не возвращается;
  - тост с действием исчезает сам.
- e2e в Chromium: клавиатура, озвучка, повтор, цвета из токенов, брейкпоинт, язык, axe
  по области. Мутации «роль у видимого тоста» и «нет очистки» ловятся.
- `CI=true nx affected -t lint test build e2e`: всё зелёное. Storybook e2e 44, SignFlow
  e2e 13.
- Руками: `pnpm nx run ui-storybook:storybook` → _Components → Toast → Playground_.
  Нажать «success»: тост исчезнет через 5 с, а если навести на него мышь — останется.
  Нажать «error»: тост останется. Tab → «Wiederholen» → Tab → «Schließen» → Enter:
  тост закрыт, фокус снова на кнопке «error». Сузить окно меньше 960 px — тосты сверху.

**Какие были альтернативы и почему отказались.**

- Роль на каждом тосте, как буквально в контракте. Отказались: `role="status"`,
  вставленный сразу с текстом, VoiceOver часто не объявляет.
- Два видимых контейнера с ролями. Отказались: стопка шла бы по тону, а не по времени
  (твой выбор — вариант A).
- `@angular/cdk` (Overlay, LiveAnnouncer). Отказались: CDK в проекте нет. Тосту не нужно
  позиционирование относительно элемента, хватает `position: fixed`. Решение по CDK
  примем на Dialog (UI-3).
- `<k-toast-region />` в шаблоне приложения. Отказались: его легко забыть, а область
  должна быть с самого старта.

**Что может сломаться и как починить.**

- Симптом: `show()` ничего не показывает, в консоли «add provideKonturToast()». →
  Причина: провайдер не подключён. → Что делать: добавить `provideKonturToast()` в
  `app.config.ts`.
- Симптом: тост под диалогом или шапкой. → Причина: `z-index: 1000` — временное
  значение, токена слоёв в Kontur нет. → Что делать: порядок слоёв решить в UI-3 (Dialog).
- Симптом: в тесте после падения «лишняя кнопка» в других файлах. → Причина: элемент в
  `<body>` не удалён. → Что делать: удалять в `afterEach`, как в `toast.spec.ts`.

**Вопрос с собеседования по этой теме.**

- В: Почему live-область должна существовать до сообщения и зачем её очищать?
- О: Скринридер следит за _изменениями_ уже известной ему области. Новая область вместе
  с текстом для него не изменение, а просто новый элемент, и он может промолчать. А
  одинаковый текст, записанный повторно, тоже не изменение. Поэтому область создают
  заранее, а перед каждым сообщением очищают и пишут текст с небольшой паузой.

## 🇬🇧 What and why (full)

**What was done.**
`KonturToast` is a service: `inject(KonturToast).show(message, options)`.
`provideKonturToast()` adds one `<k-toast-region>` to `<body>` at app start.
`KonturIntl.actionLabel` was added (Aktion / Action / Действие). `Toast.md` records the
owner's decisions.

**Why (real-life analogy).** A station announcement. The board is for the eyes, the
loudspeaker for the ears. The loudspeaker is mounted before the announcement, and it
speaks once: the board does not repeat it aloud.

**How it works, step by step.**

1. The region holds two visually hidden live regions that exist from the start and are
   empty: `role="status"` for info and success, `role="alert"` for warning and error.
2. The visible toasts have no role, so nothing is read twice. They are stacked in time
   order. At most 3 are visible and the rest wait.
3. When a toast appears, its text (title + message + "Aktion: <label>") goes to the
   region of its tone.
4. The region is cleared and written 100 ms later, so a repeat is a real DOM change and
   is announced again. Messages within those 100 ms are joined, so none is lost.
5. Only info and success without an action leave by themselves: after 5000 ms or
   `durationMs`, counted from when they appear. Hover and focus pause the timer
   (WCAG 2.2.1).
6. Every toast has a close button. The action runs and then the toast closes.
7. The focus never moves into a toast. Closing the toast you tabbed into returns the
   focus to where it came from (`relatedTarget` of `focusin`), or to the `h1`.
8. The stack is at the bottom right; below 960 px it is at the top. The empty region
   ignores pointer events.
9. Without the provider, `show()` logs an error and does not throw.

**Verification.**

- Unit tests: red first, then green (ui 157, 27 of them for Toast).
- Seven unit mutations are caught, and two in e2e.
- Storybook e2e covers keyboard, announcement, repeat, tokens, breakpoint, language and
  axe on the region.
- `nx affected -t lint test build e2e` is green.

**Alternatives considered and why rejected.**

- A role on each toast: unreliable announcement when the text is inserted with it.
- Visible role containers: grouped by tone instead of by time.
- Angular CDK: not installed, not needed for a fixed corner; decide at Dialog.
- A region in the app template: easy to forget, and it would not exist from the start.

**What can break and how to fix it.**

- The provider is missing: an error in the console; add `provideKonturToast()`.
- Layering: `z-index: 1000` is temporary (no token); decide at UI-3.
- Leaked test DOM: clean up in `afterEach`.

**Interview question on this topic.**
Q: Why must a live region exist before the message, and why clear it?
A: Screen readers announce changes to a region they already track. A region inserted
with its text, or the same text written again, is not such a change. So the region is
created in advance, then cleared and written after a short pause.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Bibliothek hat jetzt den Dienst `KonturToast` für kurze Meldungen in der Ecke des
Bildschirms. `provideKonturToast()` legt beim Start zwei unsichtbare Live-Regionen an,
eine für Status und eine für Warnungen und Fehler. Bildschirmleser lesen nur diese
Regionen vor. Der sichtbare Toast hat keine Rolle, damit nichts doppelt gelesen wird.
Der vorgelesene Text enthält Titel, Nachricht und „Aktion: …“, wenn es eine Schaltfläche
gibt. Vor jeder Meldung wird die Region geleert, so wird auch eine gleiche Meldung erneut
vorgelesen. Nur Info- und Erfolgsmeldungen ohne Aktion verschwinden nach 5 Sekunden. Mit
der Maus oder dem Fokus auf dem Toast hält der Timer an. Höchstens drei Toasts sind
sichtbar, die anderen warten. Die wichtigste Entscheidung: Die Rolle liegt auf der
Live-Region, nicht auf dem Toast.

### Fachwortschatz

| Deutsch                      | English                  | Русский                 |
| ---------------------------- | ------------------------ | ----------------------- |
| die Benachrichtigung (Toast) | toast notification       | всплывающее уведомление |
| die Live-Region              | live region              | live-область            |
| vorlesen                     | to announce / read aloud | озвучивать              |
| die Warteschlange            | queue                    | очередь                 |
| automatisch ausblenden       | to auto-dismiss          | исчезать само           |
| den Timer anhalten           | to pause the timer       | ставить таймер на паузу |
| den Fokus zurückgeben        | to return the focus      | вернуть фокус           |
| visuell verborgen            | visually hidden          | визуально скрытый       |
| die Ebene (z-index)          | layer (z-index)          | слой                    |
