// How long one password hash takes with the production parameters (ADR-0010, target
// 200–500 ms). Run: pnpm nx run auth-server:measure-hash. In CI the result also becomes an
// annotation ("::notice"), visible on the run page and through the GitHub API.
import { ARGON2ID_PARAMETERS, Argon2idPasswordHasher } from '../dist/index.js';

const hasher = new Argon2idPasswordHasher();
const runs = 7;
const times = [];
for (let i = 0; i < runs; i++) {
  const start = performance.now();
  await hasher.hash('correct horse battery staple');
  times.push(performance.now() - start);
}
times.sort((a, b) => a - b);

const { memoryKiB, passes, parallelism } = ARGON2ID_PARAMETERS;
const line =
  `Argon2id m=${memoryKiB / 1024} MiB, t=${passes}, p=${parallelism}: ` +
  `median ${Math.round(times[runs >> 1])} ms ` +
  `(min ${Math.round(times[0])}, max ${Math.round(times[runs - 1])}, ${runs} runs)`;

console.log(line);
if (process.env['GITHUB_ACTIONS'] === 'true') {
  console.log(`::notice title=Argon2id timing (ADR-0010)::${line}`);
}
