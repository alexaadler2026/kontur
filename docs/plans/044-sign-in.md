# План задачи 8: экран входа, хранилище сессии, guard

Одобрен 2026-11-23. Результат по roadmap: можно войти и выйти в браузере.
Три PR; журналы 044 (8-1), 045 (8-2), 046 (8-3).

## Решения владельца (2026-11-23)

1. Три PR: 8-1, 8-2, 8-3.
2. База для e2e — Testcontainers внутри `serve-e2e`.
3. Переключатель языка — директива `select[k-select]` в libs/ui (нативный `<select>`, класс
   `k-select` из Kontur), своя story и axe. Полный Select (UI-13) — к задаче 34.
4. Тексты временного выхода:

   | Ключ              | de                     | en                   | ru                   |
   | ----------------- | ---------------------- | -------------------- | -------------------- |
   | `auth.signedInAs` | Angemeldet als {email} | Signed in as {email} | Вы вошли как {email} |
   | `auth.signOut`    | Abmelden               | Sign out             | Выйти                |

5. Маршрут `/login`, `returnUrl` — только внутренний путь (начинается с `/`, не с `//`);
   пометка «сессия истекла» — в `state` навигации, не в URL.
6. Тост — только при неудачном выходе.
7. Язык в `localStorage` — чтение и запись в `try/catch` (в приватном режиме бросает).
   Тест: `localStorage` бросает → экран входа работает, язык по браузеру.
8. Пароль тестового пользователя e2e проходит правила 7a (15+ символов, не из списка
   частых паролей, без частей e-mail и названий продуктов).

## 8-1. Настоящая база для e2e

- `apps/signflow-api/src/e2e-server.ts` (собирается вместе с API, как `create-admin`):
  1. поднимает PostgreSQL через Testcontainers (образ `POSTGRES_IMAGE`) и применяет
     миграции `prisma migrate deploy`;
  2. читает `apps/signflow-e2e/src/support/e2e-user.json`, проверяет пароль
     `checkPassword` (не проходит → понятная ошибка, сервер не стартует) и создаёт
     пользователя с хэшем Argon2id;
  3. запускает собранный API (`main.js`) с этой базой на порту 4310 и останавливает
     контейнер, когда процесс завершается (плюс Ryuk из Testcontainers на случай
     `kill`).
- Без Docker — понятная ошибка, без молчаливой подмены базы.
- Тесты: unit (проверка учётки e2e), e2e на уровне API: `POST /session` → 204 + cookie,
  `GET /session` → e-mail. Сначала красный прогон (база-заглушка → вход невозможен).

## 8-2. `libs/shared/auth-client`

- `SessionApi` (адаптер от приложения: `get`, `create`, `delete`) — библиотека не знает
  про SignFlow.
- `SessionStore` (NgRx SignalStore, `@ngrx/signals` 22.0.1): `unknown | signedIn |
signedOut` и `user`; `load()` — один `GET` на все параллельные вызовы; `signIn()` =
  `POST` + `GET`; `signOut()` = `DELETE`.
- `authGuard` → `/login?returnUrl=…`; `guestGuard` уводит вошедшего с `/login`.
- `safeReturnUrl()` — только внутренний путь.
- Interceptor: 401 на любой запрос, кроме `/api/v1/session` → `signedOut` и `/login` с
  `returnUrl` и `state: { sessionExpired: true }`.

## 8-3. Экран входа, выход, язык

- Форма (Signal Forms, ADR-0021) по `Anmelden.md`: 401 / 429 (минуты вверх) / 503 /
  422 / нет сети; alert пересоздаётся при каждой неудаче; фокус на первое неверное поле;
  `loading`; desktop / mobile / тёмная тема.
- `select[k-select]` в libs/ui; выбор языка в `localStorage` (try/catch), при старте
  важнее языка браузера.
- Временный выход на главной: `auth.signedInAs`, `auth.signOut`; при неудаче — тост с
  ошибкой (`provideKonturToast()` в `app.config.ts`).
- Маршруты: `/login` (`guestGuard`), `/` (`authGuard`).
- e2e: вход → главная → выход; неверный пароль; глубокая ссылка → вход → назад; язык
  после перезагрузки; axe (desktop, mobile, тёмная тема).
