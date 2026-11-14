/**
 * Writes the generated Kontur CSS + fonts into libs/ui, or checks they are up to date.
 *
 *   node tools/tokens/src/cli.mts           → generate (nx run tokens:generate)
 *   node tools/tokens/src/cli.mts --check   → exit 1 if libs/ui is out of date (nx run tokens:check, CI)
 *
 * Runs directly on Node 24: Node strips the TypeScript types (tsconfig: erasableSyntaxOnly).
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  fontFiles,
  generateTokensCss,
  type KonturTokens,
} from './generate-tokens.mts';

const root = new URL('../../../', import.meta.url);
const designDir = new URL('docs/design/', root);
const stylesDir = new URL('libs/ui/src/styles/', root);
const fontsDir = new URL('fonts/', stylesDir);
const cssFile = new URL('tokens.css', stylesDir);

const tokens = JSON.parse(
  readFileSync(new URL('tokens.json', designDir), 'utf8'),
) as KonturTokens;
const css = generateTokensCss(tokens);
const fonts = fontFiles(tokens); // e.g. "fonts/IBMPlexSans-400.woff2"

/** Lists what differs between the expected output and the files in libs/ui. */
function findDrift(): string[] {
  const drift: string[] = [];
  if (!existsSync(cssFile) || readFileSync(cssFile, 'utf8') !== css) {
    drift.push('tokens.css');
  }
  for (const font of fonts) {
    const target = new URL(font, stylesDir);
    const source = new URL(font, designDir);
    if (
      !existsSync(target) ||
      !readFileSync(target).equals(readFileSync(source))
    ) {
      drift.push(font);
    }
  }
  const expected = new Set(fonts.map((font) => basename(font)));
  const present = existsSync(fontsDir) ? readdirSync(fontsDir) : [];
  for (const file of present.filter((name) => !expected.has(name))) {
    drift.push(`fonts/${file} (not in tokens.json)`);
  }
  return drift;
}

function generate(): void {
  mkdirSync(stylesDir, { recursive: true });
  writeFileSync(cssFile, css);
  rmSync(fontsDir, { recursive: true, force: true }); // only fonts listed in tokens.json
  mkdirSync(fontsDir);
  for (const font of fonts) {
    writeFileSync(
      new URL(font, stylesDir),
      readFileSync(new URL(font, designDir)),
    );
  }
  console.log(
    `Generated ${fileURLToPath(cssFile)} and ${fonts.length} font files.`,
  );
}

if (process.argv.includes('--check')) {
  const drift = findDrift();
  if (drift.length > 0) {
    console.error(
      `tokens.css is out of date — run: pnpm nx run tokens:generate\nDiffers: ${drift.join(', ')}`,
    );
    process.exit(1);
  }
  console.log('Design tokens in libs/ui are up to date.');
} else {
  generate();
}
