// Checks that the app's styles go through the design tokens.
// Usage: node scripts/lint-tokens.mjs
//
// - No raw colours (#hex, rgb(), hsl()) in CSS or components.
// - No primitive tokens (--ref-*) outside the generated app/tokens.css.
// - Every var(--name) exists.
// - Spacing, font sizes and weights, radii, shadows and z-index use tokens.
// - @media rules only use the breakpoint tokens.
// - Key text/background pairs meet WCAG AA contrast (4.5:1).
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { cssName, loadTheme, loadTokens, rawValue, root } from './tokens-lib.mjs';

const tokens = loadTokens();
const names = new Set([...tokens.values()].map((t) => cssName(t).slice(2)));
/** Variables that come from outside the token system (next/font). */
const EXTERNAL_VARS = new Set([
  'font-dm-sans',
  'font-jakarta',
  // Per-element inputs set inline by a component (e.g. ProgressRing's percentage and colour token).
  'ring-value',
  'ring-color',
]);
const breakpoints = new Set([...tokens.values()].filter((t) => t.path[0] === 'breakpoint').map((t) => `${t.value.value}px`));

const problems = [];
const report = (file, line, message) => problems.push(`${relative(root, file)}:${line}  ${message}`);

function files(dir, exts) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return files(path, exts);
    return exts.some((e) => name.endsWith(e)) ? [path] : [];
  });
}

