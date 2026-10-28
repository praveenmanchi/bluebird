# Design-system pipeline: Figma variables → code, with Storybook as the contract

**Goal.** No hardcoded visual values anywhere in the UI. Every colour, size, radius, spacing and type
value is a Figma variable. Changing a variable in Figma and re-running the pipeline re-skins the
plugin and every Storybook story. Five brands (Bridge, Ikea, Richemont, Disney, Fiskars) are the five
modes of the Figma **Brand UI** collection; the plugin picks one in `plugin.config.json → brand.active`.

```
Figma file WWRcH8IPLJ4iQVyoK9oDnH
 ├─ Foundations (375 vars, 1 mode)    ─┐   shared scales + <brand>/color/* and <brand>/type/family/* per brand
 ├─ Semantics   (58 vars, 1 mode)     ─┤   npm run figma:pull          figma/tokens.json
 ├─ Brand UI    (421 vars × 5 modes)  ─┘   (relay or REST)        →    figma/components.json
 └─ Component pages: sets + bindings ────────────────────────────→    figma/icons.json
                                                                          │
                                                        npm run gen:tokens│
                                                                          ▼
   src/shared/brand/generated/  base.css (Foundations + Semantics, :root) · brand.<id>.css (Brand UI mode) · derived.css · all.css · active.css · tokens.ts
   src/shared/ui/Icon/generated.ts
                                                                          │
              components read ONLY var(--bb-*)  ◄────────────────────────┤
              Storybook loads all.css + brand toolbar                     │
              plugin loads active.css + <html data-brand>                 │
                                                                          ▼
   npm run tokens:check   (CI gate: stale generated files · unknown vars · raw values · Figma bindings
                           not consumed · derived geometry not consumed · Figma props not mapped)
   npm run figma:diff     (what moved in Figma since the last pull, without overwriting the snapshot)
   npm run figma:visual   (Figma's render of each variant next to Storybook's, per brand)
```

## Layers and who owns what

| Layer | Where | Owner | Changes when |
|---|---|---|---|
| Variables + component bindings | Figma | Design | A token value or a component binding changes |
| Snapshot | `figma/*.json` | `npm run figma:pull` | Never by hand |
| Generated CSS/TS | `src/shared/brand/generated/`, `src/shared/ui/Icon/generated.ts` | `npm run gen:tokens` | Never by hand |
| Components | `src/shared/ui/<Name>/` (`.tsx`, `.css`, `figma.ts`, `.stories.tsx`, `.test.tsx`) | Engineering | Structure/behaviour changes; **never** for a colour/size change |
| Tailwind bridge | `src/shared/brand/theme.css` | Engineering | A new semantic utility is needed by tabs |
| Brand selection | `plugin.config.json → brand.active` | Product | Shipping a different brand |

## Variable layering (2026-09-23, revised the same day)

The brand switch lives in **Brand UI**, the collection design edits. Semantics is single-mode and
holds only brand-neutral scales, so a brand change is one place: a Brand UI mode.

| Collection | Modes | Holds | Aliases |
|---|---|---|---|
| Foundations | 1 | Shared scales (`dimension/*`, `type/size\|line\|weight\|tracking/*`, `color/alpha/*`, `color/category/*`) and one namespace per brand: `<brand>/color/brand/primary\|secondary\|neutral\|base`, `<brand>/color/primary\|secondary/50–900`, `<brand>/color/neutral/0–1000`, `<brand>/color/status/success\|warning\|danger\|info/100–900`, `<brand>/type/family/ui\|display\|mono`. The ramp step that carries the seed colour is suffixed `-brand` (`ikea/color/primary/600-brand`). | Raw values |
| Semantics | 1 (`Value`) | The 58 brand-neutral intent tokens: `space/*`, `radius/*`, `size/*`, `border-width/*`, `font/size\|line\|weight-*`, `a11y/category-*`, `surface/transparent`, `border/on-accent` | Foundations only |
| Brand UI | Bridge · Ikea · Richemont · Disney · Fiskars | **Tier 1, app tokens** (34): `surface/*`, `text/*`, `border/*`, `icon/default\|muted\|on-accent`, `feedback/*`, `font/family-ui\|display\|brand`, `a11y/accent*`. **Tier 2, component tokens** (387): `button/*`, `input/*`, … | Tier 1 → that brand's Foundations namespace per mode. Tier 2 colours → tier 1 (same collection, same mode); tier 2 numerics → Semantics, with a different Semantics token per mode where a brand genuinely differs (Ikea/Disney pill radius, brand font weights). |

