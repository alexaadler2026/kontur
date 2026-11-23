# 038 · Node version: one exact version in .nvmrc, checked everywhere

Date: 2026-11-23 · Task: "Node version" (before 7b), [ADR-0001](../adr/0001-nx-monorepo-with-pnpm.md) · PR: — · Commits: after `4b5c447`

## 🇷🇺 Что и зачем (подробно, простыми словами)

**Что сделано.** Версия Node теперь задана **точно и в одном месте**: `.nvmrc` =
`24.22.3`. Всё остальное с ней сверяется:

- `package.json` → `engines.node` = `24.22.3` (то же число; проверяется скриптом);
- `pnpm-workspace.yaml` → `engineStrict: true`: `pnpm install` на другой версии Node
  отказывает (`Unsupported engine … wanted 24.22.3`);
- `pnpm check:node-version` (`tools/check-node-version.mjs`): запущенный Node = `.nvmrc` =
  `engines.node`, иначе ошибка с подсказкой;
- CI: `actions/setup-node` читает `.nvmrc`, следующий шаг запускает проверку и печатает
  версию аннотацией «Node version» (её видно через публичный API GitHub);
- в задаче 22 Dockerfile тоже возьмёт версию из `.nvmrc`.

Термины:

- **`.nvmrc`** — файл с версией Node; его читают nvm, `actions/setup-node` и др.;
- **`engines`** — поле `package.json` «с какой версией Node работает проект»;
- **`engineStrict`** — настройка pnpm: не устанавливать зависимости, если версия не
  подходит под `engines`;
- **патч-версия** — третья цифра (24.22.**3**): исправления ошибок и безопасности.

**Зачем это нужно (аналогия из жизни).** Рецепт, где написано «духовка — примерно 200
градусов», у каждого повара выходит по-своему. `.nvmrc` = `24` было таким «примерно»: CI
брал ту 24.x, что лежала в кэше раннера, а у владельца стояла 24.11.0. Из-за этого
(1) ошибка Node на Windows (`UV_HANDLE_CLOSING`, исправлена в 24.20.0, журнал 036) была
только локально, и (2) код 7a, которому нужен `crypto.argon2` (Node ≥ 24.7), формально мог
попасть на старую 24.x. Теперь в рецепте точная цифра, а контролёр её проверяет.

**Как это работает, шаг за шагом.**

1. Человек или CI ставит Node по `.nvmrc`.
2. `pnpm install` сравнивает запущенный Node с `engines.node` → другая версия = отказ.
3. `pnpm check:node-version` сверяет три числа и пишет понятную ошибку.
4. В CI версия попадает в аннотацию — её можно прочитать без входа в GitHub.

**Как проверяли (red first).** На старом Node 24.11.0:

- `pnpm check:node-version` → `running Node 24.11.0, but .nvmrc pins 24.22.3` и код 1;
- `pnpm install --frozen-lockfile` с `engineStrict` → `Unsupported engine … wanted
{"node":"24.22.3"} (current: {"node":"24.11.0"})` и код 1; без `engineStrict` pnpm на
  версию не смотрел вообще (код 0) — поэтому настройка нужна;
- `pnpm nx …` при этом работает: `engineStrict` касается только установки.

Зелёный — после установки 24.22.3 локально и после push в CI (аннотация «Node version»).

**Установка 24.22.3 на машине владельца (PowerShell, нужен UAC).** Особенность машины:
`C:\Program Files\nodejs` — символическая ссылка в папку nvm из Laravel Herd
(`…\.config\herd\bin\nvm\v23.11.0`), а в этой папке лежит Node 24.11.0: установщик MSI
записал файлы через ссылку. Поэтому ставим так же, как была поставлена 24.11.0, — MSI:

```powershell
$v = '24.22.3'; $f = "node-v$v-x64.msi"
curl.exe -fLO "https://nodejs.org/dist/v$v/$f"
curl.exe -fLO "https://nodejs.org/dist/v$v/SHASUMS256.txt"
(Get-FileHash $f -Algorithm SHA256).Hash.ToLower()
Select-String -Path SHASUMS256.txt -Pattern $f
# обе строки должны показать 4a1ab5bdec5434bae58efae6c3e5077a011f6f1e76d2b47b7b10af043f7db545
Start-Process msiexec.exe -ArgumentList "/i $f" -Wait   # подтвердить UAC
# новое окно PowerShell:
node -v                      # ожидается: v24.22.3
pnpm check:node-version      # ожидается: Node 24.22.3 = .nvmrc = engines.node - ok
pnpm install --frozen-lockfile; $LASTEXITCODE   # ожидается: 0
```

**Какие были альтернативы и почему отказались.**

- Оставить `24` и добавить `check-latest: true` в CI: CI брал бы самую свежую 24.x, но
  ноутбук и CI всё равно расходились бы, а новая версия приходила бы без коммита.
- Диапазон `>=24.20 <25`: защищает от старых версий, но не делает окружения одинаковыми.
- Версия в двух местах без проверки (`.nvmrc` и `engines` отдельно): рано или поздно
  разойдутся — поэтому скрипт сверяет их.
