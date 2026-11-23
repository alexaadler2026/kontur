// Entry of the create-admin command (task 7d): see src/admin/create-admin.ts.
// The e-mail is the one argument; the password is asked for in the terminal.
// First, as in main.ts: class-validator / class-transformer decorators (the settings
// schema) need the Reflect metadata API before any of those modules load.
import 'reflect-metadata';
import { runCreateAdmin } from './admin/create-admin.js';

process.exitCode = await runCreateAdmin(process.argv.slice(2), {
  stdin: process.stdin,
  stdout: process.stdout,
  stderr: process.stderr,
});
