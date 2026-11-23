# План UI-1: k-spinner, k-progress, k-progress-ring (+ KonturIntl.locale)

Одобрен 2026-11-23 вместе с решениями к UI-2. Решения записаны в
`docs/design/components/Progress.md` и `Toast.md` (коммит `30ff9ea`).

## Решения владельца

1. **Процент — по языку** через `Intl.NumberFormat(KonturIntl.locale(), { style: 'percent' })`,
   не строкой вручную: de «68 %», en «68%», ru «68 %». Для этого `KonturIntl` получает
   сигнал `locale` (`de-DE` / `en-GB` / `ru-RU`).
2. **У полос и кольца есть имя.** В макете его нет (ошибка доступности, отмечена в
   `Progress.md` и README). Полоса: видимая подпись → `aria-labelledby`. Кольцо:
   `aria-label`.
3. **Один брейкпоинт — 960 px** (README дизайна). Для UI-1 не нужен, понадобится в UI-2.
4. **Сверка с волной 1:** расхождения нет. В roadmap колонка — «первая задача, которой
   нужен» (8), в `architecture-wave1.md` — все задачи (8, 16, 20). Я сначала прочитал
   неверно; roadmap не меняем.

## Что делаем

- `libs/ui/src/lib/progress/`:
  - `spinner.ts` — `<k-spinner label size>`: `role="status"`, `aria-label`, размер в px
    (по умолчанию 20);
  - `progress.ts` — `<k-progress [value] label tone>`: строка «подпись | процент (`k-num`)»,
    полоса 6 px, `role="progressbar"`, `aria-valuenow/min/max`, `aria-labelledby`.
    `value = null` — бесконечная полоса (`is-indeterminate`), без процента и без
    `aria-valuenow`. Значение ограничивается 0–100;
  - `progress-ring.ts` — `<k-progress-ring [value] label size showValue>`: SVG по макету
    (r = 20 при 48 px), `role="progressbar"`, `aria-label`, процент в центре при
    `showValue`.
- `KonturIntl.locale` + De/En/Ru; адаптеры Transloco в signflow и Storybook берут локаль
  активного языка из `languages.json` (в signflow — новая `localeOf` в `languages.ts`).
- Стили — классы `k-progress`, `k-spinner`, `k-ring` из `components.css`, только токены.
- Stories: состояния и тоны полосы, бесконечный режим, спиннер, кольцо, тёмная тема; id
  в списке axe-проверки `ui-storybook-e2e`.

## Тесты (сначала красные)

- роли, имена и `aria-value*`; бесконечный режим без `aria-valuenow`;
- ограничение 0–100 (−5 → 0, 140 → 100);
- процент на трёх языках, в том числе неразрывный пробел в de/ru;
- `KonturIntl.locale` у De/En/Ru и у адаптера signflow (смена языка во время работы);
- axe по новым stories.

## Коммиты

1. `docs(plans): ui-1 plan` + next-steps.
2. `feat(ui): add KonturIntl.locale` (+ адаптеры).
3. `feat(ui): add k-spinner, k-progress and k-progress-ring`.
4. `docs(journal): add entry 042 progress`.
