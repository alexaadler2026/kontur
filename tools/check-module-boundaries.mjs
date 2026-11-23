// Permanent test of the platform rule (ADR-0007): the browser never imports server code.
// ESLint lints a one-line probe as if it lived in a frontend and in an API, by package
// name — the way real code imports @adlersoft/api-kit (a pnpm workspace package, ADR-0007).
// Before task 6 this was proven only by a recorded mutation (journal 026).
// Run: pnpm check:module-boundaries (also a CI step).
import { createProjectGraphAsync } from '@nx/devkit';
import { ESLint } from 'eslint';

const RULE = '@nx/enforce-module-boundaries';
const probe = `import { ProblemFilter } from '@adlersoft/api-kit';\nexport const probe = ProblemFilter;\n`;
const cases = [
  { file: 'apps/signflow/src/app/boundary-probe.ts', expectError: true },
  { file: 'apps/signflow-api/src/boundary-probe.ts', expectError: false },
];

// The rule reads the cached Nx project graph; make sure it exists and is current.
await createProjectGraphAsync({ exitOnError: true });
const eslint = new ESLint();

const problems = [];
for (const { file, expectError } of cases) {
  const [result] = await eslint.lintText(probe, { filePath: file });
  const errors = result.messages.filter((m) => m.ruleId === RULE);
  if (errors.length > 0 !== expectError) {
    problems.push(
      `${file}: expected ${expectError ? 'an' : 'no'} ${RULE} error, got ` +
        (errors.map((m) => m.message).join(' | ') || 'none'),
    );
  }
}

if (problems.length > 0) {
  console.error(problems.join('\n'));
  process.exit(1);
}
console.log(
  `${RULE}: frontend import of @adlersoft/api-kit rejected, API import allowed - ok`,
);
