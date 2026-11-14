# План задачи 008: Radio (`k-radio-group` + `k-radio`)

Одобрен 2026-11-14. Источники: `docs/design/components/Radio.md`, `Radio.html`, `Radio.png`, `Radio-dark.png`, контракт `RadioGroupProps` / `RadioProps<T>`; CSS уже перенесён в `choice.css` (006).

## Решения (с ответами владельца)

1. Настоящий `<input type="radio">` с общим `name`: стрелки, одна остановка по Tab, клик по подписи — от браузера.
2. ControlValueAccessor — на группе (ADR-0004). Группа рендерит `fieldset.k-choice-group` + `legend` + подсказку + ошибку + `k-choice-options`.
3. Связь группы и вариантов — через `InjectionToken` `K_RADIO_GROUP`. Значения сравниваются через `Object.is`.
4. `k-radio` вне группы — понятная ошибка.
5. Ошибка и подсказка — в `aria-describedby` на fieldset; `aria-invalid` на радиокнопках нет. `required`: `*` с `aria-hidden` в legend и **нативный `required`** на каждой радиокнопке. Владелец исправил контракт: `aria-required` на роли radio в ARIA 1.2 не поддерживается, отдельный коммит дизайна.
6. `setDisabledState` отключает все варианты, input `disabled` — один вариант.
7. **Touched — когда фокус покидает группу** (ответ владельца: да). Это отличие от встроенного `RadioControlValueAccessor`; записано в журнал с причиной.
8. **`name` обязателен** (ответ владельца: да). В README библиотеки сказано, что `name` должен быть уникальным на странице.

## Коммиты

0. `docs(design): use native required on Radio instead of aria-required` — снапшот владельца.
1. `feat(ui): add k-radio-group and k-radio`
2. `docs(ui): add Radio stories`
3. `test(ui-storybook): keyboard e2e for radio`
4. `docs(journal): add entry 008 radio` — этот план, журнал, README.

## Вне задачи

- `compareWith` для объектных значений.
- Горизонтальная раскладка вариантов — в эталоне её нет.
- ADR про forms API приложений (Reactive Forms или Signal Forms) — до первого экрана SignFlow.
- 009 Switch.

## Отклонения при выполнении

| Что                                                                         | Почему                                                                                                                                                                                                                       |
| --------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.k-required` перенесён из `form-field.css` в `kontur-base.css`             | Маркер теперь нужен и `k-form-field`, и `k-radio-group`. По ADR-0003 общие стили живут в base. Иначе группа без FormField на странице показывала бы `*` без стиля                                                            |
| Ошибка «k-radio вне группы» бросается в любом режиме, а не только в dev     | Без группы у радиокнопки нет `name` и значения — она не работает вообще. В продакшене вместо понятного сообщения было бы «Cannot read properties of null». `k-input` без поля работает, поэтому у него проверка только в dev |
| Коммит дизайна: «use native required…» вместо «Radio uses native required…» | commitlint (`subject-case`) отклонил тему с заглавной буквы                                                                                                                                                                  |
| Первый прогон e2e упал по таймауту webServer (240 с)                        | Сборка Storybook с нуля после изменений в `libs/ui` не уложилась в таймаут, и Playwright её прервал. Отдельная сборка прошла, повторный прогон: 13/13. Код не менялся                                                        |
