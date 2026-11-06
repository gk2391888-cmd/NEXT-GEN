// Reads the design tokens in tokens/ (W3C Design Tokens Community Group format)
// and resolves them. Shared by build-tokens.mjs and lint-tokens.mjs.
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(dirname(fileURLToPath(import.meta.url)), '..');
export const TIERS = ['primitive', 'semantic', 'component'];

/** Primitives get a `ref-` prefix in CSS so it's obvious (and lint-checkable) when one is used directly. */
export const cssName = (token) => `--${token.tier === 'primitive' ? 'ref-' : ''}${token.path.join('-')}`;

/** All tokens, keyed by dotted path, with tier, type, raw $value and description. */
export function loadTokens() {
  const tokens = new Map();
  for (const tier of TIERS) {
    const dir = join(root, 'tokens', tier);
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
      walk(JSON.parse(readFileSync(join(dir, file), 'utf8')), [], undefined, (path, node, type) => {
        const key = path.join('.');
        if (tokens.has(key)) throw new Error(`Token "${key}" is defined twice (second time in ${tier}/${file})`);
        if (!type) throw new Error(`Token "${key}" has no $type (set it on the token or a parent group)`);
        tokens.set(key, { path, tier, type, value: node.$value, description: node.$description, file: `${tier}/${file}` });
      });
    }
  }
  return tokens;
}

function walk(node, path, inheritedType, visit) {
  const type = node.$type ?? inheritedType;
  if ('$value' in node) return visit(path, node, type);
  for (const [key, child] of Object.entries(node)) {
    if (!key.startsWith('$') && child && typeof child === 'object') walk(child, [...path, key], type, visit);
  }
}

/**
 * A theme's overrides (tokens/theme/<name>.json): semantic colour tokens with a
 * different value in that theme. Each must name an existing semantic colour and
 * alias a primitive, like the semantic tier itself.
 */
export function loadTheme(tokens, name) {
  const file = `theme/${name}.json`;
  const overrides = [];
  walk(JSON.parse(readFileSync(join(root, 'tokens', 'theme', `${name}.json`), 'utf8')), [], undefined, (path, node) => {
    const base = tokens.get(path.join('.'));
    if (!base) throw new Error(`${file}: ${path.join('.')} is not a token`);
    if (base.tier !== 'semantic' || base.type !== 'color') throw new Error(`${file}: ${path.join('.')} must be a semantic colour token`);
    overrides.push({ ...base, value: node.$value, file });
  });
  return overrides;
}

const ALIAS = /^\{([^}]+)\}$/;
const isAlias = (v) => typeof v === 'string' && ALIAS.test(v);

/** The token an alias like "{color.slate.50}" points at, checked against the tier rules. */
function target(tokens, from, alias) {
  const key = alias.match(ALIAS)[1];
  const to = tokens.get(key);
  if (!to) throw new Error(`${from.path.join('.')} (${from.file}) points at unknown token {${key}}`);
  if (TIERS.indexOf(to.tier) > TIERS.indexOf(from.tier)) {
    throw new Error(`${from.path.join('.')} is a ${from.tier} token but points at the ${to.tier} token {${key}}`);
  }
  if (from.tier === 'component' && to.tier === 'primitive') {
    throw new Error(`${from.path.join('.')} is a component token; point it at a semantic token, not the primitive {${key}}`);
  }
  if (from.tier === 'primitive') throw new Error(`${from.path.join('.')} is a primitive; primitives hold raw values, not aliases`);
  return to;
}

const dim = (v) => (typeof v === 'object' && v && 'unit' in v ? `${v.value}${v.unit}` : String(v));

/** CSS for a token's value. Aliases become var() references so the chain survives into the browser. */
export function cssValue(tokens, token) {
  const ref = (v) => (isAlias(v) ? `var(${cssName(target(tokens, token, v))})` : null);
  const v = token.value;
  if (ref(v)) return ref(v);
  switch (token.type) {
    case 'fontFamily':
      return (Array.isArray(v) ? v : [v]).map((f) => (f.startsWith('var(') || !/\s/.test(f) ? f : `'${f}'`)).join(', ');
    case 'shadow': {
      const list = Array.isArray(v) ? v : [v];
      return list.map((s) => [s.offsetX, s.offsetY, s.blur, s.spread].map(dim).join(' ') + ' ' + (ref(s.color) ?? s.color)).join(', ');
    }
    case 'dimension':
    case 'duration':
      return dim(v);
    default:
      return String(v);
  }
}

/** Follows aliases to the final raw value (for contrast checks). */
export function rawValue(tokens, token, seen = new Set()) {
  if (seen.has(token)) throw new Error(`Circular alias at ${token.path.join('.')}`);
  seen.add(token);
  return isAlias(token.value) ? rawValue(tokens, target(tokens, token, token.value), seen) : token.value;
}
