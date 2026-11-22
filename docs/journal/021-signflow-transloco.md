# 021 · Task 1b: Transloco in SignFlow — start language from the browser, a failed load never blocks the app

Date: 2026-11-21 · Task: roadmap 1 (end-to-end slice), part 1b, [ADR-0006](../adr/0006-i18n-transloco.md) · PR: — · Commits: see `git log` after `9aff9f2`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.**
SignFlow теперь «говорит» на трёх языках через Transloco, как решено в ADR-0006:
немецкий по умолчанию, английский (en-GB) и русский. Переключателя языка пока нет.

- **Стартовый язык** берётся из языков браузера: первый язык из списка браузера, который
  есть у приложения. Браузер `ru-RU` → русский, `en-US` → наш `en`, `fr-FR` → немецкий.
- **Переводы** лежат в `apps/signflow/public/i18n/{de,en,ru}.json` и грузятся по HTTP,
  по одному маленькому файлу на язык. Список языков — в `languages.json` (тот же формат,
  что в Storybook; его же читает `tools/i18n-check`).
- **`<html lang>`** всегда совпадает с активным языком: по нему скринридер выбирает голос
  (WCAG 3.1.1).
- **Встроенные строки `libs/ui`** (`KonturIntl`: «Entfernen», «Schließen») идут из
  переводов SignFlow и переключаются вместе с приложением.
- **Если нет ключа** — ошибка в консоли и показ самого ключа (в разработке и тестах);
  в продакшене показывается немецкий текст.
- **Если файл перевода не загрузился** — приложение всё равно запускается (подробно ниже).

Ключей пока два — `kontur.removeLabel` и `kontur.closeLabel`; тексты взяты из готовых
`KonturIntlDe/En/Ru`, новых текстов на проверку нет. Ключи строки «API: ок…» появятся в
1c вместе с экраном.

Термины:

- **Transloco** — библиотека для Angular: грузит JSON-файлы переводов и меняет язык на лету.
- **Инициализатор приложения (`provideAppInitializer`)** — функция, которую Angular
  выполняет **до первой отрисовки**. Если она возвращает Promise, Angular ждёт его.
- **Сигнал (signal)** — значение, за изменением которого Angular следит сам;
  `transloco.activeLang()` — сигнал активного языка.
- **`effect()`** — код, который перезапускается, когда меняются прочитанные в нём сигналы.
  Здесь он пишет `document.documentElement.lang`.
- **`HttpTestingController`** — заглушка Angular для HTTP в тестах: запросы никуда не
  уходят, тест сам решает, что ответить (файл или 404).

**Зачем это нужно (аналогия из жизни).**
Магазин утром открывается, даже если не привезли вывеску на русском: продавец вешает
немецкую, а если не привезли и её — пишет название маркером. Главное — двери открыты.
Плохо было бы держать магазин закрытым, пока ждём вывеску, которая не приедет.

**Пример «работающее важнее красивого».**
Чтобы пользователь не видел ключей вместо текстов, перевод стартового языка грузится в
инициализаторе — до первой отрисовки. У этого красивого решения есть опасная сторона:
Angular **ждёт** инициализатор. Если файл перевода ответит 404 или сеть оборвётся, а
ошибка «пролетит» наружу, Promise никогда не выполнится успешно — и пользователь увидит
**белую страницу навсегда**. Для рекрутёра, открывшего демо, это «сайт не работает».

Поэтому правило (по требованию владельца): **что бы ни случилось, инициализатор
завершается, и приложение стартует**:

1. загрузить стартовый язык (например, `ru`) → получилось: работаем на нём;
2. не получилось → `console.error('[i18n] Could not load "ru" (i18n/ru.json)', причина)` и
   загрузить немецкий → получилось: работаем на немецком;
3. не получилось и это → ещё один `console.error`, приложение стартует **с ключами**.
   Некрасиво, но всё нажимается, а причина видна в консоли.
4. Зависший запрос тоже не держит страницу вечно: `timeout(10 000 мс)` превращает его в
   ошибку, и дальше — те же шаги.

Красивое (без мигания ключей) осталось, но не ценой работающего.

