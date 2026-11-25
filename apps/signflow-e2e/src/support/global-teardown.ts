import { spawnSync } from 'node:child_process';
import { workspaceRoot } from '@nx/devkit';

/**
 * After the run: remove the e2e database (compose.e2e.yaml, owner 2026-11-24). The next
 * run would remove a leftover anyway; this keeps Docker clean right away.
 */
export default function globalTeardown(): void {
  spawnSync(
    process.execPath,
    ['dist/apps/signflow-api/src/e2e-database.js', '--down'],
    { cwd: workspaceRoot, stdio: 'inherit' },
  );
}
