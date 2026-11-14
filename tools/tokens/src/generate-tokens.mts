/**
 * Kontur design tokens → CSS (ADR-0002).
 * Pure function: tokens.json in, CSS text out. No file system, so it is easy to test.
 * The output must equal docs/design/tokens.css rule for rule (golden test).
 */

// ---------- Shape of docs/design/tokens.json (v2) ----------

type ThemeId = string; // e.g. "light", "dark" — listed in color.themes

interface ThemedToken {
  name: string;
  value: Record<ThemeId, string>; // value per theme; "{other}" references another token
}

interface PlainToken {
  name: string;
  value: string;
}

interface FontFile {
  family: string;
  weight: string;
  style: string;
  subset: string; // key in type.fontSubsets.unicodeRanges
  file: string; // relative path, e.g. "fonts/IBMPlexSans-400.woff2"
}

interface TextStyle {
  name: string;
  fontSize: string;
  lineHeight: string;
  fontWeight: number;
  letterSpacing?: string;
  fontVariantNumeric?: string;
}

export interface KonturTokens {
  color: { themes: Array<{ id: ThemeId }>; tokens: ThemedToken[] };
  shadow: { tokens: ThemedToken[] };
  spacing: { tokens: PlainToken[] };
  radius: { tokens: PlainToken[] };
  size: { tokens: PlainToken[] };
  type: {
    fonts: FontFile[];
    fontSubsets: { unicodeRanges: Record<string, string>; files: FontFile[] };
    families: Record<string, string>; // "sans" → font stack; becomes --font-sans
    groups: Array<{ family: string; styles: TextStyle[] }>;
  };
}

// ---------- Generator ----------

// Not design data, but loading policy: show fallback text at once, swap when the font arrives.
const FONT_DISPLAY = 'swap';

const HEADER = `/* Kontur — GENERATED from docs/design/tokens.json by tools/tokens. Do not edit by hand.
   Regenerate: pnpm nx run tokens:generate */`;

/** "{brand}" → "var(--brand)"; any other value is used as is. */
const resolveReference = (value: string): string =>
  value.replace(/^\{([a-z0-9-]+)\}$/, 'var(--$1)');

const block = (selector: string, lines: string[]): string =>
  `${selector} {\n${lines.map((line) => `  ${line}`).join('\n')}\n}`;

const sameFace = (a: FontFile, b: FontFile): boolean =>
  a.family === b.family && a.weight === b.weight && a.style === b.style;

function fontFace(
  font: FontFile,
  unicodeRanges: Record<string, string>,
): string {
  const range = unicodeRanges[font.subset];
  if (range === undefined) {
    throw new Error(
      `No unicode-range for subset "${font.subset}" (${font.file})`,
    );
  }
  const format = font.file.split('.').pop(); // "woff2"
  return (
    `@font-face { font-family: "${font.family}"; font-weight: ${font.weight}; ` +
    `font-style: ${font.style}; font-display: ${FONT_DISPLAY}; ` +
    `src: url("${font.file}") format("${format}"); unicode-range: ${range}; }`
  );
}

/** Each latin face, directly followed by the other subsets of the same family/weight/style. */
function fontFaces(type: KonturTokens['type']): string[] {
  const { unicodeRanges, files: extraSubsets } = type.fontSubsets;
  return type.fonts.flatMap((font) =>
    [font, ...extraSubsets.filter((extra) => sameFace(extra, font))].map(
      (face) => fontFace(face, unicodeRanges),
    ),
  );
}

/** Colours + shadows per theme. The first theme is also the default (:root). */
function themes(tokens: KonturTokens): string[] {
  const themed = [...tokens.color.tokens, ...tokens.shadow.tokens];
  return tokens.color.themes.map(({ id }, index) => {
    const selector =
      index === 0 ? `:root, [data-theme="${id}"]` : `[data-theme="${id}"]`;
    return block(
      selector,
      themed.map((token) => {
        const value = token.value[id];
        if (value === undefined) {
          throw new Error(
            `Token "${token.name}" has no value for theme "${id}"`,
          );
        }
        return `--${token.name}: ${resolveReference(value)};`;
      }),
    );
  });
}

/** Theme-independent tokens: spacing, radius, sizes and font stacks. */
function staticTokens(tokens: KonturTokens): string {
  const plain = [
    ...tokens.spacing.tokens,
    ...tokens.radius.tokens,
    ...tokens.size.tokens,
  ];
  const families = Object.entries(tokens.type.families);
  return block(':root', [
    ...plain.map((token) => `--${token.name}: ${token.value};`),
    ...families.map(([key, stack]) => `--font-${key}: ${stack};`),
  ]);
}

/** One class per text style, e.g. ".h1 { font: 600 32px/40px var(--font-sans); }". */
function textStyles(type: KonturTokens['type']): string[] {
  return type.groups.flatMap((group) =>
    group.styles.map((style) => {
      const declarations = [
        `font: ${style.fontWeight} ${style.fontSize}/${style.lineHeight} var(--font-${group.family});`,
      ];
      if (style.letterSpacing)
        declarations.push(`letter-spacing: ${style.letterSpacing};`);
      if (style.fontVariantNumeric) {
        declarations.push(`font-variant-numeric: ${style.fontVariantNumeric};`);
      }
      return `.${style.name} { ${declarations.join(' ')} }`;
    }),
  );
}

export function generateTokensCss(tokens: KonturTokens): string {
  return (
    [
      HEADER,
      ...fontFaces(tokens.type),
      ...themes(tokens),
      staticTokens(tokens),
      ...textStyles(tokens.type),
    ].join('\n') + '\n'
  );
}

/** Every font file the CSS references (latin + further subsets), in output order. */
export function fontFiles(tokens: KonturTokens): string[] {
  return [...tokens.type.fonts, ...tokens.type.fontSubsets.files].map(
    (font) => font.file,
  );
}
