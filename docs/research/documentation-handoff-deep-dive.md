# Documentation tab, second pass: component specs and ticket-driven hand-off

**Date:** 2026-11-13 · **Builds on:** [documentation-tab-research.md](documentation-tab-research.md) (2026-10-27).
**Scope:** component documentation and developer hand-off. The style guide is on hold.
**Method:** web research on the date above, from text sources only (docs, listings, articles). No
plugin output was seen as an image except the Specs run already on the Documentation page.
Anything marked *unverified* came from a secondary source or could not be read directly. Prices
conflict between sources, so treat them as signals.

The first pass asked which gaps exist in the market. This pass asks two narrower questions: what
exactly do the best tools draw, and how should a hand-off prove that a Jira ticket was delivered?

## 1. What the component-doc plugins output

| Plugin | What it draws | How it shows properties | Weak spots |
|---|---|---|---|
| **Specs / EightShapes Specs** (Nathan Curtis) | Frames beside the component: Title, Anatomy, Props, Layout and spacing; paid adds Modes | "Exhibit" rows: attribute text one side, annotated artwork the other. Variants are compared with the default and only the differing attributes are listed. Booleans name the layers they control and highlight them. Spacing uses the Chrome Inspector colours | Text-heavy attribute lists, markers cross on dense components, fixed styling, behaviour and accessibility are manual. Paid features (reported about $8–10 a month) |
| **Specs 2 / Anova** | Same sections plus a styling inventory and schema-valid YAML/JSON | Variants stored as diffs from the default, invalid combinations recorded | Output and price not seen directly |
| **Propstar** | A labelled grid of every variant combination | Exhaustive matrix | Huge tables; includes combinations nobody uses |
| **Obra Autodocs** (free, MIT) | Minimal labelled variant grids | You choose which props, booleans and nested instances to show | No anatomy, tokens or spacing |
| **Component Documentation** (Bartosik) | One frame: property table plus variant grid | Table of name, type, default, options; re-run updates in place | Table, not visual |
| **Autospec** | Anatomy with legend, a Measure card per auto-layout frame, a card per property previewing every option | One card per property, active value highlighted | Limits unverified |
| **Spec Layer** | Usage, Specifications and Accessibility groups; tracks source changes | Empty sections are left out | AI writing capped on the free tier |
| **DesignDoc [Spectral]** | Measurement and spacing annotations | Not applicable | Annotations do not follow the frame, repeated items over-annotated, no fixed/hug/fill markers |
| **Figma Dev Mode** | Nothing on the canvas: annotations, measurements, component playground | Playground lets a developer flip props and modes | No single spec artefact; needs paid seats |

Reference pages worth copying from: **Material 3 "Specs" tabs** (numbered colour callouts mapped to
token roles, states in one labelled row, measurements as a diagram plus a small attribute table)
and **Carbon** (numbered anatomy, then Color / Typography / Structure / Size).

The Specs run on the Documentation page shows the weakness plainly: every exhibit is a preview next
to a paragraph-like list ("Background color: #0978C8, Border color: #0978C8"), repeated per option.
It is accurate, but it reads as text.

### Patterns to keep

1. Numbered anatomy with a legend, stopping at nested components.
2. One exhibit per property, not one giant matrix.
3. Booleans as an on/off pair with the affected layer outlined.
4. Diff from the default instead of repeating every attribute.
5. Token line as value plus token name.
6. Spacing as coloured zones on the artwork, not a list.
7. Regenerate in place and flag stale output (already in the first-pass plan).

### What nobody does well

- Showing the properties the way the designer and developer already see them, as the Figma panel.
- Colours as a Type × State matrix of swatches with hex and token.
- Fixed/hug/fill sizing, effects, and mode × variant coverage.

## 2. Component template (built)

Principle: **artwork first, one short label per fact, no sentences.** Every value is read from the
node; nothing is typed.

