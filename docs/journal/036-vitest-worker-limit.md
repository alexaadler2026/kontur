# 036 · Vitest worker failures: cause found, workers limited by a formula

Date: 2026-11-23 · Task: investigation between tasks 6 and 7, [ADR-0029](../adr/0029-test-worker-limit.md) · PR: — · Commits: after `c13be7c`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** Нашли, почему полный локальный прогон проверок иногда падал в разных
проектах (`Failed to start forks worker`, `Worker exited unexpectedly`,
`Test timed out in 5000ms`), хотя по отдельности всё было зелёным. Причина: **слишком
много процессов-воркеров Vitest на процессор**. Исправление — один общий файл
`vitest-base.config.mts` в корне. Он ограничивает число воркеров по формуле:

```
параллельность Nx × maxWorkers ≤ число ядер
maxWorkers = max(1, floor(ядра / parallel из nx.json))
```

Термины:

- **воркер** — отдельный процесс Node, в котором Vitest выполняет файлы тестов, чтобы
  гонять их параллельно;
- **`maxWorkers`** — сколько воркеров максимум Vitest запустит в одном проекте;
- **параллельность Nx (`parallel`)** — сколько задач (lint, test, build разных проектов)
  Nx выполняет одновременно.

**Зачем это нужно (аналогия из жизни).** На кухне 8 конфорок. Шеф (Nx) одновременно
готовит 3 блюда, и каждый повар (Vitest) без спроса занимает 7 конфорок. Получается 21
кастрюля на 8 конфорок: все ждут, и самое медленное блюдо (холодный старт Angular-теста)
не успевает к сроку в 5 секунд. Правило «блюд × конфорок на повара ≤ всех конфорок» —
и все успевают, причём быстрее.

**Как это работает, шаг за шагом.**

1. По умолчанию Vitest 4.1.12 берёт `availableParallelism() − 1` воркеров (проверено в
   исходнике, функция `resolveMaxWorkers`): у владельца 8 − 1 = 7, в CI 4 − 1 = 3.
2. Nx запускает 3 задачи одновременно (`nx.json`, теперь записано явно:
   `"parallel": 3`).
3. `vitest-base.config.mts` читает `parallel` из `nx.json`, делит на число логических
   ядер, округляет вниз: у владельца 8 / 3 → **2**, в CI 4 / 3 → **1**.
4. Angular-проекты (`signflow`, `belegscan`, `ui`) запускают Vitest через
   `@angular/build:unit-test`; у них в `project.json` добавлено
   `"runnerConfig": "vitest-base.config.mts"`. В логе видно:
   `Using Vitest configuration file: …vitest-base.config.mts`.
5. Node-проекты (`signflow-api`, `api-kit`, `api-client`, `api-contract`, `i18n-check`,
   `tokens`) импортируют `maxWorkers` из того же файла. Импорт пишется
   `'…/vitest-base.config.mjs'`: так требует TypeScript (NodeNext), а находит он файл
   `.mts`. С `.mts` в пути проверка типов падала (`TS5097`) — пойманная ошибка
   прогона.

**Как расследовали (по шагам, с цифрами).** Логи — `tmp/logs/*-036-*`, наблюдатель раз в
секунду записывал число `node.exe` и память.

1. Старые логи: все три типа сбоев — в Angular-проектах; суммарный `import` у воркеров
   `ui` 606 s при 175 s по часам — воркеры стояли в очереди.
2. Замер «до», полный прогон как в CI без кэша: зелёный, **7:21**, до 20 процессов Node,
   свободной памяти минимум 1,2 ГБ.
3. Сбой нарочно: только тесты, `--parallel=9`, без кэша — **3 падения из 3** (тайм-ауты
   первого теста в файле в `ui`, один раз и в `signflow`).
4. Та же нагрузка с лимитом — **0 из 3**, и быстрее: 3:02 / 2:16 / 1:59 против 5:02 /
   4:00 / 3:57. Пик памяти Node упал с ~4 ГБ до ~2,2 ГБ. Памяти хватало и до лимита
   (минимум 4,4 ГБ свободно) — значит, узкое место процессор.
5. Полный прогон «после» без кэша: зелёный, **4:37** (было 7:21), до 16 процессов Node (было 20). Пик памяти Node почти тот же (~4,8 ГБ): в полном прогоне её занимают сборки и Storybook, а не тесты.

