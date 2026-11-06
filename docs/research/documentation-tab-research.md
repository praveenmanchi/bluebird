# Documentation tab: market research and recommended scope

**Date:** 2026-10-27 · **Scope:** a new Bluebird tab covering three jobs: (1) component documentation,
(2) hand-off documentation for screens, (3) a style guide generated from Figma variables, per brand mode.
**Method:** web search and official pages read on the date above. Vendor marketing is marked
*(vendor claim)*. Third-party pricing often disagrees with itself, so treat every price as a signal,
not a quote.

Bluebird already holds most of the inputs this tab needs. It has five brands as modes of the **Brand UI**
collection ([design-system-pipeline.md](../design-system-pipeline.md)), a `figma.ts` contract per
component in `src/shared/ui/<Name>/`, an accessibility engine, MCP readiness checks, and a Publish
pipeline that commits files to the docs-site repository (`commitFiles()` in
`src/features/publish/github/release.ts`). The research asks one question: which parts of
documentation do existing tools leave undone for a multi-brand system driven by variables?

## 1. Landscape at a glance

Jobs: **C** = component docs, **H** = hand-off for screens, **S** = style guide from variables.

| Tool | Jobs | Where output lives | Pricing signal |
|---|---|---|---|
| Figma Dev Mode + annotations + measurements | H | In the file (Dev Mode overlay) | Dev seat about $12–15 Pro / $25 Org / $35 Ent per month; adding annotations needs a Full seat |
| Figma Code Connect (CLI + UI) | C (code) | Dev Mode code panel, MCP context | Organization and Enterprise only |
| Figma agent (open beta) | C, H | Frames on the canvas | All paid plans; uses no AI credits during the beta |
| zeroheight | C, S | External docs site | Free (1 editor), Starter about $49; MCP not on Free/Starter |
| Supernova | C, S | External docs site + Portal | Free, Pro $399/month, Enterprise custom |
| Knapsack | C, S | External platform (docs + code playground) | Enterprise, reviewers call it expensive |
| FigMayo | C, S | External site mirrored from a library | About $49–299/month |
| Storybook autodocs | C (code) | Storybook site | Free (MIT) |
| Specs (formerly EightShapes Specs) | C | Frames on the canvas | Paid features |
| Propstar / Instancer | C (variants) | Frames on the canvas | Free + Pro |
| Namma Component Docs | C, S | Canvas + PDF/HTML/MD/JSON export | Not found; new and small |
| Redlines plugins | H | Frames on the canvas | Free |
| Tokens Studio (Automator script, documentation tokens) | S | Frames on the canvas | Automator is now free |
| Variables → style guide plugins (Figr Identity, TokensBrücke) | S (partly) | Canvas, or JSON export only | Free / freemium |
| Zeplin | H, S | External hand-off app | From about $6 per user per month |
| Anima / Locofy | H (code) | Generated code, hosted previews | Anima Pro about $24–49 per seat; Locofy charges in tokens, Hobby about $40/month |

## 2. Tool notes

### 2.1 Figma native

