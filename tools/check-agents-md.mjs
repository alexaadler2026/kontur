// AGENTS.md is a map, not an encyclopedia: at most 150 lines (see its section
// "Map, not encyclopedia"). Run: pnpm check:agents-md (also a CI step).
import { readFileSync } from 'node:fs';

const LIMIT = 150;
const text = readFileSync(new URL('../AGENTS.md', import.meta.url), 'utf8');
const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);

if (lines > LIMIT) {
  console.error(
    `AGENTS.md has ${lines} lines (limit ${LIMIT}). Move details to docs/ ` +
      '(ADR → docs/adr, plans → docs/plans, design → docs/design, ' +
      'terms → docs/glossary.md) and link them.',
  );
  process.exit(1);
}
console.log(`AGENTS.md: ${lines} lines (limit ${LIMIT}) — ok`);
