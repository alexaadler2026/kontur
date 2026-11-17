# Состояние работы и следующие шаги

Снимок на **2026-11-17**: работа поставлена на паузу. Этот файл нужен, чтобы продолжить без
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

Последний коммит работы: `9a7e811 docs: single errors.auth.throttled key; icon shape from Lucide`.

**Проверки на момент паузы (локально, рабочее дерево чистое):**

- `pnpm nx run-many -t lint test typecheck build build-storybook` — зелёные, 9 проектов;
- `CI=true pnpm nx run-many -t e2e` — 3 + 3 + 32 зелёные (включая axe);
- `pnpm nx format:check --all` — без замечаний;
- `node_modules/nx/dist/bin/nx.js` SHA-256 начинается с `2a1c0e6bcf0c3d72` (как ожидается).

## 2. Что не запушено

На момент паузы владелец запушил всё до `55e862d` включительно (CI для `55e862d` ещё шёл,
предыдущий прогон `a9532df` — success). Не запушены:

- `9a7e811` docs: single errors.auth.throttled key; icon shape from Lucide
- коммит с этим файлом (`docs(plans): record state before the pause`)

После push: проверить CI —
`curl -s "https://api.github.com/repos/alexaadler2026/kontur/actions/runs?per_page=3"`.

## 3. Что дальше, по порядку

1. **UI-17 Alert** (`k-alert`: InlineAlert + Banner) — отдельная задача компонента в `libs/ui`.
   **Сначала прислать владельцу план и дождаться одобрения.** Источник:
   `docs/design/components/Alert.md`, CSS в `components.css` (v4.4), контракт `AlertProps` в
   `api-contracts.d.ts`. Обязательно:
   - роль `alert` (error/warning) или `status` (info/success) **только при `live=true`**;
     при `live=false` роли нет;
   - повтор одинаковой ошибки озвучивается снова: хост создаёт элемент заново (`@if` по
     счётчику отправок), компонент повторы не отсекает; тест — две неудачные отправки
     подряд дают два объявления;
   - иконка по тону через `@lucide/angular`: info → `info`, success → `circle-check`,
     warning → `triangle-alert`, error → `circle-alert`; класс `k-ico`, `aria-hidden`;
   - закрытие: `k-icon-btn`, `aria-label` из KonturIntl, **новый ключ `close`**
     (de «Schließen», en «Close», ru «Закрыть»); после закрытия фокус не теряется;
   - story, unit-тесты (Angular Testing Library), axe в e2e, журнал 018.
2. **После UI-17:** в прототипе «Forms/Sign-in» общую ошибку перевести на `k-alert`; тексты
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

- **Нет.** Все вопросы последней сессии закрыты владельцем:
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