The tiers are a naming convention inside one collection, not two collections, so Figma's Appearance
panel shows a single mode picker. `tokens:check` enforces the layering (`checkLayering`): Semantics
must stay single-mode and alias Foundations only. The generator separately refuses a name that
exists in two collections.

Adding a brand = one Foundations namespace + one Brand UI mode: Figma copies every alias from the
default mode, then 34 tier 1 aliases and ~40 per-brand tier 2 aliases are re-pointed. Components
and Semantics never change.

Code mirrors this: `base.css` carries Foundations **and** Semantics on `:root`; each
`brand.<id>.css` carries that brand's Brand UI mode under `[data-brand]`, so `--bb-surface-canvas`
switches with the brand. Component CSS reads Brand UI tokens or Semantics scales, never a brand
namespace directly. CSS names are unchanged by the move (`text/primary` is still `--bb-text-primary`).

Naming is mechanical: Figma `button/primary/bg/default` → CSS `--bb-button-primary-bg-default`.
FLOATs become `px` except weights and opacities; font families are quoted.

## Component contract

Each folder mirrors one Figma component set (ids live in `figma/manifest.json`):

- `Name.css` uses only `var(--bb-…)`. `tokens:check` fails on any hex, `rgb()`, `px` or named colour. Motion is the one exception, marked `/* allow-raw */`.
- `figma.ts` maps Figma props → code props and lists `figmaGaps`: tokens the Figma set binds that the code intentionally does not read, each with a reason. Anything not listed there must be consumed, or CI fails. Every key of the set's `componentPropertyDefinitions` must appear in `props` (or `gapProps`, or `propGaps` when it maps to a composed child rather than a code prop), and each mapping must name a real prop of `<Code>Props` — so a property added in Figma cannot pass unnoticed. `setId` is checked against both `figma/components.json` and `figma/manifest.json`.
- `derivedGaps` is the same idea for the generated `--bb-derived-*` geometry: raw widths, paddings and gaps the component deliberately does not read. The 369 that no component reads today are recorded **with their values** in `figma/derived-baseline.json`; when Figma later moves one of those values the gate raises `derived-token-drifted`, because a design change reaching no code is exactly the drift this is for. The baseline only shrinks — `derived-baseline-stale` fires on an entry that is now read or no longer generated.
- `Name.stories.tsx` has one story per Figma variant, tagged `parameters.figma.variant = 'Type=Primary, State=Default'`. `tests/tokens/figma-story-coverage.test.ts` fails when a Figma variant has no story. `Matrix` mirrors the component-set frame; `AcrossBrands` mirrors the Figma "across brands" sections.
- Forced states for visual tests: `state="hover"` (`[data-state="hover"]` selects the same rules as `:hover`).

Values still hardcoded *in Figma* (e.g. disabled opacity 0.55, checkbox mark stroke 2) are emitted as
`--bb-derived-*` in `derived.css` so the code never hardcodes them either. When design promotes one to a
real variable, the generator moves it and `tokens:check` points at the code to update.

## Roadmap

### Phase 0 — done (2026-09-21)
- Snapshot of all 615 variables (5 brands resolved), node-level bindings for the 5 token-bound sets, coverage audit of the other 41 components, icon exports.
- Generator, drift gate, pull script (relay + REST backends), Storybook 10 with a Brand toolbar.
- Components built 1:1 from Figma bindings: **Button, Checkbox, Menu item, Dropdown, Dropdown menu, Icon, Banner, BrandLogo**. The shell header is the Figma Banner; tab bar and canvas sit on `tab/*` and `card-variable/*` tokens.
- Brand logos are artwork (`figma/logos/*.svg`, exported from the "brand logos" set). The Figma variable `brand logos` picks the variant per mode; in code `[data-brand]` reveals the matching `<BrandLogo>`. The plugin bundle inlines only the active brand's logo through the `@logos` alias (Storybook and tests load all five).
- `npm run verify` = typecheck + lint + tokens:check + tests + build.

