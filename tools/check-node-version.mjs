// The one Node version of the repository lives in .nvmrc (exact, e.g. 24.22.3). This check
// fails when the running Node or package.json "engines.node" says anything else, so CI,
// the owner's machine and the future Dockerfile (task 22, reads .nvmrc) cannot drift apart.
// Why exact: code relies on features of a specific minor (crypto.argon2 needs >= 24.7,
// journal 037) and on bug fixes (libuv assertion on Windows fixed in 24.20.0, journal 036).
// Run: pnpm check:node-version (also a CI step).
import { readFileSync } from 'node:fs';

const pinned = readFileSync('.nvmrc', 'utf8').trim();
const { engines } = JSON.parse(readFileSync('package.json', 'utf8'));
const running = process.versions.node;

const problems = [];
if (!/^\d+\.\d+\.\d+$/.test(pinned)) {
  problems.push(
    `.nvmrc must hold an exact version like 24.22.3, has "${pinned}"`,
  );
}
if (engines?.node !== pinned) {
  problems.push(
    `package.json engines.node must equal .nvmrc (${pinned}), has "${engines?.node}"`,
  );
}
if (running !== pinned) {
  problems.push(
    `running Node ${running}, but .nvmrc pins ${pinned} — install it (docs/journal/038-node-version.md)`,
  );
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(`Node ${running} = .nvmrc = engines.node - ok`);
