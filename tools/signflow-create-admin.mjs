// pnpm signflow:create-admin <e-mail> [--generate-password]
//
// Builds signflow-api, then runs the built create-admin with node DIRECTLY — not through
// `nx run`. Why (owner, 2026-11-24): under `nx run` on Windows the command's output goes
// through Nx's own pseudo-terminal; depending on the terminal, the password shown on the
// console never reached the person's screen. Run like this, stdin, stdout and the console
// are the person's own terminal. The password is never an argument or a variable here.
import { spawnSync } from 'node:child_process';

// The local development database (compose.dev.yaml), as in apps/signflow-api/project.json.
// Elsewhere (server) DATABASE_URL is set in the environment and wins.
const LOCAL_DATABASE_URL =
  'postgresql://signflow:signflow-local@127.0.0.1:5432/signflow';

const build = spawnSync(
  'pnpm',
  ['nx', 'run', 'signflow-api:build', '--output-style=static'],
  {
    stdio: ['ignore', 'inherit', 'inherit'],
    shell: process.platform === 'win32',
  },
);
if (build.status !== 0) process.exit(build.status ?? 1);

const run = spawnSync(
  process.execPath,
  ['dist/apps/signflow-api/src/create-admin.js', ...process.argv.slice(2)],
  {
    stdio: 'inherit',
    env: {
      ...process.env,
      DATABASE_URL: process.env.DATABASE_URL ?? LOCAL_DATABASE_URL,
    },
  },
);
process.exit(run.status ?? 1);
