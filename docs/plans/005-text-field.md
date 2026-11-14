# План задачи 005: TextField (FormField + Input)

Одобрен 2026-11-14 с уточнениями владельца (см. ниже).

## Контекст

TextField — первый элемент формы. Он закрепляет шаблон для Select, DatePicker и Checkbox: как связать подпись, подсказку и ошибку с полем для скринридера и как работать с типизированными реактивными формами.

Источники:

- `docs/design/components/TextField.md` / `.html` / `.png`;
- секция «Form field» и `.k-required` в `components.css`;
- `FormFieldProps` / `InputProps` в `api-contracts.d.ts`.

## Решения

1. **`k-input` — директива на нативном `<input>` / `<textarea>`.** Работает стандартный `DefaultValueAccessor`, своего CVA нет. Классы: `k-field`, `k-num` (numeric), `k-field--touch`, `is-invalid`; модификатора для md нет.
2. **`<k-form-field>` повторяет разметку макета 1:1.** Генерирует id, ставит `label[for]`, `aria-describedby`, `aria-invalid`, `aria-required`. Звёздочка `aria-hidden`. Иконка ошибки — inline SVG из макета.
3. **Ошибку передаёт потребитель** (`error: string | null`). Хелпер `control.errors → текст` появится после i18n.
4. **Стили — секция «Form field» целиком в `form-field.css`.** Секция общая с Select, поэтому дополнено ADR-0003: одна секция эталона — один файл.
5. **ESLint:** `directive-selector` переведён на kebab-case (`k-input`).
6. **Тесты:** добавлен `@testing-library/jest-dom` (матчеры доступного имени и описания).

## Уточнения владельца при одобрении

1. **Подсказка и ошибка показываются обе**, сначала подсказка, потом ошибка. В `aria-describedby` обе в том же порядке (паттерн GOV.UK). Story Error — с подсказкой.
2. **Живых объявлений (`role="alert"`) нет.** Сводка ошибок после submit с переводом фокуса — отдельная задача (см. «Вне задачи»).
3. **`k-input` без `k-form-field`** в dev-режиме бросает ошибку `k-input must be placed inside k-form-field`; на это есть тест.

## Коммиты

1. `test(ui): add jest-dom matchers and kebab-case directive selectors`
2. `feat(ui): add k-form-field and k-input` — тесты первыми, дополнение ADR-0003
3. `docs(ui): add TextField stories` — States, Error with hint, Numeric and touch, Textarea, Russian labels, Reactive form
4. `test(ui-storybook): run axe on every story from index.json` — плюс клик по подписи и кольцо фокуса по Tab
5. `docs(journal): add entry 005 text field`

## Вне задачи

- **Иконка внутри поля** (`k-field-wrap`). CSS перенесён, API нет: решение вместе с ADR про иконки.
- **`k-input` без видимой подписи** (поиск в тулбаре таблицы) — вместе с DataTable.
- **Тексты ошибок из `control.errors`** — после ADR по i18n.
- **Сводка ошибок формы после submit** с переводом фокуса на неё (паттерн GOV.UK error summary).

## Отклонения от плана при выполнении (2026-11-14)

| Что                                                                                           | Почему                                                                                                                                                                                                                                                                                           |
| --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Новый коммит `fix(ui-storybook): declare ui as implicit dependency…`                          | Guard в a11y-тесте показал: сервер отдаёт Storybook без story TextField. Story из `libs/ui` подключаются глобом, а не импортом, поэтому в графе Nx не было связи `ui-storybook → ui`, и новые story не меняли хэш `build-storybook`: Nx восстанавливал старый кэш. CI не затронут (там нет кэша) |
| Поле и директива связаны через `InjectionToken` `K_FORM_FIELD` (файл `form-field-context.ts`) | Компонент импортирует директиву для `contentChild`. Прямой `inject(FormFieldComponent)` в директиве дал бы циклический импорт                                                                                                                                                                    |
| Тест `required` ищет поле через `getByRole('textbox', { name })`, а не `getByLabelText`       | `getByLabelText` сравнивает текст подписи вместе со `*`. Тест проверяет доступное имя, то есть то, что слышит скринридер; `toHaveAccessibleName` остался                                                                                                                                         |
| Экспорт story `Error` переименован в `ErrorState` (имя в UI — «Error with hint»)              | `Error` перекрывал глобальный конструктор `Error` в модуле                                                                                                                                                                                                                                       |
| e2e Storybook разбит на `a11y`, `fonts`, `text-field` + `support/story.ts`                    | После перехода на `index.json` старый `button.spec.ts` смешивал бы три темы                                                                                                                                                                                                                      |
| `test-setup.ts` исключён в `tsconfig.lib.json`                                                | Файл настройки тестов не должен попадать в сборку библиотеки                                                                                                                                                                                                                                     |
