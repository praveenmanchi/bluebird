// Bundle-size budget. Fails the build if the inlined UI grows past the limit,
// because every byte of dist/index.html is parsed on every plugin open.
import { statSync } from 'node:fs'
import { resolve } from 'node:path'

// 2026-09-21: the full 38-component library ships in one file — ~150 KB of component
// CSS/JS + tokens, ~85 KB for 69 icon glyphs, ~55 KB of artwork (the Bridge wordmark is
// outlined text; Fabric + integration logos). Path data is rounded to 2 decimals by the
// generator. 2026-09-22: all five brands' CSS and logos ship because the access code picks the
// brand at runtime (+~85 KB). Reduce further by per-tab code splitting or a simplified Bridge mark.
const BUDGET_KB = 450
const file = resolve(import.meta.dirname, '../dist/index.html')
const kb = statSync(file).size / 1024
const status = kb <= BUDGET_KB ? 'OK' : 'OVER BUDGET'
console.log(`[size] dist/index.html = ${kb.toFixed(1)} KB (budget ${BUDGET_KB} KB) — ${status}`)
if (kb > BUDGET_KB) process.exit(1)
