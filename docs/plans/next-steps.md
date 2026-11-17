# Состояние работы и следующие шаги

Снимок на **2026-11-17**, после UI-17. Этот файл нужен, чтобы продолжить без
старой переписки. Порядок задач задаёт [`roadmap.md`](roadmap.md); здесь — только где мы
остановились.

## 1. Что сделано последним

| Что                                                                                                                                                               | Где                                                                                                                                                             | Журнал                                              |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- |
| ADR-0021 — формы на Signal Forms; прототип «Forms/Sign-in» в Storybook (правило показа ошибок, ошибки сервера из Problem Details, общая ошибка формы)             | [`docs/adr/0021-forms-signal-forms.md`](../adr/0021-forms-signal-forms.md), `apps/ui-storybook/src/forms-prototype/`, `apps/ui-storybook-e2e/src/forms.spec.ts` | [015](../journal/015-forms-signal-forms.md)         |
| Перенос волны 3 (ADR 0023–0028, план, объяснения, термины, вопросы юристу 33–38) и сводный roadmap; сверка roadmap с волной 1 и исправления по решениям владельца | [`architecture-wave3.md`](architecture-wave3.md), [`roadmap.md`](roadmap.md), `docs/architecture/wave3-explanations.md`                                         | [016](../journal/016-architecture-wave3-roadmap.md) |
| Kontur v4.4 в `docs/design` (Alert, экраны входа Anmelden); ключи ошибок в дизайне приведены к `errors.<code>`                                                    | `docs/design/components/Alert.md`, `docs/design/screens/signflow/Anmelden.md`                                                                                   | —                                                   |
| ADR-0010: код блокировки входа `auth.throttled` (429, `Retry-After` в секундах → минуты вверх), один ключ `errors.auth.throttled` без заголовка                   | [`docs/adr/0010-authentication.md`](../adr/0010-authentication.md)                                                                                              | —                                                   |
| ADR-0022 — иконки через `@lucide/angular ~1.73.0`; иконки `libs/ui` переведены на пакет; форма иконки — по Lucide, пути в макетах иллюстративные                  | [`docs/adr/0022-icons-lucide-angular.md`](../adr/0022-icons-lucide-angular.md), `libs/ui/package.json` (peerDependency)                                         | [017](../journal/017-icons-lucide.md)               |
| UI-17 — `k-alert` (InlineAlert + Banner), `KonturIntl.closeLabel`; Alert.md и контракт исправлены (`@for … track`, `closeLabel`, видимостью владеет хост)         | `libs/ui/src/lib/alert/`, `apps/ui-storybook-e2e/src/alert.spec.ts`, `docs/design/components/Alert.md`                                                          | [018](../journal/018-alert.md)                      |

Последний коммит работы: `docs(journal): add entry 018 alert` (после `536f95c feat(ui): add k-alert`).

**Проверки после UI-17 (локально):**

- `pnpm nx run-many -t lint test typecheck build build-storybook` — зелёные, 9 проектов;
- `CI=true pnpm nx run-many -t e2e` — 3 + 3 + 36 зелёные (включая axe);
- `pnpm nx format:check --all` — без замечаний;
- `node_modules/nx/dist/bin/nx.js` SHA-256 начинается с `2a1c0e6bcf0c3d72` (как ожидается).

## 2. Что не запушено

На момент паузы владелец запушил всё до `55e862d` включительно (CI для `55e862d` ещё шёл,
предыдущий прогон `a9532df` — success). Не запушены:

- `9a7e811` docs: single errors.auth.throttled key; icon shape from Lucide
- `4853202` docs(plans): record state before the pause
- `78b9df0` docs(design): re-create k-alert with @for keyed by counter; closeLabel
- `536f95c` feat(ui): add k-alert (InlineAlert + Banner) and KonturIntl.closeLabel
- коммит журнала 018 (`docs(journal): add entry 018 alert`)

После push: проверить CI —
`curl -s "https://api.github.com/repos/alexaadler2026/kontur/actions/runs?per_page=3"`.

## 3. Что дальше, по порядку

1. ~~UI-17 Alert~~ — сделано (журнал 018).
2. **Следующее:** в прототипе «Forms/Sign-in» общую ошибку перевести на `k-alert`
   (повтор через `@for (n of [submitCount()]; track n)`); тексты
   прототипа de/en/ru привести к дизайну (Alert.md, Anmelden.md): ключи
   `errors.auth.invalid_credentials`, `errors.validation.required`,
   `errors.validation.email`; en/ru формулировки — как в дизайне.
3. **Задача 1** — сквозной срез: `GET /api/v1/health` (Nest 12) → `openapi.json` → Orval →
   строка на экране SignFlow → тест на MSW → e2e. Проверки из ADR-0007: Nest 12 + Prisma +
   class-validator вместе; документ объявляет OpenAPI 3.1.0; статус `httpResource`.
   Описание — [`architecture-wave1.md`](architecture-wave1.md), порядок — `roadmap.md`.
4. Перед задачей 8 владелец обещал прислать спецификацию и макет экрана входа — они уже
   пришли в v4.4 (Anmelden). «Passwort vergessen?», Datenschutz и Impressum в задаче 8 не
   выводятся (раздел «Not active yet» в `Anmelden.md`).

## 4. Открытые вопросы

- **Отложено до UI-6 и UI-10 (решить до написания кода).** В контракте ещё есть директивы в
  camelCase: `kTooltip`, `kMenuTriggerFor`, `kCell`, `kTableToolbar`. Lint `libs/ui` требует
  kebab-case. У директив, чей вход называется так же, как селектор (`[kTooltip]="text"`),
  Angular Material и CDK пишут camelCase (`matTooltip`, `cdkMenuTriggerFor`). Правило для них
  выбираем, когда дойдём до UI-6 (DataTable: `kCell`, `kTableToolbar`) и UI-10 (DropdownMenu:
  `kMenuTriggerFor`). У Tooltip отдельной задачи в roadmap пока нет.
- Закрыты владельцем ранее:
  - селектор строки действий Alert — `k-alert-actions`, контракт поправлен (`c6dbe35`),
    правило lint не меняем;
  - ключи ошибок сервера — `errors.<code>` (ADR-0008), формулировки — по дизайну;
  - блокировка — один ключ `errors.auth.throttled` без заголовка;
  - клиентские правила делят ключ с сервером (`errors.validation.*`, ADR-0021);
  - форма иконки — по Lucide, макеты не перерисовываем.
- Входящих материалов, которые ещё не перенесены, нет: архивы волн 2 и 3 и roadmap
  перенесены и удалены из корня.

## 5. Напоминания о правилах (из CLAUDE.md и решений владельца)

- План — для всего, что трогает больше 2 файлов; ждать одобрения.
- Red first для unit-тестов; для e2e — красный прогон или записанная мутация. У чистого
  рефакторинга красного теста нет: защита — одинаковые зелёные прогоны до и после.
- e2e локально только с `CI=true`.
- Не пушить; владелец пушит сам. Каждая задача — запись в `docs/journal/`.
- Если `nx.js` пропадёт во время прогона — остановиться и сообщить; восстановление
  `pnpm install --frozen-lockfile --force`.
- Не обходить правило минимального возраста пакетов pnpm (`minimumReleaseAgeExclude` не
  добавлять).
