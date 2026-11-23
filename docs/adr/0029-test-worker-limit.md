# 0029. Test parallelism: Vitest workers limited by "Nx parallel × maxWorkers ≤ cores"

- Status: Accepted
- Date: 2026-11-23

## Context and Problem Statement

Local full runs (`nx run-many -t lint test typecheck build build-storybook api-check`)
failed now and then in a different project each time, while the same project run alone
was green (journals 026, 032–035):

- `signflow:test`: `Failed to start forks worker … Timeout waiting for worker to respond`;
- `ui:test`: `Worker exited unexpectedly` (twice);
- `ui:test`: `Test timed out in 5000ms` on the first test of a file.

CI never showed it. Two layers of parallelism multiply:

- **Nx** runs `parallel` tasks at once (default 3, until now not written anywhere).
- **Vitest** starts its own worker processes in each test task. Without `maxWorkers` it
  takes `availableParallelism() − 1` (Vitest 4.1.12, `resolveMaxWorkers`): 7 on the
  owner's laptop, 3 on a GitHub runner.

So 3 test tasks on the laptop may start ~21 workers on 8 logical cores, next to `build`
and `build-storybook`. Angular test files start cold (TestBed, jsdom, compiled
components); under that load the first test of a file does not finish within 5 s.

### Measurements (2026-11-23, logs in `tmp/logs/*-036-*`)

Machine: Intel i7-8565U, 4 physical / 8 logical cores, 32 GB RAM (4–7 GB free during
runs: other programs). Load test: `nx run-many -t test --parallel=9 --skip-nx-cache`,
three times each.

|                                | no limit (Vitest default)                                                          | `maxWorkers` = 2   |
| ------------------------------ | ---------------------------------------------------------------------------------- | ------------------ |
| failed runs                    | **3 of 3** (`ui:test`, once also `signflow:test`; 1–6 tests `timed out in 5000ms`) | **0 of 3**         |
| wall time                      | 5:02 / 4:00 / 3:57                                                                 | 3:02 / 2:16 / 1:59 |
| peak `node.exe` processes      | 24                                                                                 | 20                 |
| peak RAM of all Node processes | 3.7–4.2 GB                                                                         | 2.1–2.3 GB         |
| lowest free RAM                | 4.4–4.8 GB                                                                         | 6.5–7.0 GB         |

Free memory never ran out, so the bottleneck is the CPU: in `ui:test`, the summed
`import` time of the workers (620–730 s) was three to four times the wall time.

## Decision Drivers

- Fix the cause where it is (too many test workers), not the symptom (longer timeouts).
- One place for the rule, used by Angular and Node projects alike.
- Do not slow down lint and build; do not slow down CI.
- The number is derived from a formula with written inputs, not picked by eye.

## Considered Options

1. **Limit Vitest workers in one shared config: `maxWorkers = floor(cores / Nx parallel)`**
2. Lower Nx parallelism (`--parallel=1` or `2`)
3. Raise `testTimeout` / `hookTimeout`
4. Fixed `maxWorkers` number or a percentage (`"33%"`)
5. Run tests in a single worker (`fileParallelism: false`)

## Decision Outcome

Chosen: **1.**

**The rule.** `Nx parallel × maxWorkers ≤ logical cores`, so

```
maxWorkers = max(1, floor(availableParallelism() / parallel from nx.json))
```

|                                             | logical cores | Nx parallel | maxWorkers | workers at most (Nx × Vitest) |
| ------------------------------------------- | ------------- | ----------- | ---------- | ----------------------------- |
| owner's laptop                              | 8             | 3           | **2**      | 6                             |
| GitHub runner `ubuntu-latest` (public repo) | 4             | 3           | **1**      | 3                             |
| before, laptop (Vitest default)             | 8             | 3           | 7          | 21                            |
| before, CI (Vitest default)                 | 4             | 3           | 3          | 9                             |

**Where it lives.**

- `vitest-base.config.mts` (workspace root) computes `maxWorkers` and exports it.
- `nx.json` now states `"parallel": 3` explicitly. That number is an input of the formula,
  so it belongs in a file, not in an Nx default.
- The Angular projects (`signflow`, `belegscan`, `ui`) run Vitest through
  `@angular/build:unit-test`; their `test` target sets
  `"runnerConfig": "vitest-base.config.mts"`. The log prints
  `Using Vitest configuration file: …vitest-base.config.mts`.
- The Node projects (`signflow-api`, `api-kit`, `api-client`, `api-contract`, `i18n-check`,
  `tokens`) import `maxWorkers` from that file in their `vitest.config.mts`.

**Why `floor` and not a percentage.** Vitest rounds percentages with `Math.round`
(`"33%"` of 8 = 3), which breaks the "≤ cores" rule. `floor` and the `max(1, …)` floor are
explicit in code.

**Why not the others.**

- 2 (fewer Nx tasks) also slows lint, typecheck and build, which were never the problem.
  Measurements show the test workers are the load. It stays the fallback if CI says
  otherwise.
- 3 (longer timeouts) hides the symptom; a test that needs 6 s because of contention
  would just wait longer, and `Worker exited unexpectedly` is not a timeout at all.
- 4 (fixed number) is right for one machine only: 2 overloads a 4-vCPU runner (3 × 2 = 6),
  1 wastes the laptop.
- 5 (one worker) is the slowest option for `ui` (9 files) with no gain over 1.

### Consequences

- Good: the load test that failed 3 of 3 passes 3 of 3, and is 40–50 % faster. Node
  processes need half the memory.
- Good: one rule, one file. A new Vitest project imports `maxWorkers` (Node) or sets
  `runnerConfig` (Angular).
- Bad: `nx … --parallel=N` on the command line does not change the formula; it still
  divides by the 3 from `nx.json`. Acceptable: at `--parallel=9` (9 × 2 = 18 workers) the
  load test passed.
- Bad: on a 2-core machine (GitHub's private-repo runner) the formula gives 1 worker with
  3 Nx tasks = 3 workers on 2 cores. Revisit if the repo becomes private.
- Neutral: `vitest-base.config.mts` is not an Nx cache input of the `test` targets. The
  worker count changes how fast tests run, never their result, so cached results stay
  valid.

## Open issue, not decided here: Node's libuv assertion on Windows

The baseline full run of 2026-11-23 ended with `ui-storybook:build-storybook` failing
**after** "Storybook build completed successfully":

```
Assertion failed: !(handle->flags & UV_HANDLE_CLOSING), file src\win\async.c, line 76
```

This is a known Node bug on Windows (nodejs/node#56645, reported for 23.x and 24.4–24.10;
local Node is 24.11.0). Node signals a libuv handle that is already closing, usually at
process exit. The fix, nodejs/node#61999 ("src: fix libuv assertion on windows"), is in
**Node 24.20.0** (2026-08-26, `CHANGELOG_V24.md`); the latest 24.x on 2026-11-23 is
24.22.3. CI never showed it: `.nvmrc` says only `24`, so CI gets a newer 24.x than the
laptop. It may also explain `Worker exited unexpectedly` (a worker dying at exit), but no
Vitest log contains the assertion, so that link is not proven.

Owner's decision (2026-11-23): a separate small task before task 22 updates Node to the
latest 24.x and pins the exact version in one place that CI and the future Dockerfile
read (`docs/plans/next-steps.md`).

## More Information

- Journal [036](../journal/036-vitest-worker-limit.md): investigation, logs, CI before/after.
- Vitest 4.1.12: `resolveMaxWorkers` in `vitest/dist/chunks/cli-api.*.js`; Angular:
  `runnerConfig` in `@angular/build/src/builders/unit-test/schema.json`.
