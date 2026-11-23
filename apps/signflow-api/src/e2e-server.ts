// Entry of the e2e API (task 8-1): see src/e2e/run-e2e-server.ts. Run from the workspace
// root by `nx run signflow-api:serve-e2e`; never part of production (task 22 keeps it out
// of the image).
// First, as in main.ts: Nest decorators of the imported modules need the Reflect API.
import 'reflect-metadata';
import { resolve } from 'node:path';
import { runE2eServer } from './e2e/run-e2e-server.js';

process.exitCode = await runE2eServer({
  userFile: resolve('apps/signflow-e2e/src/support/e2e-user.json'),
  projectRoot: resolve('apps/signflow-api'),
  apiEntry: resolve('dist/apps/signflow-api/src/main.js'),
  port: '4310',
  stderr: process.stderr,
});