### Phase 1 — automate the loop
0. **Drift report: done (2026-09-23).** `npm run figma:diff` pulls into memory, never touching `figma/*.json`, and prints what moved since the last pull grouped by component — variables per mode, component properties, variants, layers, bindings, raw geometry — each annotated with the generated CSS var it lands on and whether any component reads it. `figma/drift.json` carries the same as data. Exit 2 (pull failed) is distinct from exit 1 (`--fail-on-drift`) so CI never calls a dead relay "drift". `/figma-sync` drives the whole loop: diff → review → edit → pull → gate.
0b. **The Enterprise gate on REST, and the way round it (2026-09-23).**
   `GET /v1/files/:key/variables/local` is Enterprise-only, and without it REST returns node
   bindings as ids (`VariableID:40000012:5102`) with no way to name them — so a REST diff reported
   every layer as rebound (2426 findings on a file with 16 real changes). Two independent problems
   and two fixes:

   1. **Naming.** Figma variable ids are stable for the life of the file, so `extract.ts` now
      records `id` alongside `name` in `figma/tokens.json`. One relay pull seeds the map and every
      later REST pull resolves bindings from it offline. Variables created or deleted since that
      pull are unknown ids, and are reported rather than silently labelled `lib:`.
   2. **Extractor parity.** `extract.ts` and the REST `describe()` are two implementations of one
      contract, and they had diverged: fills/strokes recorded as `'RAW'` instead of the hex, sizes
      rounded to integers instead of one decimal, no instance-override walk, no `cp`, and instance
      identity as a raw `componentId` instead of the main component's name. All now mirror
      `extract.ts`, sharing its `OVERRIDE_KEYS` and `pruneToOverrides` so a third copy cannot drift.

   Until parity is **measured**, `figma:diff` refuses to compare layers across backends and says so.
   `npm run figma:parity` pulls both at the same moment and diffs them: every finding is an
   extractor difference, never a design change. Zero is the licence to pass
   `--allow-cross-extractor`. That refusal is the guard against re-shipping the 2426-finding bug.

0c. **Enterprise REST, two tiers (2026-09-24).** The file moved to an Enterprise org
   (`JPZ7koqomjcjczGQuhIMVH`), so `--rest` is now fully headless. The REST backend lives in
   `scripts/figma-rest/` and runs in one of two tiers, auto-detected and printed on every pull:

   | Tier | Needs | Variables | Components, props, bindings, sizes, coverage, icons |
   |---|---|---|---|
   | **enterprise** | PAT with `file_content:read` + `file_variables:read` | live from `/variables/local`, with `publishKey`, `description`, `scopes`, `codeSyntax`; library variables named | REST |
   | **professional** | PAT with `file_content:read` | relay if up, else committed `tokens.json` (flagged stale); bindings named from recorded ids, library variables stay `lib:<id>` | REST |

   `--tier enterprise` fails instead of falling back; `--tier professional` skips `/variables/local`
   on purpose. A 403 says whether the *plan* or the *token scope* is missing.

   Every snapshot layer now records its Figma node `id` (instances also `mc`, the main component
   id, and `st`, applied style names); sets and variants record their publish `key`; both
   snapshots record the file `version`, and `--version <id>` pulls exactly that version.
   `figma:diff` matches layers by id first — renames are exact, a renamed container is one
   finding — and falls back to the path heuristics only for snapshots without ids.

   Each REST pull also walks the component pages: coverage is recomputed live (it used to be
   copied from the last relay pull), sets the manifest does not map are listed, and a manifest
   entry whose node id vanished is followed to the unique set with the same Figma name
   (`--fix-manifest` records the new id). Parity fixes that made REST match the relay exactly:
   REST-nested bindings (`size`, `rectangleCornerRadii`, `individualStrokeWeights`) flattened to
   plugin keys, font style from `fontStyle` rather than the often-null PostScript name, mixed text
   runs and per-side stroke weights treated as `figma.mixed`, rotated and tilted LINE sizes
   measured pre-rotation.

1. Pull backend: the relay backend is proven (2026-09-22: full pull of 621 variables, 49 sets and the Tab Icons set in ~45 s). Flow: `npm run dev:live` → `npm run dev:relay` → in Figma desktop run the plugin (the live build opens the bridge panel) → `npm run figma:pull` → `npm run gen:tokens && npm run tokens:check`. The pull keeps the code-side bookkeeping (`status`/`aliasOf`, tiers, hand-exported glyphs). `--rest` needs a personal access token; `/variables/local` additionally needs Enterprise, but see 0b — after one relay pull, REST resolves bindings from the recorded variable ids. Variable *values* still need the relay (or Enterprise); components, properties, bindings and geometry do not.
2. CI job: `figma:pull → gen:tokens → tokens:check → test → build-storybook`, opening a PR when `figma/*.json` changed. Storybook is the review surface for the diff.
3. Visual parity: **done (2026-09-23)** — `npm run figma:visual` exports each variant via `GET /v1/images/:key?ids=…` (all plans, `FIGMA_TOKEN` only), screenshots the paired story per brand with Playwright, and pixelmatches the two into `figma/visual/report.html`. Pairing comes from `parameters.figma.setId`/`.variant` read out of Storybook's own preview at runtime — index.json carries no parameters, and story names ("Primary Default") do not resemble variant names ("Type=Primary, State=Default, Size=Medium"), so name-guessing pairs under half of them. All 107 variants pair. It reports only by default and stays out of `npm run verify`: Figma rasterises text itself, so the percentage is a sort order, not a verdict — it earns its keep on structural drift (wrong size, moved element, missing layer).