> **Обновление 2026-11-22 (после задачи 4, журнал [030](030-frontend-settings.md)).**
> Шаги 1 и 2 шли **друг за другом**, у каждого свои 10 с. Браузер на ru и зависший
> сервер давали 20 с белой страницы. Решение владельца (вариант C): если стартовый язык
> не de, его файл и `de.json` запрашиваются **одновременно**, с одним сроком
> `STARTUP_TIMEOUT_MS` (10 с):
>
> - пришёл стартовый язык → работаем на нём; немецкий догружается в фоне;
> - не пришёл, но пришёл de → немецкий и `console.error` с причиной;
> - ничего → ключи и `console.error`.
>
> Цена — лишний запрос `de.json` для en/ru, несколько КБ; в продакшене он нужен всё равно
> как запасной. Тест «переключение языка» теперь переключает на en: de больше не
> загружается по требованию, он уже есть после старта.
>
> **Находка при этом исправлении.** В production был включён `useFallbackTranslation`
> Transloco. Тогда `load('ru')` грузит ru.json и de.json **вместе** (`forkJoin`, мимо
> кэша). Если de.json не пришёл, падал и русский, и приложение стартовало с ключами. Да
> ещё de.json грузился второй раз. Unit-тесты этого не видели: они работают в dev-режиме.
> Поймал e2e на production-сборке. Теперь `useFallbackTranslation: false`, а «немецкий
> для пропущенного ключа в production» (ADR-0006) делает наш `ReportingMissingHandler`.
> Новые e2e: de.json 404 → приложение на русском; ключа нет в ru.json → немецкий текст.

**Как это работает, шаг за шагом (`apps/signflow/src/app/i18n/`).**

1. `languages.ts` импортирует `public/i18n/languages.json` (он попадает в сборку) и даёт
   `SOURCE_LANG`, `LANGS` и `startLang(navigator.languages)`.
2. `provide-i18n.ts` → `provideI18n()` собирает всё в одном месте:
   - `provideTransloco` с HTTP-загрузчиком `i18n/<lang>.json`, `failedRetries: 0`
     (повтор в ту же миллисекунду 404 не лечит);
   - свой обработчик пропущенного ключа (ошибка в консоль + ключ);
   - `NoLoadFallback`: Transloco сам умеет при ошибке загрузки тихо грузить другой язык.
     Мы это выключили, чтобы вся логика отказа была в одном видимом месте —
     `loadStartLanguage()`;
   - `provideTranslocoMessageformat()` — ICU-сообщения (`{count, plural, …}`);
   - `provideAppInitializer(loadStartLanguage)` — шаги 1–4 выше;
   - `effect()`, который пишет активный язык в `<html lang>`;
   - `provideKonturIntl(TranslocoKonturIntl)` — адаптер для `libs/ui` на `translateSignal`.
3. `app.config.ts` подключает `provideHttpClient()` (понадобится и в 1c) и `provideI18n()`.

**Тесты (красные первыми) и мутации.**

- `languages.spec.ts` (unit): список языков из конфига; `ru-RU,de-DE` → `ru`; `en-US` →
  `en`; `fr-FR,en-GB` → `en`; `fr-FR` и пустой список → `de`. Красный первым: нет модуля.
- `provide-i18n.spec.ts` (6 тестов, `HttpTestingController`): старт на языке браузера и
  `<html lang>`; `KonturIntl` на русском; переключение во время работы; пропущенный ключ;
  **404 на `ru.json` → приложение отрисовано, язык `de`, ошибка в консоли; 404 на все
  файлы → отрисовано, ошибка в консоли.** Красный первым: нет модуля.
- **Мутация** (доказывает, что 404-тесты ловят именно зависание): в `tryLoad` вместо
  `console.error` + `return false` поставили `throw error` → оба 404-теста **красные**
  (`expected false to be true`: инициализатор так и не завершился — белая страница).
  Вернули — зелёные.
- e2e `smoke.spec.ts` против продакшен-сборки: браузер `fr-FR` → `lang="de"`, ошибок нет;
  браузер `ru-RU` → `lang="ru"`, загружены `ru.json` и `de.json` (в продакшене немецкий —
  запасной для пропущенных ключей), `en.json` не грузится; `page.route` отвечает 404 на
  `ru.json` → страница отрисована, `lang="de"`, в консоли `[i18n] Could not load "ru"`.
  **Мутация:** убрали `provideI18n()` из `app.config.ts` → 2 e2e красные; вернули — 5/5.
- **Изменённый тест** (требование изменилось): старый e2e «по умолчанию немецкий» шёл с
  языком браузера Playwright по умолчанию — `en-US`. После 1b такой браузер честно
  получает английский (ADR-0006). Тест теперь задаёт `fr-FR` — язык, которого у нас нет,
  — и проверяет, что запасной язык немецкий. Изменение в том же коммите, причина в
  сообщении коммита.
