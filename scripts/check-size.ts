// Bundle-size budget. Fails the build if the inlined UI grows past the limit,
// because every byte of dist/index.html is parsed on every plugin open.
import { statSync } from 'node:fs'
import { resolve } from 'node:path'

// 2026-09-21: the full 38-component library ships in one file — ~150 KB of component
// CSS/JS + tokens, ~85 KB for 69 icon glyphs, ~55 KB of artwork (the Bridge wordmark is
// outlined text; Fabric + integration logos). Path data is rounded to 2 decimals by the
// generator. 2026-09-22: all five brands' CSS and logos ship because the access code picks the
// brand at runtime (+~85 KB). 2026-09-23: the WcagCard organism grew the eleven card-level
// sections from the market analysis — fix/token rows, brand-mode strip, text metrics, manual
// checks, snippet, thumbnails, ignore banner (+~21 KB of CSS/JS and two glyphs).
// 2026-09-23 (later): roadmap items 4-6 added WCAG 1.4.11 + 2.5.8 collectors, the
// token/brand-mode resolver, Dev Mode annotations and the report builder (+~12 KB).
//
// This is the SECOND raise in one day, which is the signal the comment above
// anticipated. The cheap levers are gone; the two real ones left are (a) shipping
// only the active brand's CSS and logos instead of all five (~85 KB, but it
// changes the access-code model) and (b) per-tab code splitting, which needs the
// single-file inlining to become multi-chunk. Decide one before the next raise.
// 2026-10-09: decided — raise. The Jira, MCP, UX AI and AI Agents tabs plus their 40
// components (Figma sections Jira/MCP/AI/Agents) ship in one go; the user chose a raise over
// one-brand builds or code splitting, both still open as the levers for the next one.
// The first estimate (640) was too low: the build came out at 811 KB (~300 KB of it the new
// jira/mcp/uxai/agents tokens + their derived geometry), and the user re-confirmed the raise.
// 2026-10-11: raise again, user's call. The login redesign (7 components, the SSO card, 64
// login/* tokens × 5 brands) plus the publish/* and a11y/* Brand UI tokens that came in with the
// same pull (~17 KB, read by no code yet) took the build to 860 KB. The levers above are
// still open; pruning tokens no code reads is a third, smaller one.
// 2026-10-11 (later): raise again, user's call. Settings · Integrations (8 sections, TextArea,
// sandbox store) took the build to 922 KB: ~22 KB code, ~22 KB newly referenced glyphs (AI
// provider marks, api-key, branch, url…), ~18 KB settings/* + input/textarea tokens and the
// frame's derived geometry (~8 KB of it read by no code). Same levers as above.
// 2026-10-11 (live Jira): raise again, user's call. The live Jira tab (load / refresh / write
// actions, Loading / Not connected / Error / Refresh failed states, search + filter toggles)
// took the build to 937 KB; the REST client itself ships only in dist/code.js. Same levers as
// above (dropping mock mode from production builds was measured: < 1 KB, not a lever).
// 2026-10-11 (onboarding): raise again, user's call. The first-run product tour (Figma
// "Onboarding flow") with its eight demo scenes rebuilt as CSS/JS animations from the existing
// components took the build to 995 KB: ~20 KB onboarding/* tokens × 5 brands + derived geometry,
// ~25–30 KB tour screen + scene engine + scenes, the rest from other Figma edits in the same pull.
// The user chose CSS scenes over hosted videos (which would have cost ~0 KB). Same levers as above.
// 2026-10-11 (WCAG card check types): raise again, user's call. Touch-target and Vision card
// modes with TypeCompare, TargetPreview, VisionSimTile/Grid and the colour-vision maths, plus the
// four sets' tokens and derived geometry, took the build to 1007.8 KB (~19 KB). Same levers as above.
// 2026-10-11 (Dual File Mode): raise again, user's call. The build was already 1029.7 KB before this
// work. Dual File roles + Test Connection, UXAI answers grounded in the library index (search,
// selection check, LibraryAnswer/LibraryStatus) took it to 1050.9 KB (~21 KB). The REST loader itself
// ships only in dist/code.js (the mock's copy is dev-only). Same levers as above.
// 2026-10-11 (live footer + Claude + a11y Ready to scan): raise again, user's call. Live footer pills,
// UXAI's Claude wiring, the Accessibility "Ready to scan" panel (rules, principles, selection summary)
// and the fluid WCAG card took the build to 1060.2 KB. Same levers as above.
// 2026-10-11 (Publish tab + MCP 600 layout): raise again, user's call. The Publish tab (extract,
// diff, release notes, four steps and their empty/error states) and its 11 components with their
// derived geometry, plus the MCP tab's stepped 600px rebuild from a parallel session, took the
// build to 1138 KB (Publish alone ≈ 33 KB). Same levers as above.
// 2026-10-13 (live agents + providers): raise again. The UX AI agents went from fixtures to real runs
// (run actions, streamed progress, apply / annotate / report / chat, the typed Voice composer), UX AI
// gained the type ramp and the colour artifact from library styles, Settings gained "Answer with" and
// "Add another library file", and the shared AI module replaced the Claude-only client: 1178.5 KB
// (+40 KB). The rule packs, the REST loaders and the provider clients ship in dist/code.js. Same
// levers as above: one-brand builds, per-tab code splitting, pruning unread tokens.
// 2026-10-14 (WCAG 2.0 / 2.1 in the Standard dropdown): the standards table, per-version rule
// filtering and W3C links added ~1 KB on a separate branch; folded into the 1200 KB budget above
// when the branches merged on 2026-10-15.
// 2026-10-27 (UI Icons replace the Variables placeholder): user raised the budget to 1210 KB. Six `ui-*` glyphs
// (variable color/value, sidebar libraries, toolbar component, general add/check) added ~5.5 KB; UI icon
// paths are already rounded to one decimal and minified. Same levers as above.
// 2026-10-27 (Tab sub menu on every tab-selection row): user raised the budget to 1220 KB. ~20 `ui-*`
// glyphs for the per-item icons (scope, severity, file type, activity, mode) added ~14 KB: 1214.4 KB.
// 2026-10-27 (AkzoNobel + Adecco brand modes): user raised the budget to 1310 KB. Every brand's Brand UI
// CSS is inlined (~36 KB raw each) and the Figma pull brought ~70 unread docs/* tokens per brand: 1301.5 KB.
// One-brand builds remain the lever; each further brand needs ~40 KB.
// 2026-10-28 (Variable search tab): user raised the budget to 1330 KB. The tab (Pages/Type filters,
// search, Variable search cards with Show layers / Go to, recent searches, toasts), its onboarding
// scene and the reflowed card CSS took the build from 1302 to 1323 KB (~21 KB). Same levers as above.
// 2026-10-28 (Gap brand mode, Bridge-based): user raised the budget to 1370 KB. The eighth brand's Brand UI
// CSS, gap/* foundations and the stacked GAP INC. logo took the build to 1360.9 KB (~38 KB). One-brand
// builds remain the lever.
// 2026-11-06 (Variable mapper + Component audit tabs, persona screens): user raised the budget to 1430 KB.
// The two tabs and their tour scenes added ~33 KB (matching, scans and Library Analytics ship in dist/code.js;
// their mocks are dev-only), the splash and persona screens ~32 KB: 1426.2 KB. One-brand builds remain the lever.
// 2026-11-10 (a11y Export menu, Figma report + developer spec, a11y/report/* tokens): user raised the budget to 1440 KB.
// 2026-11-12 (Extraction tab): user raised the budget to 1460 KB. The tab (branch picker, results, push card,
// sandbox handlers' UI contract) plus the base64 helper added ~16 KB; build 1456.2 KB.
// 2026-11-12 (History tab): user raised the budget to 1490 KB. The tab (timeline, entry card, entry details),
// the shared history store/recorder and the extraction → History entry added ~26 KB; build 1486.4 KB.
// 2026-11-12 (Settings › Storage + automatic History sync): user raised the budget to 1500 KB. The Storage section,
// the background check / History tab badge and the refresh icon added ~6 KB; build 1492.2 KB.
// 2026-11-12 (Changelog generator in History): user raised the budget to 1510 KB. The New changelog pop-up,
// the review/approve states and their sample data took the build to 1508.7 KB.
// 2026-11-12 (Accessibility accuracy audit): user raised the budget to 1515 KB. The ten scanner fixes (target
// citations, platform guideline references, the AA-only verdict) added ~1.8 KB; build 1510.5 KB.
// 2026-11-12 (Accessibility open items): user raised the budget to 1525 KB. Confidence labels, ignoring a
// finding, gradient backdrops and the palette-failure notice added ~5 KB; build 1515.8 KB.
// 2026-11-13 (headroom, no new UI code): user raised the budget to 1540 KB. Nothing in dist/index.html grew
// for this one — the Storage work changed `manifest.json` (the GitHub Enterprise host in networkAccess) and
// the storage repository, neither of which is bundled — but the build sits at 1516.4 KB, 8.6 KB under the old
// 1525 KB ceiling, so the next glyph or token pull would have tripped the gate. Same levers as above:
// one-brand builds, per-tab code splitting, pruning unread tokens.
// 2026-11-13 (Team setup file): user raised the budget to 1560 KB. Exporting and importing Settings as one
// JSON (the file format, the Import / export menu and pop-ups, and the team setup screen after the tour)
// added ~25 KB; build 1541.5 KB.
// 2026-11-15 (Change Item impact row): user raised the budget to 1580 KB. The Change count atom took the
// build to 1559.8 KB; the Show impact row on Change Item and the Number value count on Tab selecters,
// both followed from Figma, took it to 1560.7 KB.
// 2026-11-15 (Documentation tab): user raised the budget to 1630 KB. The tab (Components and Hand-off
// flows, its styles and three glyphs) added ~33 KB; build 1623.5 KB. Same levers as above.
// 2026-11-15 (MCP v3 + Library update): user raised the budget to 1650 KB. Per-scenario repositories,
// pull-request tracking and the Library update flow (releases, impact scan, per-screen hand-off) added
// ~17 KB; build 1642.2 KB. Same levers as above.
// 2026-11-15 (Variable search report + UI fixes): user raised the budget to 1670 KB. Copy and Add to Figma
// on Search results (report model, action bar), the report/* tokens for the white canvas report, plus the
// day's UI fixes (Gap states, full-width switches, recent-search expand, search bar Show icon) took the
// build to 1653.0 KB. Same levers as above.
// 2026-11-15 (Intro screens): user raised the budget to 1740 KB. The Figma API key screen (with the
// designer's 25 KB token-list screenshot), the coach-mark layout + 12 tab intros, What's new and the
// footer info button, plus 31 intro/* Brand UI tokens × 8 brands took the build to 1731.3 KB.
// 2026-11-26 (40 brand modes): no raise. Richemont, Disney, Fiskars, AkzoNobel and Adecco left and 37
// client brands arrived (40 modes, Figma's cap). gen-tokens now writes one shared brand.default.css on
// [data-brand] with Brand UI aliases kept as var(), so each brand file holds only its own values (~2 KB
// instead of ~41 KB): brand CSS went from ~330 KB for 8 brands to ~116 KB for 40. The 37 logos add
// ~175 KB; build 1728.5 KB.
// 2026-11-27 (sign-in confirm code + Phase 2): user raised the budget to 1745 KB. The confirm code in
// the waiting row (three sign-in messages were shortened to fit it at 1740.0) plus the plugin headers
// on keys and poll took the build 61 bytes over; ~5 KB left for Jira sign-in and Bitbucket.
// 2026-11-28 (access-code login analytics + Bitbucket code host + typed confirm code): user raised the
// budget to 1750 KB. The build came to 1745.6 KB; the login report (src/shared/analytics) is ~0.5 KB of it.
const BUDGET_KB = 1750
const file = resolve(import.meta.dirname, '../dist/index.html')
const kb = statSync(file).size / 1024
const status = kb <= BUDGET_KB ? 'OK' : 'OVER BUDGET'
console.log(`[size] dist/index.html = ${kb.toFixed(1)} KB (budget ${BUDGET_KB} KB) — ${status}`)
if (kb > BUDGET_KB) process.exit(1)