**Tier pages (2026-10-12).** The file now keeps its main components on one page per tier:
Atoms, Molecules, Organisms and Icons. Molecules and organisms are filed in one section per tab, and
each component sits inside a `Doc/<Name>` frame. `figma/manifest.json` lists them under
`componentPages`. Both extractors resolve them through `src/shared/brand/componentPages.ts`:

- Pages are matched by id, then by name (ids can change on a branch merge).
- When the file has none of them, the extractors fall back to the legacy `componentsPage`.
- A file that has only some of them is an error, because it would silently drop components.

Coverage rows on tier pages count every main component. `section` is the tier and `group` is the
tab. The snapshot records every walked page under `pages`.

### Phase 2 — components built, Figma bindings still to close (2026-09-21)
Every component set on the Components page now has a code counterpart under `src/shared/ui` (38 built, 11 aliases). `figma/components.json` carries `status: built | alias` per set; `alias` sets are covered by another component (`aliasOf`): the six icon-only sets and the toolbar/section icons feed the `Icon` glyph table (`figma/icons.json`, 69 glyphs), `brands` / integration logos feed `BrandLogo` (`figma/logos/*.svg`), and the duplicates ButtonWrapper→Button, TabLegacy→Tab, SelectFieldLabeled→SelectField, CountBadgeIcon→CountBadge are folded into props.

**Instance overrides are part of the snapshot (2026-09-22).** For every instance inside a set, the extractor records the layers the instance overrides (Figma `overriddenFields`) as extra nodes flagged `o`, carrying only the overridden bindings and raw values. The generator emits derived tokens for those raw values and the gate enforces the bound ones, so a footer that recolours its size-expander step to `app-header/bg/default` shows up as drift until the component reads that token. Everything else inside an instance still belongs to the instance's own set.

Where Figma still hardcodes a value, the component reads a `--bb-derived-*` token generated from the raw value (`src/shared/brand/generated/derived.css`, 650 declarations). Binding the variable in Figma and re-pulling moves the value into `brand.*.css` with no code change. `npm run tokens:map` → [figma-token-mapping.md](./figma-token-mapping.md) lists, per component, every raw value and the existing variable that already carries it (444 raw values, 68 distinct values with no variable yet). Each component's `figma.ts` records `figmaGaps` (bound variables the code deliberately does not read, with the reason) and `notes` (design quirks found while building).

| Tier | Components |
|---|---|
| Atoms | Button, Checkbox, Icon, BrandLogo, SizeStep, Rating, ConnectionBadge, ChangeStatus, DisabilityIndicator, PrincipleTag, StatusPill |
| Molecules | MenuItem, Dropdown, DropdownMenu, SizeExpander, Chip, InfoMeta, CountBadge, ThemeChip, StatTile, PageFilter, Input, SearchBar, Toggle, ButtonGroup, SectionHeader, SelectField, Tab, FilterDropdown, SegmentTab, SegmentedControl, VariableCard, VariableCardExpanded |
| Organisms | Banner, Footer, Navbar, WcagCard, TeamBanner, PersonaCard |

Screens (`Login Page` 40000100:13204, `Settings page` 40000100:13084) are snapshotted like sets, as single-variant frames with `dir: src/shell`; their raw values (28px title, gaps, the scaled HCL mark) become `--bb-derived-login-screen-*` / `--bb-derived-settings-screen-*`, and their bindings are enforced by the gate with the composed components declared as gaps in `<Code>.figma.ts`. Since 2026-09-22 every brand ships (access-code login picks it at runtime), so `index.css` imports `all.css` and `@logos` is never trimmed.

The legacy primitives and their raw light palette are gone (2026-09-22). `EmptyState` remains as a token-only component on `empty-state/*` without a Figma set; everything else maps to a set.

