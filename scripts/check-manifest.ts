// Figma manifest limits. Figma only validates manifest.json when the plugin is
// imported, so a manifest that breaks its rules builds, tests and ships fine and
// then fails in the designer's hands with a red "Manifest error" toast.
//
// 2026-11-13: `networkAccess.reasoning` went past 1000 characters when the GitHub
// Enterprise host was added, and nothing caught it until the import failed. These
// are the rules that have a documented limit and a cheap check.
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

/** Figma's cap on the plugin-review justification, from the import error: "must be less than 1000 characters". */
const REASONING_MAX = 1000

interface Manifest {
  networkAccess?: { allowedDomains?: unknown; devAllowedDomains?: unknown; reasoning?: unknown }
}

const file = resolve(import.meta.dirname, '../manifest.json')
const manifest = JSON.parse(readFileSync(file, 'utf8')) as Manifest
const problems: string[] = []

const net = manifest.networkAccess
if (!net) problems.push('networkAccess is missing: the plugin makes network requests, so Figma needs it.')

const reasoning = typeof net?.reasoning === 'string' ? net.reasoning : ''
if (net && !reasoning) problems.push('networkAccess.reasoning is missing or not a string.')
else if (reasoning.length >= REASONING_MAX) {
  problems.push(`networkAccess.reasoning is ${reasoning.length} characters; Figma rejects the manifest at ${REASONING_MAX} or more. Trim ${reasoning.length - REASONING_MAX + 1}.`)
}

// A domain is a scheme + host ("https://api.github.com", "https://*.azure.com"), or the
// catch-alls "*" / "none". A trailing slash makes it a path prefix, which is allowed.
const DOMAIN = /^([a-z]+:\/\/[^/]+(\/.*)?|\*|none)$/
for (const key of ['allowedDomains', 'devAllowedDomains'] as const) {
  const list = net?.[key]
  if (list === undefined) continue
  if (!Array.isArray(list)) { problems.push(`networkAccess.${key} must be an array.`); continue }
  for (const entry of list) {
    if (typeof entry !== 'string' || !DOMAIN.test(entry)) problems.push(`networkAccess.${key}: "${String(entry)}" is not a scheme + host.`)
    // Figma documents "none" as invalid here, unlike allowedDomains.
    if (key === 'devAllowedDomains' && entry === 'none') problems.push('networkAccess.devAllowedDomains cannot contain "none".')
  }
}

const headline = `reasoning ${reasoning.length}/${REASONING_MAX - 1} chars, ${Array.isArray(net?.allowedDomains) ? net.allowedDomains.length : 0} allowed domains`
if (problems.length) {
  console.error(`[manifest] ${headline} — FAILED`)
  for (const p of problems) console.error(`  - ${p}`)
  process.exit(1)
}
console.log(`[manifest] ${headline} — OK`)
