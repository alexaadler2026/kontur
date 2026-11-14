# План задачи 006: ADR-0004 + Checkbox

Одобрен 2026-11-14. Первоначальный план «006 — Checkbox, Radio, Switch» владелец разбил на три задачи: **006 — ADR-0004 + Checkbox**, 007 — Radio, 008 — Switch.

## Контекст

Checkbox — первый собственный элемент формы: значение хранит компонент. На нём закрепляется шаблон ControlValueAccessor (ADR-0004) для Radio, Switch, Select и DatePicker.

Источники:

- `docs/design/components/Checkbox.md`, `.html`, `.png`, `Checkbox-dark.png`;
- секция «Checkbox / Radio / Switch» в `components.css`, «Checkbox error» и блок «Choice controls: hint and error text (v3)»;
- `CheckboxProps` (v3) в `api-contracts.d.ts`.

## Ответы владельца на вопросы плана

1. **Ошибка Checkbox — текстом.** Дизайн обновлён до v3: `error?: string | null` и `hint?`, CSS-блок `k-choice-item`. Ошибка только цветом нарушала WCAG 1.4.1 и 3.3.1.
2. **Ручка Switch — токен** `switch-knob` (alias `text-on-brand`, tokens.json v3). Заодно галочки чекбокса стали маской цвета `text-on-brand`: белая галочка в тёмной теме давала 2.45:1.
3. **Разбить на три задачи** (см. выше).
4. **Forms API (вопрос по ходу работы):** CVA, как в контракте и CLAUDE.md, плюс тест с Signal Forms (`[formField]`) рядом с тестом Reactive Forms. В ADR-0004 записаны проверенные факты: Signal Forms стабильны (`@publicApi 22.0` в `@angular/forms` 22.2.6), CVA для них — режим обратной совместимости, experimental только `provideExperimentalWebMcpForms`.

## Коммиты

0. `docs(design): update Kontur snapshot to v3` — снапшот владельца как есть.
1. `feat(tokens): generate Kontur tokens v3 (switch-knob)` — генератор без изменений; golden-тест проходит.
2. `docs(adr): record form control pattern (ADR-0004)`
3. `refactor(ui): share the error icon between form controls` — `svg[k-error-icon]`.
4. `feat(ui): add k-checkbox` — тесты первыми: Reactive Forms, Signal Forms, `touched`, `disable()`, `indeterminate` как `model()`, hint/error.
5. `docs(ui): add Checkbox stories` — States, With hint, Error, Dark theme, Reactive form.
6. `test(ui-storybook): keyboard e2e for checkbox` — Tab, кольцо фокуса, Space, клик по подписи, ошибка после submit.
7. `docs(journal): add entry 006 checkbox`

## Вне задачи

- **ADR: forms API для приложений (Reactive Forms vs Signal Forms)** — до первого экрана SignFlow. Если выбор падёт на Signal Forms, к компонентам библиотеки добавятся `FormCheckboxControl` / `FormValueControl` без поломки API: errors, disabled и required будут передаваться автоматически.
- **007 — Radio, 008 — Switch.**
- **Checkbox-группа** (массив значений) — нет в контракте.
- **Сводка ошибок формы после submit** (GOV.UK error summary) — из 005.
- **Автоматическая проверка контраста галочки** (WCAG 1.4.11, non-text). axe проверяет только контраст текста. Значения контраста подтверждены владельцем в `tokens.json` v3 (7.8:1 / 7.4:1).

## Отклонения от плана при выполнении (2026-11-14)

| Что                                                                                              | Почему                                                                                                                                            |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Тест токенов: ожидание 26 → 27 тематических токенов + проверка alias `switch-knob`               | v3 намеренно добавил токен. Тест не был ошибочным, он устарел из-за изменения требований. Golden-тест против `tokens.css` v3 прошёл без изменений |
| ADR-0004: Signal Forms описаны как стабильные, не experimental                                   | Первоначальное утверждение «experimental» опровергнуто проверкой типов `@angular/forms` 22.2.6; решение принял владелец (вариант 1)               |
| Иконка ошибки вынесена в `svg[k-error-icon]` (отдельный refactor-коммит) + тест на SVG-namespace | Иконка нужна FormField, Checkbox и Radio; копировать её трижды — дублирование                                                                     |
| `choice.css` содержит и селекторы `.k-row-check`                                                 | Они стоят в той же секции эталона (общие галочки v3). По ADR-0003 секция переносится целиком; DataTable позже подключит этот же файл              |
| Host `k-checkbox` всегда имеет класс `k-choice-item`                                             | Одна разметка для всех случаев. Без подсказки и ошибки внутри только подпись, визуально как в макете                                              |
| `@angular/forms` добавлен в `peerDependencies`                                                   | Требует `@nx/dependency-checks`: библиотека теперь импортирует forms                                                                              |
| Story «Dark theme»                                                                               | axe проверяет контраст текста и в тёмной теме                                                                                                     |