- Две ошибки в моих новых тестах по ходу (не в коде): тест переключения не отвечал на
  запрос `de.json` и брал `KonturIntl` уже после переключения (подписчика ещё не было,
  Transloco нечего было грузить); e2e ожидал только `ru.json`, а продакшен-сборка
  правильно грузит и `de.json`.
- `tools/i18n-check`: в тест-сторож добавлена папка `apps/signflow/public/i18n`.

**Какие были альтернативы и почему отказались.**

- Встроенный fallback Transloco при ошибке загрузки: работает, но неявно (активный язык
  и кэш после ошибки ведут себя неочевидно), и не даёт нашего сообщения в консоли.
- Без инициализатора (грузить перевод после старта): нет риска белой страницы, но на
  долю секунды видны ключи — ровно то, чего мы избегаем.
- Общая библиотека `libs/shared/i18n`: решение владельца — вынести, когда понадобится
  Belegscan.
- Сохранённый выбор языка: без переключателя сохранять нечего (ADR-0006 — с первым
  экраном, где есть переключатель).

**Что может сломаться и как починить.**

- Симптом: белая страница → посмотреть консоль; если ошибки `[i18n]` нет, а страница
  пустая — кто-то снова пробросил ошибку из `tryLoad` (тест 404 должен это поймать).
- Симптом: e2e «по умолчанию немецкий» вдруг даёт `en` → у теста пропал `locale: 'fr-FR'`.
- Симптом: в консоли `Missing translation for '…'` → ключ не добавлен в `de.json`
  (и en/ru — `i18n-check` в CI это тоже скажет).
- Симптом: `lang` не меняется при переключении → `effect` в `provideI18n` удалён или
  читает не сигнал `activeLang()`.

**Вопрос с собеседования по этой теме.**

- В: Чем опасен `APP_INITIALIZER`/`provideAppInitializer`, и как вы с этим работаете?
- О: Angular не отрисует приложение, пока Promise инициализатора не выполнится. Если
  внутри сетевой запрос, а его ошибка не обработана, — пустая страница. У нас
  инициализатор никогда не падает: каждая ошибка ловится и пишется в консоль, есть
  запасной язык и тайм-аут, а тест с ответом 404 и мутация «пробросить ошибку»
  доказывают, что приложение всё равно стартует.

## 🇬🇧 What and why (full)

**What was done.** SignFlow uses Transloco (ADR-0006): de by default, en (en-GB), ru; no
language switcher yet. The start language is the first browser language the app has
(`ru-RU` → ru, `en-US` → en, `fr-FR` → de). Translations are fetched over HTTP from
`public/i18n/<lang>.json`; `languages.json` lists the languages. `<html lang>` follows the
active language (WCAG 3.1.1). `libs/ui` built-in strings come from the app's translations
via a `KonturIntl` adapter. A missing key is logged and shown as the key in development and
tests; production shows the German text. Only two keys so far (`kontur.*`, texts taken from
`KonturIntlDe/En/Ru`); the status-line keys arrive with the screen in 1c.

**Why (real-life analogy).** A shop opens in the morning even if the Russian sign did not
arrive: it hangs the German one, or writes the name with a marker. Keeping the doors shut
while waiting for a sign that never comes is the real failure.

**Working beats pretty.** The start language is loaded in an app initializer, before the
first render, so users never see keys. But Angular waits for the initializer: an unhandled
404 or network error would leave a blank page forever. So the initializer always
completes: load the start language → on failure log `[i18n] Could not load "ru"` and load
German → on failure log again and start with keys. A 10 s `timeout` turns a hanging request
into the same path. Transloco's own silent load fallback is disabled (`NoLoadFallback`) so
the whole policy lives in one visible function, `loadStartLanguage()`.

> **Update 2026-11-22 (after task 4, entry [030](030-frontend-settings.md)).** The two steps
> ran one after the other, 10 s each: a ru browser and a hanging server meant a 20 s blank
> page. Owner's option C: when the start language is not de, its file and `de.json` are
> requested at once, with one deadline, `STARTUP_TIMEOUT_MS` (10 s).
>
> - Start language arrived → use it; German keeps loading in the background.
> - Only de arrived → German, plus `console.error`.
> - Nothing → keys, plus `console.error`.
>
> The cost is one extra `de.json` for en/ru, a few KB, which production needs anyway as the
> fallback. The "runtime switch" test now switches to en: de is no longer fetched on demand.
>
> **Found while fixing.** Production had Transloco's `useFallbackTranslation` on. It makes
> `load('ru')` fetch ru.json and de.json together (`forkJoin`, bypassing the cache): a
> failed de.json failed Russian too (keys on screen), and de.json was fetched twice. Unit
> tests run in dev mode and missed it; e2e on the production build caught it. Now
> `useFallbackTranslation: false`, and `ReportingMissingHandler` shows German for a missing
> key in production (ADR-0006). New e2e tests: de.json 404 → Russian; a key missing in
> ru.json → German text.