|                                  | до (без лимита)    | после (`maxWorkers` 2) |
| -------------------------------- | ------------------ | ---------------------- |
| нагрузка `--parallel=9`: падения | 3 из 3             | 0 из 3                 |
| нагрузка: время                  | 5:02 / 4:00 / 3:57 | 3:02 / 2:16 / 1:59     |
| нагрузка: пик `node.exe`         | 24                 | 20                     |
| нагрузка: пик памяти Node        | 3,7–4,2 ГБ         | 2,1–2,3 ГБ             |
| полный прогон: время             | 7:21               | 4:37                   |
| CI, шаг `lint, test, …`          | 135 s              | CI_AFTER               |

**Попутная находка (не исправлена, решение за владельцем).** Прогон «до» один раз упал
на `ui-storybook:build-storybook` **после** «Storybook build completed successfully»:
`Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76`.
Это известная ошибка Node на Windows (nodejs/node#56645; у нас Node 24.11.0): Node
трогает хэндл libuv (библиотеки ввода-вывода внутри Node), который уже закрывается,
обычно при выходе процесса. Исправление (nodejs/node#61999) влито в `main` Node в июле
2026; есть ли оно в каком-то 24.x — не подтверждено. Возможно, им же объясняется
`Worker exited unexpectedly`, но в логах Vitest этой строки нет — связь не доказана.

**Ещё одна ловушка.** Повторный полный прогон показал 70 минут: журнал Windows
(Kernel-Power 42 → 107) показал, что ноутбук спал с 15:17 до 16:23. Время прогона
сравниваем только по прогонам без сна.

**Какие были альтернативы и почему отказались.**

- Меньше параллельности в Nx (`--parallel=1/2`): замедляет lint и build, которые не
  виноваты. Запасной вариант, если CI покажет обратное.
- Увеличить `testTimeout`: прячет симптом; `Worker exited unexpectedly` вообще не
  тайм-аут.
- Фиксированное число или процент: подходит одной машине. Процент Vitest округляет
  `Math.round` (33 % от 8 = 3) — нарушает правило.
- Один воркер на всё: самое медленное для `ui` (9 файлов).

**Что может сломаться и как починить.**

- Симптом: новый проект с Vitest снова падает под нагрузкой → Причина: не подключён
  общий файл → Что делать: Node — `maxWorkers` из `vitest-base.config.mjs`, Angular —
  `runnerConfig`.
- Симптом: сбой воркера в CI → правило владельца: снова к этой задаче (ADR-0029).
- Симптом: `nx … --parallel=9` — формула всё равно делит на 3 из `nx.json`. Под такой
  нагрузкой (9 × 2 = 18 воркеров) проверено — зелёное.
- Симптом: `Assertion failed … UV_HANDLE_CLOSING` → это Node, не наш код; повторить
  задачу; решение о версии Node — отдельно.

**Как проверить руками (PowerShell).**

```powershell
pnpm nx run ui:test --skip-nx-cache | Select-String 'Using Vitest configuration'
# ожидается: Using Vitest configuration file: C:\...\vitest-base.config.mts

pnpm nx run-many -t test --parallel=9 --skip-nx-cache; $LASTEXITCODE
# ожидается: Successfully ran target test for 9 projects ... и 0
```

**Вопрос с собеседования по этой теме.**

- В: Тесты зелёные по одному, но иногда падают в полном прогоне монорепо. Что делаете?
- О: Ищу общий ресурс. Здесь — процессор: Nx и Vitest каждый параллелят сами, и
  параллельности перемножаются. Сначала вызываю сбой нарочно (завышенная нагрузка),
  чтобы он стал стабильным, меряю процессы и память, потом ставлю лимит по формуле
  «задачи × воркеры ≤ ядра» и показываю: при той же нагрузке падения исчезли. Тайм-ауты
  не увеличиваю — это прячет причину.

## 🇬🇧 What and why (full)

**What was done.** Full local runs failed now and then in a different project each time
(`Failed to start forks worker`, `Worker exited unexpectedly`, `Test timed out in 5000ms`)
while each project alone was green. The cause: too many Vitest worker processes for the
CPU. Fix: one shared `vitest-base.config.mts` at the root limits workers by the rule
`Nx parallel × maxWorkers ≤ cores`, i.e. `maxWorkers = max(1, floor(cores / parallel))`.
A worker is a Node process in which Vitest runs test files in parallel; `maxWorkers` caps
them per project; Nx `parallel` is how many tasks Nx runs at once.

**Why (real-life analogy).** A kitchen with 8 burners: the head chef (Nx) cooks 3 dishes at
once and every cook (Vitest) grabs 7 burners. 21 pots on 8 burners — the slowest dish (a
cold Angular test) misses its 5-second deadline. "Dishes × burners per cook ≤ burners"
and everyone finishes, faster.

**How it works, step by step.**

1. Vitest 4.1.12 defaults to `availableParallelism() − 1` workers (`resolveMaxWorkers`):
   7 on the laptop, 3 in CI.
2. `nx.json` now states `"parallel": 3` explicitly — it is an input of the formula.
3. `vitest-base.config.mts` computes 8 / 3 → **2** locally, 4 / 3 → **1** in CI.
4. Angular projects use it via `"runnerConfig": "vitest-base.config.mts"` on the
   `@angular/build:unit-test` target; Node projects import `maxWorkers` as
   `'…/vitest-base.config.mjs'` (NodeNext maps `.mjs` to the `.mts` file; a `.mts` path
   failed typecheck with `TS5097`).

**Investigation.** Old logs: all failures in Angular projects, summed worker `import` time
three to four times wall time. Baseline full run (CI-like, no cache): green, 7:21. Forced
failure (`test --parallel=9 --skip-nx-cache`): **3 of 3 failed**. Same load with the
limit: **0 of 3**, 40–50 % faster, Node peak memory halved; free memory was never short,
so the CPU is the bottleneck. Full run after: 4:37 (was 7:21), peak 16 Node processes (was 20). CI step `lint, test, …`: 135 s
before, CI_AFTER after.

**Side finding (not fixed).** One baseline run failed in `build-storybook` _after_ a
successful build with Node's Windows libuv assertion
(`UV_HANDLE_CLOSING`, `src\win\async.c` line 76; nodejs/node#56645, fix #61999 merged to
Node `main` in July 2026, 24.x backport unconfirmed). It might also explain `Worker exited
unexpectedly`, but no Vitest log shows it. A Node upgrade is the owner's decision. Also: a
70-minute "full run" turned out to be the laptop sleeping (Kernel-Power 42/107).

**Alternatives considered and why rejected.** Lower Nx parallelism (slows lint/build, kept
as fallback); longer timeouts (hide the symptom); a fixed number or percentage (fits one
machine; Vitest rounds percentages with `Math.round`, 33 % of 8 = 3); a single worker (slowest).

**What can break and how to fix it.** A new Vitest project not wired to the shared file →
import `maxWorkers` or set `runnerConfig`. A worker failure in CI → reopen this task.
`--parallel=N` on the CLI does not change the formula (load-tested at 9: green).

**Interview question on this topic.** Q: Tests pass one by one but sometimes fail in the
full monorepo run — what do you do? A: Look for a shared resource. Here two layers of
parallelism (Nx tasks, Vitest workers) multiply on the CPU. Make the failure reproducible
with deliberate overload, measure processes and memory, limit workers by "tasks × workers
≤ cores", and show the same load now passes. Do not raise timeouts.

## 🇩🇪 Kurzfassung (Niveau B1)

Die Tests liefen einzeln immer grün, aber im kompletten Lauf scheiterten sie manchmal.
Der Grund: Nx startet drei Aufgaben gleichzeitig, und jede Vitest-Ausführung startet ohne
Grenze sieben Worker-Prozesse. So liefen über 20 Prozesse auf 8 Kernen. Die
Angular-Tests brauchten beim Kaltstart dann mehr als 5 Sekunden. Wir haben den Fehler
absichtlich mit hoher Last erzeugt: drei von drei Läufen scheiterten. Danach haben wir
eine Regel in einer gemeinsamen Datei festgelegt: Nx-Parallelität mal Worker ist
höchstens die Zahl der Kerne. Mit dieser Grenze liefen alle drei Läufe fehlerfrei und
sogar schneller. Nebenbei haben wir einen bekannten Fehler von Node unter Windows
gefunden; darüber entscheidet der Projektinhaber später.

### Fachwortschatz

| Deutsch                | English        | Русский                                |
| ---------------------- | -------------- | -------------------------------------- |
| der Worker-Prozess     | worker process | процесс-воркер                         |
| die Parallelität       | parallelism    | параллельность                         |
| der Prozessorkern      | CPU core       | ядро процессора                        |
| die Zeitüberschreitung | timeout        | превышение времени ожидания (тайм-аут) |
| der Lasttest           | load test      | нагрузочный тест                       |
| die Ursache            | root cause     | первопричина                           |
| der Ruhezustand        | sleep mode     | спящий режим                           |
| die Obergrenze         | upper limit    | верхний предел                         |
