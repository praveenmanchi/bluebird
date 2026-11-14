// `npm run package` (after `npm run build`): copies manifest.json and the built files into
// release/<slug>/ and zips them as release/bluebird-<slug>.zip, ready to import in Figma.
// The slug is the brand for a single-brand build (BB_DEPLOY or plugin.config.json › deploy),
// "multi-brand" otherwise. A single-brand package is refused if the build still names another brand.
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { findLeaks, resolveDeploy } from '../tools/deploy/deploy'
import { PACKAGE_FILES, planPackage, publishSteps, type Manifest } from '../tools/deploy/package'
import { createZip, type ZipEntry } from '../tools/deploy/zip'

const root = resolve(import.meta.dirname, '..')
const read = (rel: string) => readFileSync(resolve(root, rel))
const raw = JSON.parse(read('plugin.config.json').toString('utf8')) as unknown
const deploy = resolveDeploy(raw, process.env)

if (deploy.mode === 'single') {
  const bundle = PACKAGE_FILES.map((f) => read(f).toString('utf8')).join('\n')
  const leaks = findLeaks(bundle, raw, deploy.brand)
  const blocking = leaks.filter((l) => l.severity === 'blocking')
  if (blocking.length) {
    console.error(`[package] dist/ still carries other brands, so it isn't a ${deploy.brand}-only build:`)
    for (const leak of blocking) console.error(`  - ${leak.brand}: ${leak.what}`)
    console.error(`[package] Build it for ${deploy.brand} first: BB_DEPLOY=${deploy.brand} npm run package`)
    process.exit(1)
  }
  const named = [...new Set(leaks.filter((l) => l.severity === 'warning').map((l) => l.brand))]
  if (named.length) console.warn(`[package] note: sample data in demo screens still names ${named.join(', ')} (not their tokens, logos or codes).`)
}

const config = raw as { brand: { brands: Record<string, { label?: string }> } }
const label = deploy.mode === 'single' ? config.brand.brands[deploy.brand]?.label ?? deploy.brand : 'all brands'
const plan = planPackage(JSON.parse(read('manifest.json').toString('utf8')) as Manifest, raw, deploy)
const entries: ZipEntry[] = [
  { path: 'manifest.json', data: new TextEncoder().encode(`${JSON.stringify(plan.manifest, null, 2)}\n`) },
  ...PACKAGE_FILES.map((f) => ({ path: f, data: new Uint8Array(read(f)) })),
  { path: 'HOW-TO-PUBLISH.txt', data: new TextEncoder().encode(publishSteps(plan, label)) },
]

const folder = resolve(root, 'release', plan.slug)
rmSync(folder, { recursive: true, force: true })
for (const entry of entries) {
  const target = resolve(folder, entry.path)
  mkdirSync(resolve(target, '..'), { recursive: true })
  writeFileSync(target, entry.data)
}
const zipName = `bluebird-${plan.slug}.zip`
writeFileSync(resolve(root, 'release', zipName), createZip(entries.map((e) => ({ ...e, path: `bluebird-${plan.slug}/${e.path}` }))))

console.log(`[package] ${label}: release/${zipName} (and release/${plan.slug}/)`)
console.log(`[package] manifest: "${String(plan.manifest.name)}", id ${String(plan.manifest.id)}`)
for (const note of plan.notes) console.warn(`[package] note: ${note}`)