| # | Section | What it shows | Source |
|---|---|---|---|
| 1 | Header | Name, counts as chips (variants, variant props, booleans, swaps, text), brand, library path | `componentPropertyDefinitions`, page and section names |
| 2 | Anatomy | The component at 3× with numbered markers; one card per part with that part outlined ("selected") and its fill, border, radius, size as swatch + value + token | Default variant children, `boundVariables` |
| 3 | Properties | A Figma-style property panel (dropdowns, toggles, swap fields, text field) beside a live preview, then one exhibit per property: variant options side by side with the default tagged, booleans as On/Off with the controlled layer outlined, instance swap with sample glyphs, text with sample labels | Property definitions, real variants |
| 4 | Colours | Type × State matrix; each cell is the real variant plus Fill, Text and Border as swatch, hex and token tail | Variant fills and strokes |
| 5 | Layout and spacing | The component at 4× with padding and gap as tinted zones and width, height, radius and icon size as rules, each labelled `value · token` | Auto-layout values and bindings |
| 6 | Typography | Specimen plus family, size, weight and line height with tokens | Label text node |

**Revision, same day (after review).** The dark page and the per-property breakdown were dropped.
The current template is **[Component spec v3, white](https://www.figma.com/design/naqp6r4h5V4KUgTTmwe9U5/?node-id=40002761-13698)**:

- **Neutral white page** on the `a11y/report/*` tokens, which hold the same value in every brand.
  Only the tiles behind the component use the brand surface, so transparent variants stay visible.
- **Header** with Storybook, Figma location, code path, generated date, plugin version and brand.
- **Main component**: all 24 variants in one grid, named by property (`Type=`, `Size=` rows,
  `State=` columns), each with Fill, Text and Border swatches.
- **Anatomy, combined**: the component in the centre, one callout per part wired to it. Each
  callout carries that part's colours, size, spacing or type with tokens, plus the properties
  that control it (boolean as a toggle, instance swap, text).

The earlier detailed sections are kept beside it in an archive frame; the one-page card is still dark.

Two earlier templates on the Documentation page of the Plugin-UI file:

- **Component spec (full page)**: [node 40002761:13698](https://www.figma.com/design/naqp6r4h5V4KUgTTmwe9U5/?node-id=40002761-13698), 1440 wide.
- **Spec card (one page)**: [node 40002763:18388](https://www.figma.com/design/naqp6r4h5V4KUgTTmwe9U5/?node-id=40002763-18388), 1200 wide: anatomy, legend, panel, default colours and spacing chips. Meant to sit beside the component set.

Both use the real Button set (24 variants) in Bridge mode and are bound to `docs/*` and
`docs/page/*` tokens. Left out on purpose: usage prose, do/don't and code. Brand differences and
accessibility from the first-pass doc can be added as further visual sections.

Known limits of the templates: the instance-swap exhibit shows the first five glyphs of the icon
set, not a curated list; the font family is set directly, not bound; hex values are Bridge only.

## 3. How hand-off tools work today

| Tool | What the developer gets | Ticket link | Gap |
|---|---|---|---|
| **Figma Dev Mode** | Ready for dev status, compare changes, annotations, measurements, dev resource links, Code Connect | Jira issue shows under Dev resources | No document, no notion of requirements; users report it is hard to tell which version a comparison uses |
| **Figma Specs** (reported open beta, Oct 2026) | A written-context container on the canvas that embeds frames and is readable through MCP | None mentioned | No acceptance criteria. Closest first-party overlap; output not seen |
| **Figma for Jira** | A Designs panel in the issue with live embeds and "Design updated" / "Ready for dev" tags | Two-way link and status | Syncs links and status only. Reported problems: branches not shown, links lost on clone |
| **Zeplin** | Published screens with specs, flows and annotations; a ticket can pin a design version | Attach screens or flows to issues | Needs re-publishing; no criteria check |
| **Supernova, zeroheight, Handoff (Convertiv)** | Design-system documentation sites | None per change | System-level, not per ticket |
| **Anima, Locofy** | Generated code | None | Code, not a spec |
| **Pixelay, Applitools, uiMatch** | Design versus built UI diff | None | Design versus build, never design versus requirement |
| **AI ticket tools** (story generators, review skills) | Stories and Given/When/Then text, or a review summary | Jira-side | Search found no Figma plugin that maps frames to individual acceptance criteria |

What developers say is missing from hand-offs (NN/g and practitioner write-ups agree): empty,
loading, error and overflow states; behaviour between breakpoints; focus order and keyboard notes;
token names instead of raw values; a named owner. NN/g treats the ticket as the "contract" and the
design file as the evidence, which is the model used below.

## 4. Ticket-driven hand-off: how it works

### Flow

1. **Link the ticket.** Type a key or pick from the Jira tab's list. The existing Jira client in
   `src/features/jira/api` already fetches issues through the proxy.
2. **Find the criteria.** Jira has no system field for acceptance criteria. Look in this order:
   a custom field whose name matches "Acceptance Criteria" (found through `GET /rest/api/3/field`,
   id differs per site), a checklist field (Smart Checklist stores Markdown-like text), then a
   heading or Given/When/Then lines in the description. Cloud v3 returns Atlassian Document
   Format; Data Center has only v2 with wiki markup. Add an "Acceptance criteria field" setting so
   a site admin can pin the field.
3. **Confirm.** Show the parsed list. The designer can edit, merge or drop lines before anything
   is checked. This step matters: badly written criteria cannot be checked.
4. **Check, in two passes.** First turn each criterion into a checkable statement and tag it
   *design-verifiable* or not (performance, data and back-end rules are not). Then check the
   verifiable ones against the selected pages: frame names, text, states, variants, prototype
   links, annotations. Research on LLM requirement checking reports that splitting extraction from
   checking reduces invented findings.
5. **Verdict per criterion**, always with evidence:

   | Status | Meaning |
   |---|---|
   | Met | A frame shows it; the frame is linked |
   | Partly met | Some of it is drawn; the note says what is missing |
   | Not met | Nothing in the selection shows it |
   | Can't verify from design | Not a design question; goes to the build checklist |

6. **Override.** The designer can change any verdict. Overrides are recorded in the hand-off.
7. **Generate the hand-off page** (section 5).
8. **Post back to Jira**, each write confirmed by the user: a comment with the summary, a remote
   link to the hand-off page, optionally an attachment and a transition. Third-party apps reportedly
   cannot write into the native Designs panel, so use comment and remote link. Request shapes for
   remote link and attachment were not re-read this session; check them against the Atlassian docs
   before building.

### Rules

- Facts (states found, components, tokens, changes) are measured. Only the criterion-to-frame
  matching uses AI, and every verdict shows its evidence.
- "Delivered" is never claimed for a criterion without a linked frame.
- A hand-off with a Not met criterion can still go out, but the header says so.

## 5. Hand-off template (built)

| # | Section | Content |
|---|---|---|
| 1 | Header | Ticket key, type, status, sprint, designer, Figma version; verdict card with "3 of 6 criteria met" and a segmented bar |
| 2 | Acceptance criteria | One row per criterion: text, status pill, evidence thumbnails with screen names, one-line note |
| 3 | Screens | Thumbnails with state type and New / Changed chips; counts in the heading |
| 4 | States covered | Cards for empty, loading, success, error, widths, focus order, long content, each with a status |
| 5 | Components used | Real counts from the screens as chips |
| 6 | Open questions | Question plus owner chip |
| 7 | Posted to Jira | Preview of the comment that goes on the ticket |

- **Hand-off page**: [node 40002764:13887](https://www.figma.com/design/naqp6r4h5V4KUgTTmwe9U5/?node-id=40002764-13887), 1440 wide. Moved to the neutral white report theme after review; the screen thumbnails keep their brand theme.
- **Plugin screen "4b Acceptance criteria"**: [node 40002766:18172](https://www.figma.com/design/naqp6r4h5V4KUgTTmwe9U5/?node-id=40002766-18172), 600 × 760, in the Hand-off section after Details. Rows are Finding Rows with Locate and Override.

The ticket BB-318, its six criteria, the verdicts and the open questions are **sample data**. The
screens are the six real Documentation · Components screens, and the component counts (20
components, 116 instances) are read from them. The older page-level hand-off (flow map, audit,
known issues) stays as it is; this template is the ticket view of the same hand-off and the two
can be merged: criteria table on top, flow and audit below.

Template shortcuts to fix when this is componentised: the plugin screen reuses the Severity badge
for status, so its colours are the severity colours; "What changed" shows only New chips because
the sample has no earlier version to compare with.

## 6. Could not see: please run and share

Output of these was described in text only, or not found. A screenshot of each would sharpen the
templates:

- **Specs 2** (Curtis) and **Autospec**: the property cards and styling inventory.
- **Spec Layer** and **Namma Component Docs**: full generated section.
- **Figma Specs** (beta) and the **Figma agent's** generated spec or design review.
- **Jira plugin and widget inside Figma**, and **Zeplin for Jira Pro**'s issue panel.
- Small community plugins with no readable description: Redlines, "Anatomy", Handoff Checklist,
  Annotate it!.

## 7. Open decisions

1. Where the criteria field is configured: Settings › Jira, or asked once per project.
2. Whether a Not met criterion blocks posting to Jira or only warns.
3. Whether the component spec shows one brand per page or a brand switcher row.

## Sources

Component documentation: [EightShapes Specs](https://nathanacurtis.substack.com/p/the-eightshapes-specs-figma-plugin-2892f21adc96) ·
[Component specifications](https://medium.com/eightshapes-llc/component-specifications-1492ca4c94c) ·
[Specs 2](https://www.figma.com/community/plugin/1549454283615386215/specs-2) ·
[Propstar](https://www.figma.com/community/plugin/1116018586739867857/propstar) ·
[Obra Autodocs](https://autodocs.obra.studio/) ·
[Component Documentation](https://www.figma.com/community/plugin/1630323657895870664/component-documentation) ·
[Autospec guide](https://figmaplugins.co/guides/figma-design-specs/) ·
[Spec Layer](https://spec-layer.com/designers/) ·
[DesignDoc Spectral](https://www.figma.com/community/plugin/1177722582033208360/designdoc-spectral-measures-annotations-and-handoff) ·
[Material 3 specs](https://m3.material.io/components/icon-buttons/specs) ·
[Dev Mode guide](https://help.figma.com/hc/en-us/articles/15023124644247-Guide-to-Dev-Mode-in-Figma)

Hand-off and Jira: [Figma Specs announcement](https://www.figma.com/blog/introducing-figma-specs/) ·
[Figma for Jira](https://help.figma.com/hc/en-us/articles/360039827834) ·
[figma-for-jira source](https://github.com/atlassian-labs/figma-for-jira) ·
[Zeplin Jira integration](https://zeplin.io/integrations/jira/) ·
[NN/g design specs](https://www.nngroup.com/articles/creating-design-specs-for-development/) ·
[Jira fields API](https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-fields) ·
[Atlassian Document Format](https://developer.atlassian.com/cloud/jira/platform/apis/document/structure/) ·
[Smart Checklist custom fields](https://railsware.atlassian.net/wiki/spaces/CHK/pages/1372422219/Custom+Fields+Guide) ·
[Cloud vs Data Center REST](https://community.developer.atlassian.com/t/what-are-the-differences-in-rest-apis-between-jira-data-center-and-jira-cloud/78178) ·
[LLM requirement checking](https://www.emergentmind.com/papers/2605.17926) ·
[Pixelay](https://www.hypermatic.com/pixelay.md)
