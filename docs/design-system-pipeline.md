# Design-system pipeline: Figma variables → code, with Storybook as the contract

**Goal.** No hardcoded visual values anywhere in the UI. Every colour, size, radius, spacing and type
value is a Figma variable. Changing a variable in Figma and re-running the pipeline re-skins the
plugin and every Storybook story. Five brands (Bridge, Ikea, Richemont, Disney, Fiskars) are the five
modes of the Figma **Brand** collection; the plugin picks one in `plugin.config.json → brand.active`.

```
Figma file WWRcH8IPLJ4iQVyoK9oDnH
 ├─ 1. Primitives (164 vars, 1 mode)  ─┐
 ├─ 2. Semantics  (84 vars, 1 mode)   ─┤   npm run figma:pull          figma/tokens.json
 ├─ Brand (367 vars × 5 modes)        ─┘   (relay or REST)        →    figma/components.json
 └─ Components page: sets + bindings  ────────────────────────────→    figma/icons.json
                                                                          │
                                                        npm run gen:tokens│
                                                                          ▼
   src/shared/brand/generated/  base.css · brand.<id>.css · derived.css · all.css · active.css · tokens.ts
   src/shared/ui/Icon/generated.ts
                                                                          │
              components read ONLY var(--bb-*)  ◄────────────────────────┤
              Storybook loads all.css + brand toolbar                     │
              plugin loads active.css + <html data-brand>                 │
                                                                          ▼
   npm run tokens:check   (CI gate: stale generated files · unknown vars · raw values · Figma bindings not consumed)
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

Naming is mechanical: Figma `button/primary/bg/default` → CSS `--bb-button-primary-bg-default`.
FLOATs become `px` except weights and opacities; font families are quoted.

## Component contract

Each folder mirrors one Figma component set (ids live in `figma/manifest.json`):

- `Name.css` uses only `var(--bb-…)`. `tokens:check` fails on any hex, `rgb()`, `px` or named colour. Motion is the one exception, marked `/* allow-raw */`.
- `figma.ts` maps Figma props → code props and lists `figmaGaps`: tokens the Figma set binds that the code intentionally does not read, each with a reason. Anything not listed there must be consumed, or CI fails.
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
1. Pull backend: the relay backend is proven (2026-09-22: full pull of 621 variables, 49 sets and the Tab Icons set in ~45 s). Flow: `npm run build` → `npm run dev:relay` → in Figma desktop run *Dev: connect to browser (live mode)* → `npm run figma:pull` → `npm run gen:tokens && npm run tokens:check`. The pull keeps the code-side bookkeeping (`status`/`aliasOf`, tiers, hand-exported glyphs). `--rest` needs a personal access token **and** an Enterprise plan for `/variables/local`. Recommended: relay locally, REST in CI if/when Enterprise.
2. CI job: `figma:pull → gen:tokens → tokens:check → test → build-storybook`, opening a PR when `figma/*.json` changed. Storybook is the review surface for the diff.
3. Visual parity gate: export each Figma variant via `GET /v1/images/:key?ids=…` (works on all plans) and diff against Storybook renders per brand (Playwright + pixelmatch). Story ↔ node pairing already exists through `parameters.figma.variant` and `FIGMA_COMPONENTS`.

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

Bundle: the single-file plugin UI is ~335 KB; the plugin ships only the glyphs referenced from `src/` and `plugin.config.json` (`Icon/generated.active.ts` via the `@icons` alias; Storybook and tests load the full table) (budget 360 KB in `scripts/check-size.ts`): ~85 KB icon glyphs, ~55 KB artwork, the rest components + tokens. SVG path data is rounded to two decimals by the generator; a simplified Bridge wordmark in Figma or per-tab code splitting are the next levers.

### Phase 3 — tabs composed from components
New tabs (see `docs/adding-a-tab.md`) use only `@shared/ui` components and Tailwind utilities from `theme.css`. `tokens:check` can then be widened from `src/shared/ui` + `src/shell` to `src/features`.

## Findings from the Figma file worth fixing in Figma

0. **Banner (40000064:9910) is ~27 % bound.** Title/tagline fills are raw white (use `Banner/Text`), three fonts are raw (MuseoModerno, IBM Plex Sans, Michroma; `type/family/museo` already exists), all spacing is raw, and the layers are unnamed (`Frame 1430102689`…), so the derived tokens carry those names. A sixth Brand mode literally called **"Mode"** appeared (values copy Fiskars); the snapshot ignores it, delete or name it. The Bridge logo is outlined text (49 KB) and dominates the plugin bundle; a simplified asset would help.

1. **Semantics has a single mode.** `text/primary`, `surface/canvas` etc. are dark-theme values only; light brands (Ikea, Richemont) work purely through the Brand component tokens. Either add Brand modes to Semantics or keep everything app-level in Brand (the shell currently uses `card-variable/*` as the canvas for that reason). A dedicated `app/canvas/*` group would be cleaner.
2. **Icon vectors are bound to `icon/glyph/default`** even inside Button and Dropdown, although `button/*/icon/color` and `dropdown/chevron/color` exist. Rebind the vectors; the `figmaGaps` entries in `Button/figma.ts` and `Dropdown/figma.ts` can then be deleted (CI will insist).
3. **Disabled opacity, checkbox mark stroke/dash geometry** are raw in the components (see `derived.css`). Add `*/disabled/opacity`, `checkbox/mark/stroke-width` variables.
4. `border-width/*` tokens exist but stroke weights on the component roots are not bound to them.
5. Font weights: variables named `…/font-weight` were FLOATs emitted with `px` until 2026-09-21 (fixed in `cssValueFor`); the Figma side is fine.
6. Font: every family token resolves to **Noto Sans**. The plugin now loads it from Google Fonts (`manifest.json → networkAccess`). If the plugin must stay offline, ship the font subset or accept the system fallback.

## Commands

```bash
npm run figma:pull            # relay backend (needs `npm run dev:relay` + bridge plugin open in Figma)
npm run figma:pull -- --rest  # REST backend (FIGMA_TOKEN, Enterprise for variables)
npm run gen:tokens            # regenerate CSS/TS from figma/*.json
npm run tokens:check          # drift gate
npm run tokens:map            # mapping report for unbuilt components → docs/figma-token-mapping.md
npm run storybook             # http://localhost:6006, Brand switcher in the toolbar
npm run verify                # everything CI runs
```
