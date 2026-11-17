# 017 · ADR-0022: иконки через @lucide/angular

Date: 2026-11-17 · Task: ADR-0022 (волна 1, перед задачей 8) · [ADR-0022](../adr/0022-icons-lucide-angular.md) · Commits: 0668965, d6ed04e, 5844631, 5849f9d, (this entry)

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**

- **ADR-0022.** Иконки рисуем пакетом **`@lucide/angular`**: одна иконка — один standalone-компонент на теге `<svg>`.
- **`libs/ui` переведена на пакет.** Две иконки, которые раньше были скопированы руками, теперь из пакета:
  - треугольник у ошибки поля (`k-form-field`, `k-checkbox`, `k-radio-group`);
  - крестик у `k-tag`.
- **Документы рядом.**
  - В README дизайна вместо `lucide-angular` теперь `@lucide/angular`.
  - В ADR-0010 появился код ошибки блокировки входа `auth.throttled` (HTTP 429, заголовок `Retry-After`).
  - В Alert.md и Anmelden.md ключи текстов приведены к схеме `errors.<code>` из ADR-0008.

**Термины (одной фразой).**

- **Lucide** — открытый набор контурных иконок, в стиле которого нарисованы все макеты Kontur.
- **peerDependency** («зависимость-сосед») — пакет, который должен поставить сам потребитель библиотеки. Наша библиотека его использует, но не везёт свою копию.
- **Tree-shaking** («стряхивание дерева») — сборщик выбрасывает код, который никто не импортирует. Поэтому из ~2000 иконок в сборку попадают только используемые.
- **deprecated** — пакет помечен автором как устаревший: им больше не стоит пользоваться.
- **Минимальный возраст релиза** (minimum release age) — правило pnpm: не ставить версию пакета, опубликованную совсем недавно. Заражённые релизы обычно находят и удаляют в первые часы.

**Почему не `lucide-angular`, хотя он был назван в README дизайна.** Проверил на npm:

- `lucide-angular` помечен deprecated — автор сам пишет «используйте @lucide/angular»;
- он объявляет поддержку Angular только до 21, а у нас 22.

**Аналогия.** Раньше мы перерисовывали значки от руки с образца. Теперь берём штамп у того же производителя: значок всегда точно как в образце, и в коробку кладём только нужные штампы.

**Как это работает.**

1. В шаблоне: `<svg lucideTriangleAlert size="14"></svg>`. Это обычный `<svg>`, поэтому CSS Kontur (`.k-alert > .k-ico` и т. п.) применяется 1:1.
2. В компоненте: `imports: [LucideTriangleAlert]`. Опечатка в имени — ошибка компиляции, а не пустое место на экране.
3. Без `title` пакет сам ставит `aria-hidden="true"`: иконка декоративная, смысл несёт текст рядом.
4. Размер и класс — как в макете. У этих двух иконок в макетах нет класса `k-ico`, только размер 14 и 12, поэтому класс мы не добавляем.

**Защита от свежих релизов.**

- Одобренная версия `~1.74.0` вышла в день решения. pnpm заблокировал её правилом минимального возраста и **сам** дописал в `pnpm-workspace.yaml` исключение для неё.
- Это исключение я убрал и взял `~1.73.0` (ей 3 дня). Обход правила безопасности не должен попадать в репозиторий незаметно.

**Почему у рефакторинга нет красного теста.**

- **Рефакторинг** — изменение устройства без изменения поведения. Красный тест доказывает, что новое поведение появилось. А нового поведения нет, значит, честного красного теста быть не может.
- Тест вида «иконка нарисована компонентом Lucide (по его классу)» проверял бы внутреннее устройство, а не то, что видит человек. Такой тест мешает следующему рефакторингу и ничего не защищает.
- **Защита здесь — одинаковый результат до и после:**
  - до: unit 78, e2e 32 (включая axe) — зелёные;
  - после: unit 79, e2e 32 — зелёные.
- Новые тесты проверяют поведение со стороны потребителя: `aria-hidden`, размер и класс как в макете, отрисовка в пространстве имён SVG. Они зелёные и до замены, и после — в этом их смысл.
- **Почему удалён `error-icon.spec`.** Он проверял внутренний компонент `ErrorIconComponent` («ровно 2 пути»). Компонент удалён вместе с тестом, а требование «декоративная SVG, рисуется в пространстве имён SVG» перенесено в тест `k-form-field`.

**Что заметно изменилось.**

- Треугольник ошибки поля теперь в новой форме Lucide (`triangle-alert`), как в макете Alert. В макете TextField пока старая форма. Это решение владельца.

**Что может сломаться.**

