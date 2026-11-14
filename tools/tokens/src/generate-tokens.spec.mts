import { readFileSync } from 'node:fs';
import postcss, { type ChildNode } from 'postcss';
import { describe, expect, it } from 'vitest';
import { generateTokensCss, type KonturTokens } from './generate-tokens.mts';

// Inputs: the design-system snapshot. The reference CSS is the acceptance criterion:
// the generator must reproduce it rule for rule (docs/design/README.md).
const designDir = new URL('../../../docs/design/', import.meta.url);
const tokens = JSON.parse(
  readFileSync(new URL('tokens.json', designDir), 'utf8'),
) as KonturTokens;
const referenceCss = readFileSync(new URL('tokens.css', designDir), 'utf8');

/** One top-level CSS rule, reduced to what matters: what it targets and which declarations it has. */
interface NormalizedRule {
  target: string; // "@font-face" or a selector list like ':root, [data-theme="light"]'
  declarations: Array<[property: string, value: string]>;
}

const collapse = (text: string): string => text.replace(/\s+/g, ' ').trim();

/** Parses CSS with postcss and normalizes whitespace, so only real differences count. */
function normalize(css: string): NormalizedRule[] {
  return postcss
    .parse(css)
    .nodes.filter((node: ChildNode) => node.type !== 'comment')
    .map((node: ChildNode): NormalizedRule => {
      if (node.type !== 'rule' && node.type !== 'atrule') {
        throw new Error(`Unexpected top-level node: ${node.type}`);
      }
      const target =
        node.type === 'atrule'
          ? collapse(`@${node.name} ${node.params}`)
          : node.selectors.map(collapse).join(', ');
      const declarations: Array<[string, string]> = [];
      node.walkDecls((decl) => {
        declarations.push([decl.prop, collapse(decl.value)]);
      });
      return { target, declarations };
    });
}

const reference = normalize(referenceCss);
const generated = normalize(generateTokensCss(tokens));

const declarationsOf = (
  rules: NormalizedRule[],
  target: string,
): Map<string, string> =>
  new Map(
    rules
      .filter((rule) => rule.target === target)
      .flatMap((rule) => rule.declarations),
  );

describe('generateTokensCss — golden test against docs/design/tokens.css', () => {
  it('reproduces the reference CSS rule for rule', () => {
    expect(generated).toEqual(reference);
  });

  it('emits 10 font faces: latin + cyrillic for each family/weight, each with its unicode-range', () => {
    const faces = generated.filter((rule) => rule.target === '@font-face');
    const { unicodeRanges } = tokens.type.fontSubsets;

    expect(faces).toHaveLength(10);
    for (const face of faces) {
      const decls = new Map(face.declarations);
      const isCyrillic = decls.get('src')?.includes('-cyrillic.woff2') ?? false;
      expect(decls.get('unicode-range')).toBe(
        collapse(
          isCyrillic ? unicodeRanges['cyrillic'] : unicodeRanges['latin'],
        ),
      );
    }
  });

  it('emits every colour and shadow token for both themes', () => {
    const light = declarationsOf(generated, ':root, [data-theme="light"]');
    const dark = declarationsOf(generated, '[data-theme="dark"]');
    const names = [...tokens.color.tokens, ...tokens.shadow.tokens].map(
      (t) => `--${t.name}`,
    );

    expect(names).toHaveLength(29); // tokens v4: 27 colours (+ error-hover, error-active) + 2 shadows
    expect([...light.keys()]).toEqual(names);
    expect([...dark.keys()]).toEqual(names);
    expect(light.get('--brand')).toBe('#0e5a6b');
    expect(dark.get('--brand')).toBe('#4fb3c4');
    expect(light.get('--focus-ring')).toBe('var(--brand)'); // "{brand}" reference
    // v3 alias in both themes (dark knob contrast fix)
    expect(light.get('--switch-knob')).toBe('var(--text-on-brand)');
    expect(dark.get('--switch-knob')).toBe('var(--text-on-brand)');
    // v4: danger hover/active are tokens; lighter than --error in the dark theme (dark text on them)
    expect(light.get('--error-hover')).toBe('#9a1d14');
    expect(dark.get('--error-hover')).toBe('#f58f88');
    expect(light.get('--error-active')).toBe('#7f1810');
    expect(dark.get('--error-active')).toBe('#f8aba5');
  });

  it('emits all text-style classes incl. letter-spacing and tabular figures', () => {
    const styleNames = tokens.type.groups.flatMap((group) =>
      group.styles.map((s) => s.name),
    );
    const classes = generated.filter((rule) => rule.target.startsWith('.'));

    expect(classes.map((rule) => rule.target)).toEqual(
      styleNames.map((name) => `.${name}`),
    );
    expect(declarationsOf(generated, '.label').get('letter-spacing')).toBe(
      '0.02em',
    );
    expect(declarationsOf(generated, '.mono').get('font-variant-numeric')).toBe(
      'tabular-nums',
    );
    expect(
      declarationsOf(generated, '.mono-sm').get('font-variant-numeric'),
    ).toBe('tabular-nums');
  });
});