- **Annotations and measurements.** Annotations are notes on layers: free text, live *properties*
  (a layer's actual values, kept up to date as the design changes), or both. They come in four preset
  categories (Development, Interaction, Accessibility, Content) that each file can edit. Measurements
  are saved, editable distance markers added with Shift M. Adding either needs edit access and a Full
  seat; viewing needs a Full or Dev seat. They are available on Professional and higher plans. Teams
  can "create and manage annotations in bulk" through the plugin API
  ([Figma help](https://help.figma.com/hc/en-us/articles/20774752502935)). *Strength:* the properties
  stay live. *Gap:* annotations hold no token names unless someone types them, show nothing per brand
  mode, and hold no structure (anatomy, variant tables).
- **Dev Mode.** Covers inspection, "Ready for dev" status and comparing changes. It went GA in January 2024
  ([alternativeto](https://alternativeto.net/news/2024/1/figma-s-dev-mode-is-finally-out-of-beta-bringing-annotations-measurement-tools-and-more)).
  Dev seat prices did not change in the March 2025 seat model
  ([Figma blog](https://www.figma.com/blog/billing-experience-update-2025/),
  [Wise](https://wise.com/sg/blog/figma-pricing)). Zeplin's counter-argument is that the "ready for dev"
  label does not lock frames ([Zeplin](http://zeplin.io/why-zeplin/dev-mode-alternative/)) *(vendor claim)*.
- **Code Connect.** Maps library components to code. The **UI** version needs no CLI and can be
  connected to GitHub, and one component can map to several frameworks. It needs Organization or
  Enterprise, and its mappings feed the MCP server
  ([UI setup](https://developers.figma.com/docs/code-connect/code-connect-ui-setup/),
  [help](https://help.figma.com/hc/en-us/articles/23920389749655)).
- **MCP server.** Went into beta in June 2025. It gives coding agents the component tree, variables
  and Code Connect mappings
  ([alternativeto](https://alternativeto.net/news/2025/6/figma-launches-dev-mode-mcp-server-for-direct-ai-access-to-design-data)).
- **Figma agent (open beta, 2026).** Marketed as generating specs, annotations, redlines, usage
  guidelines and variant descriptions "directly in your file" from real components and tokens
  ([docs generator](https://www.figma.com/solutions/ai-design-documentation-generator/),
  [hand-off assistant](https://www.figma.com/solutions/ai-design-handoff-assistant/)) *(vendor claim)*.
  This is the most direct competitor for jobs 1 and 2. One user on the Figma forum reports that
  agents "hallucinate spacing", which pushed them to read node data instead
  ([forum](https://forum.figma.com/share-your-feedback-26/why-does-reading-a-figma-file-still-feel-like-archaeology-in-2026-52613)).
- **Variables.** There is still no way to document collections, groups or modes. A feature request
  from September 2026 asks for it
  ([forum](https://forum.figma.com/suggest-a-feature-11/add-richer-descriptions-to-variable-collections-groups-and-modes-57399)).
  Plugins can force a mode on generated frames with `setExplicitVariableModeForCollection`
  ([forum](https://forum.figma.com/t/changing-variable-mode-for-layer/51221)), which makes a
  frame per brand a cheap build.

### 2.2 Documentation platforms

- **zeroheight.** External styleguide sites that sync components, variables and styles when the
  Figma library is published. G2 reviewers name sync problems as a common weakness
  ([G2](https://g2.com/products/zeroheight/reviews)). Its AI features are the Assistant (in the editor
  and as a Figma plugin), Build with AI (a first draft that follows your docs' structure and tone),
  Write / Improve with AI, connectors for Figma Make and the Figma agent, and an MCP server
  ([zeroheight AI](https://www.zeroheight.com/ai)). The MCP server is not on Free or Starter, and
  remote MCP is on by default for styleguides created after 4 March 2026
  ([MCP](https://zeroheight.com/mcp/)). *Gap:* the docs live outside the file, and showing per-brand
  values takes manual work in each block.
- **Supernova.** A Notion-like editor with 25+ blocks (token group, Figma frame, Storybook, React
  render, component health) and public or private sites
  ([blocks](https://supernova.io/blog/unlocking-the-power-of-supernovas-content-blocks-for-design-system-documentation),
  [docs](https://www.supernova.io/documentation)). Its pricing page lists Free / Pro $399 per month /
  Enterprise. Token themes go from 1 to unlimited, all tiers get AI credits, Agent + MCP and the
  Portal (AI Q&A), and Pro adds automation pipelines ([pricing](https://supernova.io/pricing)). It is
  the strongest on multi-theme tokens, but those docs sit on an external site.
- **Knapsack.** Docs, a token engine, and code playgrounds with Figma blocks (Component block for
  every variant, Tiles block), Guidelines (do / don't), Template Spec, an MCP endpoint per workspace,
  and llms.txt ([docs index](https://docs.knapsack.cloud/llms.txt)). Its variables support collections,
  modes and themes "for multi-brand token sets". It raised a $10M Series A in October 2025
  ([Knapsack](https://www.knapsack.cloud/blog/knapsack-raises-10m-to-accelerate-the-intelligent-product-engine-powering-ai-driven-product-creation)).
  It is enterprise-priced and heavy to adopt
  ([Capterra](https://www.capterra.com.au/software/1023827/knapsack)).
- **FigMayo.** Mirrors a Figma library to a URL with one click, so viewers need no Figma account
  ([AlternativeTo](https://alternativeto.net/software/figmayo/about),
  [Product Hunt](https://www.producthunt.com/products/figmayo)). It shows how far "publish what is
  in Figma" goes as a product.
- **Storybook.** Autodocs generates a docs page from stories and argTypes
  ([v9 docs](https://storybook.js.org/docs/9/writing-docs/autodocs.md)). Token tables come from addons
  that parse CSS ([storybook-design-token](https://storybook.js.org/addons/storybook-design-token)).
  Storybook 10.3 (April 2026) added an MCP server and a component manifest, React-only and in preview
  ([alternativeto](https://alternativeto.net/news/2026/4/storybook-10-3-brings-mcp-for-react-accessibility-upgrades-and-expanded-csf-factories),
  [MCP API](https://storybook.js.org/docs/ai/mcp/api.md)). Bluebird's `.storybook/site` already covers
  the code side.
- **Backlight.** Still listed as of 2026, but webcomponents.dev shut down in June 2025. AlternativeTo
  points to Storybook, zeroheight and FigMayo as the alternatives
  ([AlternativeTo](https://alternativeto.net/software/backlight),
  [webcomponents.dev](https://webcomponents.dev/pricing)). It is not a reference point.

### 2.3 Figma plugins

- **Specs (formerly EightShapes Specs).** Adds spec frames from a selection: anatomy (numbered
  markers, dependencies), properties (compares attributes across variants, flags the layers each
  boolean controls) and auto-layout spacing
  ([UX Planet](https://uxplanet.org/how-to-automatically-generate-a-component-specification-and-style-guide-in-figma-617a969b9f4c)).
  It is the quality bar for job 1. Its key features are paid and it does not capture composite tokens
  ([Tokens Studio feedback](https://tokensstudio.featurebase.app/p/documentation-and-annotate)). It
  has no brand modes and no way of knowing when a spec has gone out of date.
- **Propstar / Instancer.** Generate a labelled table of every variant × property combination
  ([zeroheight awards](https://awards.zeroheight.com/voting/plugin-propstar)). *Gap:* they include
  combinations the system never uses, such as a two-icon button
  ([Prototypr](https://blog.prototypr.io/propstar-plugin-solves-the-figma-properties-component-problem-3dce4615f4d1)).
- **Namma Component Docs.** New. It builds anatomy, token docs, WCAG 2.2 reports and colour
  compatibility from real styles and variables, and exports PDF, HTML, MD, JSON, CSV and YAML
  ([Product Hunt](https://www.producthunt.com/p/namma-component-docs-by-prakash-a-k/namma-component-docs-figma-plugin))
  *(vendor claim, small user base)*. It is the closest in shape to what Bluebird would build, but it
  has no brand modes and no repository push.
- **Redlines.** Plots measurement lines for a selection with styling controls
  ([Design+Code](https://designcode.io/figma-handbook-redlines)). The redlines are static, carry no
  token names, and are left stale when the design moves.
- **Tokens Studio.** A community Automator script generates "living" token documentation, and
  documentation tokens write token values into layers
  ([Automator](https://tokens.studio/old/blog/automator-tokens-studio-documentation),
  [docs](https://docs.tokens.studio/tokens/documentation-tokens)). Users call it complex and
  error-silent ([Substack](https://samiamdesigns.substack.com/i/142440450/step-find-the-automator-template-duplicates)).
- **Variables → style guide.** We found no community plugin that renders a style guide per mode
  from variables. Figr Identity generates a style guide together with new variables
  ([forum](https://forum.figma.com/t/generate-design-systems-plugin-by-figr/67994)), and TokensBrücke
  exports variables to DTCG JSON with modes under `$extensions`
  ([GitHub](https://github.com/JeroenRoodIHS/figma-plugin)). We could not confirm the plugins named in
  the brief ("Variables Sheet", "Style Organizer", "Spec Generator") in this session; check them on
  Figma Community before citing them.
- **AI skill packs.** uSpec runs agent skills through MCP that draw anatomy, property and API
  annotations in Figma
  ([Tessl](https://tessl.io/registry/skills/github/redongreen/uSpec/create-anatomy)). It is a sign
  that agent-written specs are becoming a commodity.

### 2.4 Hand-off and code tools

- **Zeplin.** Flows plus specs and annotations, Git-like versions with Slack and Teams updates,
  styleguide pages, Jira and Azure DevOps links that stay current across versions, and "AI Design
  Review" and "AI Organize" ([Zeplin](http://zeplin.io/why-zeplin/dev-mode-alternative/))
  *(vendor claim)*. Its draw is free viewing and a hard line between exploration and "ready".
  Reviewers say Figma has replaced it
  ([Capterra](https://www.capterra.co.uk/software/190895/zeplin)).
- **Anima / Locofy.** Turn designs into React, Vue or HTML code. Anima has an AI Playground;
  Locofy has its own "Large Design Models", an Agent Mode and MCP access from Cursor and Claude Code
  ([toolradar](https://toolradar.com/compare/locofy-vs-anima),
  [Subscribed](https://subscribed.fyi/locofy/reviews/)). Output quality depends on how clean the file
  is ([DEV](https://dev.to/syakirurahman/top-10-ai-figma-design-to-code-tools-to-build-web-app-effortlessly-3lod)).
  These tools hand off code, not documentation; Bluebird's MCP tab already covers that ground.

### 2.5 AI features added in 2025–2026

| Tool | AI feature |
|---|---|
| Figma | Agent writes specs, redlines, usage guidelines and variant descriptions on the canvas (beta); MCP server |
| zeroheight | Build / Write / Improve with AI, Assistant (editor, viewer, Figma), MCP, Figma Make and agent connectors |
| Supernova | AI credits per tier, Agent + MCP, Portal Q&A |
| Knapsack | MCP per workspace, "Intelligent Tools" grounded in tokens and docs, llms.txt |
| Storybook | MCP + component manifest (React, preview) |
| Zeplin | AI Design Review, AI Organize |
| Locofy / Anima | Agent mode / AI Playground for code |

The pattern is that **AI writes the prose** (usage, do / don't, descriptions) and **MCP serves the
docs to coding agents**. Nobody markets AI-measured specs; the deterministic values come from node data.

## 3. Table stakes

What every serious tool does, so Bluebird must too:

1. Read real data: component property definitions, variants, bound variables, styles. No mock data.
2. Anatomy with numbered markers and a legend.
3. A properties / variants table covering variant axes, booleans, instance swaps and text props.
4. Spacing and size specs from auto layout (padding, gap, fixed or hug).
5. Tokens used, by name and value.
6. Colour, type, spacing and radius pages from variables or styles.
7. Output as frames on the canvas, plus at least one export (Markdown / JSON / HTML).
8. AI-drafted usage guidance that a person must review before it is published.
9. Annotation categories that match Figma's four (Development, Interaction, Accessibility, Content).

## 4. Gaps and wedges for a multi-brand plugin driven by variables

| # | Gap in the market | Bluebird wedge |
|---|---|---|
| W1 | **Docs cover one brand.** Specs, Namma, Redlines and the Figma agent document whatever mode is showing; zeroheight and Supernova need a block per theme. | **Per-brand-mode docs.** Each section renders under every Brand UI mode (`setExplicitVariableModeForCollection`) and adds a **brand differences** table only where values diverge (Ikea / Disney pill radius, brand font weights). A brand picker works as a filter, not a re-run. |
| W2 | **Redlines carry numbers, not tokens.** Native measurements and Redlines show `16`. The Figma agent can hallucinate spacing. | **Specs bound to tokens.** Every redline is labelled `space/4 · 16` from `boundVariables`, and raw values show a "raw" warning. The same rules as `tokens:check` and the MCP `evaluate()` apply, so the docs reflect the design's real quality. Measurement is deterministic; AI writes prose only. |
| W3 | **Generated docs go stale silently.** Only native annotation properties stay live. | **Staleness you can see.** Each generated frame stores a source hash (node structure + property definitions + variable values per mode) in plugin data. A re-open shows **Out of date: 3 tokens changed in Ikea** with Regenerate and a diff. Hand-edited notes survive regeneration. |
| W4 | **Canvas docs and site docs are separate products.** Plugins stop at the canvas; platforms need their own editor. | **Push to Publish.** The same document model goes to `docs/components/<name>.md` + `.json` and `docs/style-guide/<brand>.md` through the existing `commitFiles()`, so the CI docs site (and Storybook site) renders it. The Publish review step lists these files like the others. |
| W5 | **No mode or collection documentation** in Figma ([forum](https://forum.figma.com/suggest-a-feature-11/add-richer-descriptions-to-variable-collections-groups-and-modes-57399)). | Brand and mode descriptions are written in the style guide flow, stored in document plugin data, and published with the tokens. |
| W6 | **Accessibility notes are prose** written by hand or by AI. | Reuse the Accessibility tab's engine: contrast per brand for each text and background pair the component uses, target size, and whether focus and disabled states exist. Results come out as measured facts, plus Accessibility-category annotations. |
| W7 | **Code snippets need Code Connect** (Org / Enterprise) or Storybook. | Snippets come from each component's `figma.ts` contract (prop mapping, gaps, notes). Code Connect is used when it is present, otherwise the contract. |
| W8 | **Agents read docs through vendor MCP servers** (zeroheight, Supernova, Knapsack). | The pushed JSON is plain repository content, so the MCP tab's prompt and any coding agent can read it with no extra service. |
| W9 | **Hand-off is cut off from tickets.** Only Zeplin links to Jira. | Screen dev notes can link a Jira issue through the existing Jira tab client (later). |

## 5. Recommended feature set

Principle: **deterministic facts first, AI prose second, every AI block labelled "Draft" until a
person accepts it.** Output targets come in three tiers: on-canvas frames (always), native Dev Mode
annotations (hand-off), and repository files through Publish.

### 5.1 Component documentation

| Feature | MVP | Later |
|---|---|---|
| Selection: component set, component or instance (resolves to its main component) | ✓ | |
| Anatomy: numbered markers on direct named children + legend (layer, type, token) | ✓ | Nested sub-components |
| Properties table: variant axes, booleans (with the layers each controls), instance swaps, text props, defaults | ✓ | |
| Variant matrix: **existing** variants only, unlike Propstar | ✓ | States row per interaction |
| Tokens used: walk `boundVariables`, grouped by tier (tier 2 component → tier 1 app), raw values flagged | ✓ | |
| Brand differences: values per Brand UI mode where they differ, plus a side-by-side preview of all 5 brands | ✓ | |
| Accessibility notes from the a11y engine (contrast per brand, target size, focus / disabled present) | ✓ | Keyboard / ARIA guidance (AI draft) |
| Code snippet from the `figma.ts` contract or Code Connect | ✓ | Storybook story link |
| Usage do / don't, description: AI draft (BYOK provider), editable, "Draft" until accepted | | ✓ |
| Changelog for this component (from Publish releases) | | ✓ |

### 5.2 Hand-off documentation for screens

| Feature | MVP | Later |
|---|---|---|
| Selection: one top-level frame (or a section of frames) | ✓ | |
| Spacing redlines from auto layout (padding, gap) with token labels and raw-value warnings | ✓ | Spacing between frames that are not auto layout |
| Size and constraints (fixed / hug / fill, min / max) | ✓ | |
| Inventory: library components used (with variant), detached instances, local components | ✓ | |
| Colour and type per layer: token names + text styles | ✓ | |
| Output as **native annotations** (Development category, live properties) and/or a spec frame next to the screen | ✓ | |
| Dev notes: free text per layer, kept through regeneration | ✓ | Jira issue link |
| States: other variants of the same screen found by name or section, shown as a strip | | ✓ |
| Flows: prototype reactions turned into a flow diagram (frame → interaction → frame) | | ✓ |
| Brand preview: the screen rendered in 5 brands | | ✓ |
| AI summary for developers ("what is unusual about this screen") | | ✓ |

### 5.3 Style guide from variables

| Feature | MVP | Later |
|---|---|---|
| Scope: Brand UI tier 1 (app tokens) + the Foundations ramps for the chosen brand(s) | ✓ | Tier 2 component-token browser |
| Colour page: swatches by group, hex + alias chain (`surface/brand → ikea/color/primary/600-brand`), contrast pairs | ✓ | |
| Type page: families per brand, size / line / weight scale, text style specimens | ✓ | |
| Spacing and radius pages: scale bars with token names; brand overrides highlighted | ✓ | Elevation, border width, motion |
| Brand mode: one brand, or every brand side by side | ✓ | |
| Output: a canvas page `Style guide / <Brand>` (frames bound to variables, so they stay live) + Markdown/JSON through Publish | ✓ | |
| Mode and collection descriptions (W5) | | ✓ |
| Diff since last release (what changed per brand) | | ✓ |
| Deprecated / unused tokens list | | ✓ |

## 6. Screen list

The tab follows the existing pattern: **Documentation** in the tab bar with sub-feature pills
**Component · Hand-off · Style guide**, content on `bg` neutral-50, and the 400 px compact width as
the baseline (S/M/L sections, as in the Accessibility tab). Every job shares one state machine:
**Empty → Configure → Generating → Result**, with **Stale** and **Error** branches.

### 6.1 Shared

| # | Screen | Notes |
|---|---|---|
| D0 | First-run intro | Three cards (Component / Hand-off / Style guide), one line each; dismissible |
| D1 | Output settings sheet | Targets: canvas frames, native annotations, Publish files; default brand(s); page for generated frames |

### 6.2 Component

| # | Screen / state | Content |
|---|---|---|
| C1 | Empty: nothing selected | Illustration + "Select a component or component set" + recent docs list |
| C2 | Empty: wrong selection | "This is a frame. Use Hand-off, or select a component." with a switch button |
| C3 | Configure | Selected component card (name, variants count, brands), section checklist (Anatomy, Properties, Variants, Tokens, Brand differences, Accessibility, Code, Usage *AI*), brand chips, output targets, **Generate** |
| C4 | Generating | Step list with progress: Read structure → Resolve tokens × 5 brands → Accessibility checks → Layout frames → (Draft usage); Cancel |
| C5 | Result | Summary (sections, tokens, raw values, contrast fails), preview of sections, **Go to frames**, **Add to Publish**, **Copy Markdown**; AI blocks marked Draft with Accept / Edit |
| C6 | Stale | Banner on reopen: "Out of date: 2 properties and 3 Ikea tokens changed" + diff list + **Regenerate** (keeps notes) |
| C7 | Error | Cases: no main component (remote library not loaded), too many variants (threshold + "generate per axis"), AI provider failed (facts kept, usage skipped), write failed (locked page) |

### 6.3 Hand-off

| # | Screen / state | Content |
|---|---|---|
| H1 | Empty: nothing selected | "Select a frame to document"; tips on top-level frames |
| H2 | Empty: multiple frames | "3 frames selected": document each, or pick one |
| H3 | Configure | Frame card, check results up front (raw values, detached instances), layers to spec (all / auto layout only / selected layers), output: annotations, spec frame or both, dev notes field |
| H4 | Generating | Walk layers → Map tokens → Write annotations → Place spec frame |
| H5 | Result | Counts (annotations written, raw values, detached), list of findings with **Select layer**, **Open in Dev Mode** hint, **Add to Publish** |
| H6 | Stale | "Frame changed since the spec was written: 4 layers moved" + Regenerate |
| H7 | Error | No Full seat or edit access (annotations need it: fall back to the spec frame), frame too large (layer cap), not auto layout (offer to measure frames anyway) |

### 6.4 Style guide

| # | Screen / state | Content |
|---|---|---|
| S1 | Empty: no variables | "This file has no Brand UI collection"; link to the Tokens tab / library settings |
| S2 | Configure | Pages checklist (Colour, Type, Spacing, Radius), brand selector (one / all side by side), collection scope (tier 1, Foundations ramps), output targets |
| S3 | Generating | Per page × per brand progress (for example "Colour · Disney 3/5") |
| S4 | Result | Page previews with a brand switcher, contrast summary, **Go to page**, **Add to Publish** |
| S5 | Stale | "12 variables changed since this style guide was generated" with the list grouped by brand |
| S6 | Error | Library variables not imported, alias cycle or a missing mode value (named variable), font not available for specimens |

**Count:** 2 shared + 7 component + 7 hand-off + 6 style guide = **22 screens** at 400 px. M/L
variants are needed for the Result screens only (C5, H5, S4), as in the Accessibility tab.

### 6.5 MVP cut

Build first: C1, C3, C4, C5, C7 · H1, H3, H4, H5, H7 · S1, S2, S3, S4, S6 · D1. The usage AI draft,
stale detection (C6, H6, S5), states / flows for hand-off and the diff since release come in the
second iteration. Stale detection is the strongest wedge (W3), but it needs the source hash written
from the first release, so the MVP must **store** the hash even before it **shows** staleness.

## 7. Build notes

- **One document model, three renderers.** `DocModel { kind, source: {nodeId, hash}, brands[], sections[] }`
  renders to canvas frames, annotations and Markdown/JSON. A pure function produces it, so tests need
  no Figma (the same approach as `evaluate()` and `commitFiles()`).
- **Brand rendering.** One frame per brand with an explicit Brand UI mode. Frames stay bound to
  variables, so style guide swatches update when a value changes even before the stale check runs.
- **Annotations API.** The help page links an Annotation API for bulk work. Its fields, recalled and
  not re-checked here (the reference page returned 404 when fetched): `node.annotations` with
  `label` / `labelMarkdown` / `properties` / `categoryId`, and categories under `figma.annotations`.
  Confirm against the typings before building.
- **Budget.** The UI bundle is near its limit (1160 KB at the last a11y change). Canvas layout code
  belongs in the sandbox (`code.ts`), not the UI.
- **Publish.** Doc files join the existing commit as extra `CommitFile`s. The Review step lists them
  under Commit contents, and the docs-site CI needs a renderer for `docs/components/*.json`.

## 8. Risks and open questions

1. **The Figma agent is free during its beta** and does job 1 and job 2 in rough form. Bluebird's case
   rests on W1–W4 (brands, tokens, staleness, Publish). The tab's copy should lead with those, not
   with "generate docs".
2. **Native annotations need a Full seat.** Dev-seat users get the spec frame only.
3. **Very large component sets** (hundreds of variants × 5 brands) need a cap and per-axis generation.
4. **AI prose quality and tone.** Ground it in existing docs (as zeroheight's Build with AI does) and
   the UX AI library index, and never publish an unaccepted draft.
5. **Pricing figures** come from third parties and conflict; re-check them before any external use.

All sources are linked inline; prices and AI feature lists were read on 2026-10-27.
