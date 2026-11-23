import { readFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { defineConfig } from 'vitest/config';

/**
 * The one place that limits Vitest workers for every project (ADR-0029).
 *
 * Nx runs `parallel` tasks at once, and each Vitest run starts its own workers. Without a
 * limit every run takes "cores - 1" workers, so 3 test tasks on 8 cores start ~21 workers;
 * cold Angular test files then miss the 5 s timeout. The rule:
 *
 *   Nx parallel x maxWorkers <= cores   =>   maxWorkers = floor(cores / Nx parallel), at least 1
 *
 * Owner's laptop: 8 logical cores, parallel 3 -> 2. GitHub runner: 4 vCPU -> 1.
 * Used by the Angular projects (`runnerConfig` in project.json) and imported by the
 * Node projects' vitest.config.mts.
 */
const nx = JSON.parse(
  readFileSync(new URL('./nx.json', import.meta.url), 'utf8'),
) as {
  parallel: number;
};

export const maxWorkers = Math.max(
  1,
  Math.floor(availableParallelism() / nx.parallel),
);

export default defineConfig({
  test: { maxWorkers },
});