- **Обновление Lucide перерисует иконку.** Обновляемся осознанно и смотрим Storybook.
- **Потребитель библиотеки не поставил `@lucide/angular`.** pnpm/npm предупредит о недостающей peerDependency.
- **Иконку выбирают по строке из данных.** Тогда нужен динамический вариант `[lucideIcon]` + `provideLucideIcons()`. Он записан в ADR как запасной.

**Вопрос с собеседования.**

- **В:** Как сделать иконки в библиотеке компонентов, чтобы они не раздували сборку и были доступны?
- **О:**
  - Каждая иконка — отдельный импортируемый standalone-компонент. Сборщик берёт только используемые, а имена проверяет компилятор.
  - Иконка — это сама `<svg>`, без обёртки, поэтому стили дизайн-системы применяются напрямую.
  - Декоративные иконки скрыты от читалки (`aria-hidden`), смысл несёт текст.
  - У кнопки только с иконкой имя задаётся `aria-label` самой кнопки.
  - Значение не передаётся одним цветом: у разных тонов разная форма иконки.
  - Пакет — peerDependency, чтобы у потребителя не оказалось двух копий.

## 🇬🇧 What and why (full)

**What was done.**

- ADR-0022: icons via `@lucide/angular`, one standalone component per icon on the native `<svg>`.
- `libs/ui` now uses it: the field error triangle and the Tag "x".
- Around it:
  - design README names `@lucide/angular`;
  - ADR-0010 got the throttling code `auth.throttled` (429 + `Retry-After`, minutes rounded up);
  - Alert.md and Anmelden.md keys follow `errors.<code>`.

**Why not `lucide-angular`.** It is deprecated by its authors and declares Angular ≤ 21 only.

**Analogy.** We stopped redrawing badges by hand and use the manufacturer's stamps: always identical to the original, and only the stamps we need go into the box.

**How it works.**

- `<svg lucideTriangleAlert size="14">` plus `imports: [LucideTriangleAlert]`.
- The element stays an `<svg>`, so the Kontur CSS applies 1:1.
- A misspelled icon does not compile.
- Without a `title` the icon is `aria-hidden`.

**Supply-chain guard.**

- 1.74.0 was blocked by pnpm's minimum release age, and pnpm silently added an exclusion.
- I removed the exclusion and took `~1.73.0`.

**Why the refactoring has no red test.**

- A red test proves new behaviour, and a refactoring adds none.
- A test "rendered by the Lucide component" would test internals.
- The safety net is the same results before and after: unit 78 → 79, e2e 32 → 32, axe included.
- New consumer-level tests (aria-hidden, size and class as in the mockup, SVG namespace) are green before and after on purpose.
- `error-icon.spec` tested the removed internal component; its requirement moved to the `k-form-field` test.

**Visible change.** The field error triangle uses the current Lucide shape (as in the Alert mockup).

**What can break.**

- A Lucide update redraws a glyph: update deliberately and check Storybook.
- A consumer misses the peer dependency: the package manager warns.

**Interview question.**

- **Q:** How do you ship icons in a component library without bloating bundles and with good accessibility?
- **A:**
  - One importable standalone component per icon: tree-shaken, names checked at compile time.
  - The icon is the `<svg>` itself, so design-system CSS applies directly.
  - Decorative icons are `aria-hidden`; icon-only buttons are named by their own `aria-label`.
  - Meaning is never colour alone.
  - The package is a peer dependency, so the consumer never gets two copies.

## 🇩🇪 Kurzfassung (Niveau B1)

Icons kommen jetzt aus dem Paket `@lucide/angular`. Jedes Icon ist eine eigene Komponente auf dem `<svg>`-Element. Deshalb landen nur die benutzten Icons im Bundle, und ein falscher Name fällt schon beim Kompilieren auf. Das alte Paket `lucide-angular` ist veraltet und unterstützt Angular 22 nicht. Dekorative Icons sind für Screenreader verborgen, der Text trägt die Bedeutung. Die neueste Version war zu neu für unsere Sicherheitsregel, deshalb nutzen wir Version 1.73. Beim Refactoring gibt es keinen roten Test, weil sich das Verhalten nicht ändert. Alle Tests waren vorher und nachher grün.

### Fachwortschatz

| Deutsch                    | English               | Русский                           |
| -------------------------- | --------------------- | --------------------------------- |
| das Symbol (Icon)          | icon                  | иконка                            |
| das Paket                  | package               | пакет                             |
| veraltet                   | deprecated            | устаревший                        |
| die Peer-Abhängigkeit      | peer dependency       | зависимость-сосед                 |
| das Tree-Shaking           | tree-shaking          | выбрасывание неиспользуемого кода |
| dekorativ                  | decorative            | декоративный                      |
| die Lieferkettensicherheit | supply-chain security | безопасность цепочки поставок     |
| das Refactoring            | refactoring           | рефакторинг                       |
| das Sicherheitsnetz        | safety net            | страховка                         |