const COLOR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?)\(/;
const VAR_REF = /var\(--([a-zA-Z0-9-]+)/g;

function checkVars(file, line, text) {
  for (const [, name] of text.matchAll(VAR_REF)) {
    if (name.startsWith('ref-')) report(file, line, `uses primitive token --${name}; use a semantic token instead`);
    else if (!names.has(name) && !EXTERNAL_VARS.has(name)) report(file, line, `unknown token --${name}`);
  }
}

/* ---------------- CSS ---------------- */
const TOKEN_ONLY = ['font-size', 'font-weight', 'border-radius', 'box-shadow', 'z-index'];
const SPACING = /^(margin|padding|gap|row-gap|column-gap)(-(top|right|bottom|left|inline|block))?$/;

for (const file of files(join(root, 'app'), ['.css']).filter((f) => !f.endsWith('tokens.css'))) {
  readFileSync(file, 'utf8').split('\n').forEach((text, i) => {
    const line = i + 1;
    const code = text.replace(/\/\*.*?\*\//g, '');
    if (COLOR_LITERAL.test(code)) report(file, line, 'raw colour; use a --color-* token');
    checkVars(file, line, code);

    const media = code.match(/@media[^{]*max-width:\s*([\d.]+px)/);
    if (media && !breakpoints.has(media[1])) report(file, line, `breakpoint ${media[1]} isn't a token (${[...breakpoints].join(', ')})`);

    for (const [, prop, value] of code.matchAll(/(?:^|[;{\s])([a-z-]+)\s*:\s*([^;{}]+)/g)) {
      // Allowed without a token: var()/calc(), zeros, `inset`, relative em sizes and print pt sizes.
      const literal = value
        .replace(/var\([^)]*\)/g, '')
        .replace(/calc\([^)]*\)/g, '')
        .replace(/\b\d*\.?\d+(em|pt)\b/g, '')
        .replace(/(^|\s)(inset|0)(?=\s|$)/g, ' ');
      if (TOKEN_ONLY.includes(prop) && /\d/.test(literal)) {
        report(file, line, `${prop}: ${value.trim()} — use a token`);
      }
      if (SPACING.test(prop) && /\d+(\.\d+)?px/.test(literal)) report(file, line, `${prop}: ${value.trim()} — use a --space-* token`);
    }
  });
}

/* ---------------- Components ---------------- */
const STYLE_PROPS = /\b(margin\w*|padding\w*|gap|rowGap|columnGap|fontSize|font|fontWeight|fontFamily|borderRadius|letterSpacing|lineHeight|boxShadow|zIndex|color|background\w*|border\w*)\s*:\s*(?:(['"`])([^'"`]*)\2|(-?\d[\d.]*))/g;

for (const file of [...files(join(root, 'app'), ['.tsx', '.ts']), ...files(join(root, 'components'), ['.tsx', '.ts']), ...files(join(root, 'lib'), ['.tsx', '.ts'])]) {
  if (file.endsWith(join('lib', 'tokens.ts'))) continue;
  readFileSync(file, 'utf8').split('\n').forEach((text, i) => {
    const line = i + 1;
    const strings = [...text.matchAll(/(['"`])((?:(?!\1).)*)\1/g)].map((m) => m[2]);
    if (strings.some((s) => /^#[0-9a-fA-F]{3,8}$/.test(s.trim()) || /\b(?:rgba?|hsla?)\(/.test(s))) report(file, line, 'raw colour; use a token');
    checkVars(file, line, text);
    if (!text.includes('style={{')) return;
    const style = text.slice(text.indexOf('style={{'));
    for (const [, prop, , str, num] of style.matchAll(STYLE_PROPS)) {
      const value = str ?? num;
      if (value === undefined || value === '0' || value.includes('var(') || /^(none|inherit|auto|transparent)$/.test(value)) continue;
      report(file, line, `inline style ${prop}: ${value} — use a class or token`);
    }
  });
}

/* ---------------- Subjects ---------------- */
for (const { id } of JSON.parse(readFileSync(join(root, 'content', 'subjects.json'), 'utf8'))) {
  for (const variant of ['solid', 'soft']) {
    if (!names.has(`color-subject-${id}-${variant}`)) problems.push(`tokens  subject "${id}" has no color.subject.${id}.${variant} token (tokens/semantic/subject.json)`);
  }
}

/* ---------------- Contrast ---------------- */
const THEMES = { light: new Map(), dark: new Map(loadTheme(tokens, 'dark').map((t) => [t.path.join('.'), t])) };
const hex = (key, theme) => {
  const t = THEMES[theme].get(key) ?? tokens.get(key);
  if (!t) throw new Error(`Contrast check: unknown token ${key}`);
  return rawValue(tokens, t);
};
function luminance(h) {
  const n = h.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
const ratio = (a, b) => {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};
const PAIRS = [
  ['color.text.primary', 'color.bg.surface'],
  ['color.text.body', 'color.bg.surface'],
  ['color.text.secondary', 'color.bg.surface'],
  ['color.text.muted', 'color.bg.surface'],
  ['color.text.muted', 'color.bg.canvas'],
  ['color.text.link', 'color.bg.surface'],
  ['color.action.primary.fg', 'color.action.primary.bg'],
  ['color.text.inverse', 'color.accent.solid'],
  ['color.text.inverse', 'color.danger.emphasis'],
  ['color.accent.on-soft', 'color.accent.soft'],
  ['color.success.fg', 'color.success.soft'],
  ['color.success.fg-strong', 'color.success.bg'],
  ['color.success.text', 'color.bg.surface'],
  ['color.danger.fg', 'color.danger.soft'],
  ['color.danger.fg-strong', 'color.danger.bg'],
  ['color.warning.fg', 'color.warning.bg'],
  ['color.warning.fg-strong', 'color.warning.bg'],
  ['color.info.fg', 'color.info.bg'],
  ['color.nav.text', 'color.nav.bg'],
  ['color.nav.text-muted', 'color.nav.bg'],
  ['color.nav.text-active', 'color.nav.bg-active'],
  ['color.text.primary', 'color.bg.canvas'],
  ['color.text.inverse', 'color.feature.start'],
  ['color.selected.fg', 'color.selected.bg'],
  ['color.offer.cta-fg', 'color.offer.cta-bg'],
  ['color.offer.ribbon-fg', 'color.warning.solid'],
  ['color.text.inverse-muted', 'color.brand.hero-start'],
];
for (const theme of Object.keys(THEMES)) {
  for (const [fg, bg] of PAIRS) {
    const r = ratio(hex(fg, theme), hex(bg, theme));
    if (r < 4.5) problems.push(`tokens  [${theme}] ${fg} on ${bg} has contrast ${r.toFixed(2)}:1 (needs 4.5:1)`);
  }
}

if (problems.length) {
  console.log(`✗ ${problems.length} design-token problem(s):`);
  for (const p of problems) console.log(`   ${p}`);
  process.exit(1);
}
console.log(`✓ Styles use design tokens (${names.size} tokens, ${PAIRS.length} contrast pairs pass AA in light and dark)`);
