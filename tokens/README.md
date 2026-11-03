# Design tokens

Every colour, size, space, radius, shadow, layer and breakpoint in NEXT GEN comes from this folder. Pages and components never use raw values.

The setup follows what design-system teams typically do:

- **One source of truth in JSON**, written in the [W3C Design Tokens Community Group (DTCG) format](https://www.designtokens.org/): `$value`, `$type`, `$description`, and aliases like `{color.slate.50}`. Figma Variables and Style Dictionary both read this format, so the files can move to those tools later without being rewritten.
- **Three tiers**, the same split used in Material (reference → system → component) and most company design systems:

| Tier | Folder | Named by | Example | Who may use it |
|---|---|---|---|---|
| 1 · Primitive | `primitive/` | What it *is* | `color.teal.500`, `space.200`, `radius.xl` | Only semantic tokens |
| 2 · Semantic | `semantic/` | What it's *for* | `color.text.muted`, `color.success.bg`, `space.stack.default`, `radius.card` | Pages, CSS, components |
| 3 · Component | `component/` | Component + part | `button.radius`, `option.selected-bg` | That component's CSS |

Aliases only point *down* the tiers: semantic → primitive, and component → semantic (never component → primitive). The build script refuses anything else.

- **Generated outputs, never edited by hand:**
  - `app/tokens.css`: every token as a CSS variable. Primitives get a `--ref-` prefix, so a stray `--ref-color-teal-500` stands out.
  - `lib/tokens.ts`: a typed `Token` union, a `token('color-text-muted')` helper, `BREAKPOINTS`, and `RAW` hex values for places that can't read CSS variables (the theme-color meta tag, the web manifest, Razorpay).
- **Enforced in the build:** `npm run build` stops if the generated files are stale or if `npm run lint:tokens` finds raw values.

## Files

```
tokens/
├── primitive/
│   ├── color.json      palette: slate, navy, indigo, teal, red, amber… plus alpha (translucent) colours
│   └── scale.json      space, size, radius, border width, font family/size/weight, line height,
│                       letter spacing, duration, z-index, breakpoints
├── semantic/
│   ├── color.json      bg, text, border, accent, action, success/danger/warning/info, nav, brand, code, category
│   ├── subject.json    each subject's identity colour (keys = ids in content/subjects.json)
│   └── foundation.json font roles, spacing roles (inline/stack/inset), radius roles, sizes, layout widths,
│                       control heights, motion, layers, shadows
└── component/
    └── components.json button, card, input, chip, option, sidebar
```

## Commands

```bash
npm run tokens        # rebuild app/tokens.css and lib/tokens.ts after editing JSON
npm run lint:tokens   # check styles only use tokens; check contrast
```

`npm run dev` rebuilds the tokens on start. `npm run build` checks they're up to date, runs the lint, then builds.

## What the lint checks

`scripts/lint-tokens.mjs` checks `app/**/*.css` (except the generated file) and every `.ts`/`.tsx` in `app/`, `components/` and `lib/` for these:

- **No raw colours:** no `#hex`, `rgb()` or `hsl()`.
- **No primitives:** no `var(--ref-*)`. Use a semantic token.
- **No unknown tokens:** every `var(--x)` must exist. This catches typos and old names.
- **Tokens for core styling:** `font-size`, `font-weight`, `border-radius`, `box-shadow`, `z-index`, and spacing (`margin`, `padding`, `gap`) must use tokens.
- **No hard-coded inline styles:** no spacing, font, radius or colour in `style={{…}}` objects. Use a class from `globals.css`. An inline style that only carries a token, such as `background: subjectColor(id)`, is fine.
- **Breakpoints:** every `@media (max-width)` must use a breakpoint token (600 / 900 / 1100px).
- **Contrast:** key text/background pairs must meet WCAG AA (4.5:1).

## How to…

- **Change a colour everywhere:** change the primitive (e.g. `color.teal.500`), or point the semantic token at a different primitive. Then run `npm run tokens`.
- **Add a new colour role:** add it under `semantic/color.json`, pointing at a primitive. Only add a primitive if the palette is missing the value.
- **Style a new component:**
  1. Use semantic tokens in `app/globals.css`.
  2. If the component needs its own adjustable settings, add a group in `component/components.json`.
  3. For layout in JSX, use the helper classes in `globals.css` (`mt-lg`, `flex-between`, `row-main`, …), not inline styles.
- **Add a subject:** add it to `content/subjects.json` and add `color.subject.<id>.solid` / `.soft` in `semantic/subject.json`. The lint fails until both exist.
- **Add dark mode later:** create a semantic file for the dark theme that points the same semantic names at dark primitives, then emit it under `@media (prefers-color-scheme: dark)` from `build-tokens.mjs`. Components need no changes, because they only use semantic names.

## Breakpoints

CSS can't read variables inside `@media`, so the three breakpoints are tokens that the lint enforces:

| Name | Max width | What changes |
|---|---|---|
| `laptop` | 1100px | 4- and 3-column grids become 2 columns |
| `tablet` | 900px | The sidebar becomes a slide-in drawer; side panels stack under the main column |
| `phone` | 600px | Single column; metrics 2-up; tables marked `.table-stack` become stacked rows; full-width buttons |
