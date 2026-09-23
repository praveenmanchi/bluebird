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
const BUDGET_KB = 520
const file = resolve(import.meta.dirname, '../dist/index.html')
const kb = statSync(file).size / 1024
const status = kb <= BUDGET_KB ? 'OK' : 'OVER BUDGET'
console.log(`[size] dist/index.html = ${kb.toFixed(1)} KB (budget ${BUDGET_KB} KB) — ${status}`)
if (kb > BUDGET_KB) process.exit(1)