- `nvm install` через nvm Herd: `settings.txt` nvm хранит путь с испорченной кириллицей,
  а `nvm use` меняет ссылку `C:\Program Files\nodejs` — риск остаться совсем без Node.
  MSI повторяет способ, которым была поставлена 24.11.0.

**Что может сломаться и как починить.**

- Симптом: `pnpm install` → `Unsupported engine` → стоит другой Node → поставить версию из
  `.nvmrc` (команды выше).
- Симптом: после обновления `.nvmrc` CI падает на шаге «Node version = .nvmrc =
  engines.node» → забыли поменять `engines.node` → одно число в двух файлах, поменять оба.
- Симптом: Herd переключил Node обратно → `node -v` покажет другую версию;
  `pnpm check:node-version` скажет об этом сразу.
- Обновление Node: поменять `.nvmrc` и `engines.node`, прогнать все проверки, отдельный
  коммит `chore: update node to X`.

**Вопрос с собеседования по этой теме.**

- В: «У меня работает, а в CI нет» — как сделать окружения одинаковыми?
- О: Закрепить точные версии инструментов в одном файле в репозитории (`.nvmrc`,
  `packageManager`, lockfile) и заставить каждое окружение их проверять: CI и Docker
  читают тот же файл, менеджер пакетов отказывает на чужой версии, отдельная проверка в CI
  печатает фактическую версию. Обновление — обычный коммит, видимый в истории.

## 🇬🇧 What and why (full)

**What was done.** The Node version is now pinned exactly in one place, `.nvmrc` =
`24.22.3`. `package.json` `engines.node` holds the same number; `engineStrict: true` in
`pnpm-workspace.yaml` makes `pnpm install` refuse any other Node; `pnpm check:node-version`
checks running Node = `.nvmrc` = `engines.node`; CI reads `.nvmrc`, runs the check and prints
the version as an annotation; the Dockerfile (task 22) will read `.nvmrc` too.

**Why (real-life analogy).** A recipe that says "about 200 degrees" comes out differently in
every kitchen. `.nvmrc` = `24` was such an "about": CI took whatever 24.x the runner had
cached, the laptop ran 24.11.0. That hid a Windows-only Node bug (fixed in 24.20.0, journal 036) and could in principle give task 7a's `crypto.argon2` (Node ≥ 24.7) an old 24.x.

**How it works, step by step.** Install Node from `.nvmrc`; `pnpm install` compares it with
`engines.node`; `pnpm check:node-version` compares all three numbers; CI prints the version
as an annotation readable without logging in.

**Testing (red first).** On Node 24.11.0 the check exits 1 with a clear message; `pnpm
install --frozen-lockfile` with `engineStrict` exits 1 (`Unsupported engine`), without it
pnpm ignored `engines` (exit 0). `pnpm nx` still runs. Green after installing 24.22.3 locally
and in CI after the push.

**Alternatives considered and why rejected.** `check-latest` (environments still drift), a
range like `>=24.20 <25` (no single version), two unchecked copies of the number (they drift),
`nvm install` via Herd's nvm (its settings hold a garbled non-ASCII path; `nvm use` replaces
the `C:\Program Files\nodejs` link — risk of no Node at all). MSI repeats how 24.11.0 was
installed.

**What can break and how to fix it.** `Unsupported engine` → install the `.nvmrc` version.
CI fails on the version step after a bump → `engines.node` not updated. Herd switching Node
back → the check says so at once. Upgrading: change `.nvmrc` and `engines.node`, run all
checks, one `chore:` commit.

**Interview question on this topic.** Q: "Works on my machine, fails in CI" — how do you
make environments identical? A: Pin exact tool versions in files in the repository
(`.nvmrc`, `packageManager`, lockfile) and make every environment verify them: CI and Docker
read the same file, the package manager refuses other versions, a CI step prints the actual
version. Upgrades become ordinary commits.

## 🇩🇪 Kurzfassung (Niveau B1)

Bisher stand in `.nvmrc` nur „24“. Deshalb lief in CI eine andere Node-Version als auf dem
Laptop des Projektinhabers. Jetzt steht dort die genaue Version 24.22.3, und nur dort.
`package.json` nennt dieselbe Zahl, und ein Skript prüft, dass beide Zahlen und das laufende
Node gleich sind. pnpm installiert mit einer anderen Version nichts mehr. In CI wird die
Version als Hinweis angezeigt. Auch das spätere Docker-Image liest die Version aus `.nvmrc`.
So sind alle Umgebungen gleich, und ein Update ist ein normaler Commit.

### Fachwortschatz

| Deutsch                     | English         | Русский              |
| --------------------------- | --------------- | -------------------- |
| die Versionsfestlegung      | version pinning | закрепление версии   |
| die Laufzeitumgebung        | runtime         | среда выполнения     |
| die Patch-Version           | patch version   | патч-версия          |
| die Prüfsumme               | checksum        | контрольная сумма    |
| die Abweichung              | drift           | расхождение          |
| die Paketverwaltung         | package manager | менеджер пакетов     |
| die symbolische Verknüpfung | symbolic link   | символическая ссылка |