**How it works, step by step.** `languages.ts` (config, `startLang`); `provide-i18n.ts`
(`provideTransloco` with an HTTP loader and `failedRetries: 0`, missing handler,
`NoLoadFallback`, messageformat, `provideAppInitializer(loadStartLanguage)`, an `effect()`
writing `<html lang>`, `provideKonturIntl(TranslocoKonturIntl)`); `app.config.ts` adds
`provideHttpClient()` and `provideI18n()`.

**Tests (red first) and mutations.** Unit tests for `startLang`; six tests with
`HttpTestingController` (browser language, `<html lang>`, KonturIntl, runtime switch,
missing key, 404 for the start language → rendered in German with an error, 404 for every
file → rendered with an error). Mutation: rethrowing in `tryLoad` turns both 404 tests red
(the initializer never completes). E2E against the production build: `fr-FR` → de without
console errors; `ru-RU` → ru, fetching `ru.json` and `de.json` (production fallback), never
`en.json`; 404 on `ru.json` via `page.route` → page renders in German and logs the reason.
Mutation: removing `provideI18n()` turns two e2e tests red. The old "German by default" e2e
test ran with Playwright's default `en-US`; since 1b that browser correctly gets English,
so the test now sets `fr-FR` — changed together with the requirement, reason in the commit.
`tools/i18n-check`'s guard now expects `apps/signflow/public/i18n`.

**Alternatives considered and why rejected.** Transloco's built-in load fallback (implicit,
no log of our own); no initializer (flash of keys); `libs/shared/i18n` now (owner: extract
when Belegscan needs it); a persisted choice (nothing to persist without a switcher).

**What can break and how to fix it.** Blank page without an `[i18n]` error → an error
escapes `tryLoad` again. The default-language e2e shows `en` → its `locale: 'fr-FR'` is
gone. `Missing translation` in the console → key missing in `de.json`. `lang` stuck → the
`effect` was removed or does not read `activeLang()`.

**Interview question on this topic.** Q: What is the risk of an app initializer and how do
you handle it? A: Angular renders nothing until its promise settles; an unhandled network
error means a blank page. Ours never fails: every error is caught and logged, there is a
fallback language and a timeout, and a 404 test plus a "rethrow" mutation prove that the
app still starts.

## 🇩🇪 Kurzfassung (Niveau B1)

SignFlow nutzt jetzt Transloco und spricht Deutsch, Englisch und Russisch. Die
Startsprache kommt aus den Spracheinstellungen des Browsers; wenn wir die Sprache nicht
haben, startet die App auf Deutsch. Die Übersetzungen liegen als JSON-Dateien auf dem
Server und werden pro Sprache geladen. Das Attribut `lang` der Seite zeigt immer die
aktive Sprache, damit Screenreader richtig vorlesen. Die wichtigste Regel: Eine fehlende
Übersetzungsdatei darf die App nicht blockieren. Wenn die Datei nicht lädt, schreibt die
App einen Fehler in die Konsole und startet auf Deutsch – oder notfalls mit den
Schlüsseln. Ein Test mit der Antwort 404 beweist das, und eine Mutation zeigt, dass der
Test eine weiße Seite wirklich erkennt.

### Fachwortschatz

| Deutsch                            | English                  | Русский                     |
| ---------------------------------- | ------------------------ | --------------------------- |
| die Übersetzungsdatei              | translation file         | файл перевода               |
| die Startsprache                   | start language           | стартовый язык              |
| die Ausweichsprache                | fallback language        | запасной язык               |
| der fehlende Schlüssel             | missing key              | пропущенный ключ            |
| der Initialisierer                 | initializer              | инициализатор               |
| die Zeitüberschreitung             | timeout                  | тайм-аут                    |
| die Fehlermeldung in der Konsole   | console error            | ошибка в консоли            |
| die Spracheinstellung des Browsers | browser language setting | язык браузера               |
| funktionierend vor schön           | working beats pretty     | работающее важнее красивого |
