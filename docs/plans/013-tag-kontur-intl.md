# План задачи 013: KonturIntl и Tag (+ size у AvatarStack)

Одобрен 2026-11-15 (вторая половина плана Badge/Tag/Avatar).

## Решения (с ответами владельца)

1. **Фокус крестика.** `.k-tag-x` включён в общее правило фокуса (дизайн v4.2). Правило перенесено ещё в 012.
2. **Имя крестика** — `aria-labelledby` = «сама кнопка + текст тега»: «Entfernen NDA». Записано в Tag.md.
3. **Фокус после удаления** переводит тот, кто использует тег. Образец — в story «Filter bar».
4. **`AvatarStackProps.size`** — владелец добавил в контракт. Реализовано отдельным коммитом `feat(ui)`, есть story со стеком sm.

## Коммиты

1. `docs(design): avatar stack size`
2. `feat(ui): add size to k-avatar-stack`
3. `test(tokens): check contrast of the Tag remove icon on hover`
4. `feat(ui): add KonturIntl and k-tag`
5. `docs(journal): add entry 013 tag kontur-intl` — этот план и журнал.

## Отклонения при выполнении

- **В `KonturIntl` пока только `removeLabel`.** `rangeLabel` и `matchCount` появятся вместе с Pagination: писать то, что никто не использует, не стоит.
- **Новая пара контраста** `error` на `bg-subtle`, критерий 1.4.11: светлая тема 5.86:1, тёмная 5.23:1. Обе выше минимума 3:1.
- **Адаптер `TranslocoKonturIntl`** подключён глобально в Storybook. Поэтому stories библиотеки показывают слово действия на языке тулбара. Значение по умолчанию (`KonturIntlDe` без провайдера) проверяется в unit-тестах.
- **Вспомогательная функция `colorToken`** (значение цветового токена, вычисленное браузером) переехала из `badge-avatar.spec.ts` в `support/story.ts`, потому что теперь она нужна двум файлам. Ожидания тестов не менялись.