Bundle: the single-file plugin UI is ~488 KB; the plugin ships only the glyphs referenced from `src/` and `plugin.config.json` (`Icon/generated.active.ts` via the `@icons` alias; Storybook and tests load the full table) (budget 520 KB in `scripts/check-size.ts`): ~85 KB icon glyphs, ~55 KB artwork, the rest components + tokens. SVG path data is rounded to two decimals by the generator; a simplified Bridge wordmark in Figma or per-tab code splitting are the next levers.

### Phase 3 — tabs composed from components
New tabs (see `docs/adding-a-tab.md`) use only `@shared/ui` components and Tailwind utilities from `theme.css`. `tokens:check` can then be widened from `src/shared/ui` + `src/shell` to `src/features`.

## Findings from the Figma file worth fixing in Figma

0. **Banner (40000064:9910) is ~27 % bound.** Title/tagline fills are raw white (use `Banner/Text`), three fonts are raw (MuseoModerno, IBM Plex Sans, Michroma; `type/family/museo` already exists), all spacing is raw, and the layers are unnamed (`Frame 1430102689`…), so the derived tokens carry those names. A sixth Brand mode literally called **"Mode"** appeared (values copy Fiskars); the snapshot ignores it, delete or name it. The Bridge logo is outlined text (49 KB) and dominates the plugin bundle; a simplified asset would help.

1. ~~Semantics has a single mode.~~ Semantics gained five brand modes on 2026-09-23 and lost them again the same day: the 34 brand-varying tokens moved into Brand UI (tier 1) so design edits one collection. Still open: per-brand *shape* tokens (`radius/control`, `radius/card`, `font/weight-ui`) in tier 1 so the ~40 numeric tier 2 tokens that alias a different Semantics scale per brand stop doing so individually.
2. **Icon vectors are bound to `icon/glyph/default`** even inside Button and Dropdown, although `button/*/icon/color` and `dropdown/chevron/color` exist. Rebind the vectors; the `figmaGaps` entries in `Button/figma.ts` and `Dropdown/figma.ts` can then be deleted (CI will insist).
3. **Disabled opacity, checkbox mark stroke/dash geometry** are raw in the components (see `derived.css`). Add `*/disabled/opacity`, `checkbox/mark/stroke-width` variables.
4. `border-width/*` tokens exist but stroke weights on the component roots are not bound to them.
5. Font weights: variables named `…/font-weight` were FLOATs emitted with `px` until 2026-09-21 (fixed in `cssValueFor`); the Figma side is fine.
6. Font: `font/family-ui` resolves to **Noto Sans** in every brand; `font/family-display` is MuseoModerno (Bridge) and Noto Serif (Richemont) as placeholders until design confirms the brand faces. The plugin now loads it from Google Fonts (`manifest.json → networkAccess`). If the plugin must stay offline, ship the font subset or accept the system fallback.

### Extractor note (2026-09-23)
Alias resolution is mode-**name** based: a hop from Brand UI "Ikea" into another collection uses that collection's "Ikea" mode when it has one and its default mode otherwise (single-mode Semantics and Foundations). A same-collection alias (Brand UI tier 2 → tier 1) stays in the same mode. `extract.ts` and the REST `describe()` both do this; the old id-based lookup silently resolved every mode to Bridge once Semantics gained modes.

Since 2026-09-24 the REST components pull matches the relay extractor on every set (see 0c), so a REST pull may be committed. The committed snapshot records `source: figma-rest`; re-run `npm run figma:parity` (needs the relay) after any change to either extractor.

## Commands

```bash
npm run figma:diff            # what changed in Figma since the last pull (writes nothing but figma/drift.json)
npm run figma:parity          # do the relay and REST extractors describe the file identically?
npm run figma:visual          # Figma renders vs Storybook renders → figma/visual/report.html (needs FIGMA_TOKEN)
npm run figma:pull            # relay backend (needs `npm run dev:relay` + bridge plugin open in Figma)
npm run figma:pull -- --rest  # REST backend, tier auto-detected (FIGMA_TOKEN; Enterprise for live variables)
npm run figma:pull -- --rest --tier professional   # force the Professional path (no /variables/local)
npm run figma:pull -- --rest --version <id>        # pull one saved Figma version
npm run figma:pull -- --rest --fix-manifest        # record new ids for manifest sets that moved
npm run gen:tokens            # regenerate CSS/TS from figma/*.json
npm run tokens:check          # drift gate
npm run tokens:check -- --write-baseline   # re-accept unread derived tokens as debt (last resort)
npm run tokens:map            # mapping report for unbuilt components → docs/figma-token-mapping.md
npm run storybook             # http://localhost:6006, Brand switcher in the toolbar
npm run verify                # everything CI runs
```
