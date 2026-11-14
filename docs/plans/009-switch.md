# План задачи 009: Switch (`k-switch`)

Одобрен 2026-11-14. Источники:

- `docs/design/components/Switch.md`, `Switch.html`, `Switch.png`, `Switch-dark.png`;
- контракт `SwitchProps { label }`;
- секция `.k-switch` в `choice.css` (006);
- токен `switch-knob` (v3).

## Решения

1. Нативный `<input type="checkbox" role="switch">` в разметке эталона. Фокус, Space и клик по подписи — от браузера. Enter не переключает: паттерн APG этого не требует.
2. CVA с boolean-значением (ADR-0004). Изменение уходит в форму сразу, на событие `change`.
3. API строго по контракту: только `label`. Без hint, error и indeterminate.
4. Код CVA не выносится в общий базовый класс. Две копии понятнее; при третьем boolean-контроле — вынести и записать в ADR-0004.
5. **Вопрос по disabled-подписи → ответ владельца: вариант 1.** Владелец добавил в дизайн v4.1 `.k-switch.is-disabled`. Заодно `.is-focus` теперь покрывает инпуты k-check, k-radio, k-switch и `.k-row-check`. Снапшот — отдельный коммит, правила перенесены дословно.

## Коммиты

0. `docs(design): disabled Switch label and is-focus preview class` — снапшот v4.1 владельца.
1. `feat(ui): add k-switch` — сначала красные тесты против заготовки с пустым шаблоном.
2. `docs(ui): add Switch stories`
3. `test(ui-storybook): keyboard e2e for switch`
4. `docs(journal): add entry 009 switch`

## Вне задачи

- Общий базовый класс boolean-CVA.
- Подпись слева или «Ein/Aus» внутри дорожки.
- ADR forms API приложений — до первого экрана SignFlow.

## Отклонения при выполнении

Нет.
