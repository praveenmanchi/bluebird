// Visual parity: Figma's own render of a variant, next to Storybook's render of the
// story that claims to be that variant.
//
//   npm run figma:visual
//   npm run figma:visual -- --component Button --brand ikea
//   npm run figma:visual -- --max-diff 2          # exit 1 above 2% differing pixels
//
// Needs FIGMA_TOKEN (GET /v1/images works on every Figma plan) and, once,
// `npx playwright install chromium`.
//
// READ THIS BEFORE TRUSTING A NUMBER. Figma and a browser will never agree pixel for
// pixel: Figma rasterises Noto Sans itself while the page loads it from Google Fonts,
// antialiasing differs, and Figma exports the node with no surrounding page. So this
// defaults to reporting only (--max-diff 100) and is deliberately kept out of
// `npm run verify`. What it is good for is structural drift — a moved element, a wrong
// size, a missing layer — which no token check can see. Open report.html and use your eyes;
// the percentage is a sort order, not a verdict.
import { mkdirSync, writeFileSync, readFileSync, existsSync, rmSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { createServer, type Server } from 'node:http'
import { extname } from 'node:path'
import { chromium, type Browser } from 'playwright'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import { ROOT, readManifest } from './figma-pull'
import { FIGMA_COMPONENTS } from '../src/shared/brand/generated/tokens'
import { readInputs } from './gen-tokens'
import { brandIdFromMode } from '../src/shared/brand/snapshot'

const OUT = resolve(ROOT, 'figma/visual')
const STATIC = resolve(ROOT, 'storybook-static')
const SCALE = 2

interface Pairing { component: string; variant: string; nodeId: string; storyId: string }
interface Result extends Pairing { brand: string; diffPct: number | null; note?: string }

interface StoryIndex { entries: Record<string, { id: string; title: string; name: string; type: string }> }

// ------------------------------------------------------------------- pairing

/** Story ↔ Figma node. The pairing already exists in the repo — every story declares
 *  `parameters.figma.setId` + `.variant`, and FIGMA_COMPONENTS carries each variant's node id
 *  (tests/tokens/figma-story-coverage.test.ts already enforces one story per variant). Those
 *  parameters are not in index.json, so ask Storybook's own preview for them: story names like
 *  "Primary Default" do not resemble variant names like "Type=Primary, State=Default, Size=Medium",
 *  and guessing from the name pairs less than half of them. */
async function pairings(browser: Browser, port: number, only: Set<string>): Promise<Pairing[]> {
  const indexFile = resolve(STATIC, 'index.json')
  if (!existsSync(indexFile)) throw new Error('storybook-static/index.json is missing — run `npm run build-storybook` first')
  const index = JSON.parse(readFileSync(indexFile, 'utf8')) as StoryIndex
  const stories = Object.values(index.entries).filter((e) => e.type === 'story')

  const byCode = new Map<string, { code: string; set: { variants: readonly { id: string; name: string }[] } }>(Object.entries(FIGMA_COMPONENTS).map(([code, set]) => [set.id, { code, set }]))
  const page = await browser.newPage()
  const out: Pairing[] = []
  try {
    await page.goto(`http://localhost:${port}/iframe.html?id=${stories[0]!.id}&viewMode=story`, { waitUntil: 'networkidle', timeout: 30_000 })
    for (const story of stories) {
      const figma = await page.evaluate(async (id) => {
        const preview = (window as unknown as { __STORYBOOK_PREVIEW__?: { loadStory(a: { storyId: string }): Promise<{ parameters?: { figma?: { setId?: string; variant?: string } } }> } }).__STORYBOOK_PREVIEW__
        if (!preview) return null
        try { return (await preview.loadStory({ storyId: id })).parameters?.figma ?? null } catch { return null }
      }, story.id)
      if (!figma?.setId || !figma.variant) continue
      const entry = byCode.get(figma.setId)
      if (!entry || (only.size && !only.has(entry.code))) continue
      const variant = entry.set.variants.find((v) => v.name === figma.variant)
      if (!variant) continue
      out.push({ component: entry.code, variant: variant.name, nodeId: variant.id, storyId: story.id })
    }
  } finally {
    await page.close()
  }
  return out
}

// -------------------------------------------------------------- figma export

async function figmaPngs(fileKey: string, nodeIds: string[]): Promise<Map<string, Buffer>> {
  const token = process.env.FIGMA_TOKEN
  if (!token) throw new Error('FIGMA_TOKEN is not set')
  const out = new Map<string, Buffer>()
  const cacheDir = resolve(OUT, '.cache')
  mkdirSync(cacheDir, { recursive: true })
  const missing: string[] = []
  for (const id of nodeIds) {
    const cached = resolve(cacheDir, `${id.replace(':', '-')}.png`)
    if (existsSync(cached)) out.set(id, readFileSync(cached))
    else missing.push(id)
  }
  // /images caps the id list; 50 at a time keeps the URL sane and the render queue short.
  for (let i = 0; i < missing.length; i += 50) {
    const batch = missing.slice(i, i + 50)
    const res = await fetch(`https://api.figma.com/v1/images/${fileKey}?ids=${encodeURIComponent(batch.join(','))}&format=png&scale=${SCALE}`, { headers: { 'X-Figma-Token': token } })
    if (!res.ok) throw new Error(`Figma images API ${res.status}: ${await res.text()}`)
    const { images } = (await res.json()) as { images: Record<string, string | null> }
    for (const [id, url] of Object.entries(images)) {
      if (!url) continue
      const png = Buffer.from(await (await fetch(url)).arrayBuffer())
      writeFileSync(resolve(cacheDir, `${id.replace(':', '-')}.png`), png)
      out.set(id, png)
    }
  }
  return out
}

// ----------------------------------------------------------------- storybook

const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2' }

function serveStatic(dir: string): Promise<{ server: Server; port: number }> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost')
    const file = resolve(dir, `.${url.pathname}`.replace(/\/$/, '/index.html'))
    if (!file.startsWith(dir) || !existsSync(file)) { res.writeHead(404).end(); return }
    res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file))
  })
  return new Promise((ok) => server.listen(0, () => ok({ server, port: (server.address() as { port: number }).port })))
}

async function shoot(browser: Browser, port: number, storyId: string, brand: string): Promise<Buffer | null> {
  const page = await browser.newPage({ deviceScaleFactor: SCALE })
  try {
    await page.goto(`http://localhost:${port}/iframe.html?id=${storyId}&globals=brand:${brand}&viewMode=story`, { waitUntil: 'networkidle', timeout: 20_000 })
    // Storybook's root is a full-width block, so an unclipped shot is always viewport-wide and
    // every diff comes out ~100%. Hugging the content is what makes the comparison mean anything:
    // WcagCard goes 1280px → 491px against Figma's 465px frame.
    await page.addStyleTag({ content: '#storybook-root{display:inline-block !important;width:max-content !important}' })
    const root = page.locator('#storybook-root > *').first()
    await root.waitFor({ state: 'visible', timeout: 10_000 })
    return await root.screenshot({ type: 'png' })
  } catch {
    return null
  } finally {
    await page.close()
  }
}

// ---------------------------------------------------------------------- diff

/** Compare at the smaller of the two sizes and charge the size difference as diffing pixels,
 *  so a component that renders at the wrong size cannot score 0%. */
function comparePng(a: Buffer, b: Buffer, outFile: string): number {
  const left = PNG.sync.read(a)
  const right = PNG.sync.read(b)
  const width = Math.min(left.width, right.width)
  const height = Math.min(left.height, right.height)
  const crop = (src: PNG) => { const d = new PNG({ width, height }); PNG.bitblt(src, d, 0, 0, width, height, 0, 0); return d }
  const l = crop(left)
  const r = crop(right)
  const diff = new PNG({ width, height })
  const differing = pixelmatch(l.data, r.data, diff.data, width, height, { threshold: 0.2 })
  const overflow = Math.max(left.width * left.height, right.width * right.height) - width * height
  mkdirSync(dirname(outFile), { recursive: true })
  writeFileSync(outFile, PNG.sync.write(diff))
  const total = width * height + overflow
  return total ? Math.round(((differing + overflow) / total) * 10000) / 100 : 0
}

function writeReport(results: Result[]) {
  writeFileSync(resolve(OUT, 'report.json'), `${JSON.stringify(results, null, 2)}\n`)
  const rows = [...results].sort((a, b) => (b.diffPct ?? -1) - (a.diffPct ?? -1)).map((r) => {
    const base = `${r.component}/${r.variant.replace(/[^\w=,-]+/g, '_')}.${r.brand}`
    if (r.diffPct === null) return `<tr><td>${r.component}</td><td>${r.variant}</td><td>${r.brand}</td><td colspan="4">${r.note ?? 'skipped'}</td></tr>`
    return `<tr><td>${r.component}</td><td>${r.variant}</td><td>${r.brand}</td><td class="n">${r.diffPct}%</td>
      <td><img src="${base}.figma.png"></td><td><img src="${base}.code.png"></td><td><img src="${base}.diff.png"></td></tr>`
  }).join('\n')
  writeFileSync(resolve(OUT, 'report.html'), `<!doctype html><meta charset="utf-8"><title>Figma vs Storybook</title>
<style>body{font:13px/1.5 system-ui;margin:24px;background:#fafafa}table{border-collapse:collapse}td,th{border-bottom:1px solid #e4e4e7;padding:8px;vertical-align:top}img{max-width:240px;display:block;background:#fff}.n{font-variant-numeric:tabular-nums;font-weight:600}</style>
<h1>Figma vs Storybook</h1>
<p>Percentages are a sort order, not a verdict — fonts and antialiasing always differ. Look for shape, size and missing layers.</p>
<table><tr><th>Component<th>Variant<th>Brand<th>Diff<th>Figma<th>Code<th>Delta</tr>
${rows}</table>\n`)
}

// --------------------------------------------------------------------- main

async function main() {
  const argv = process.argv.slice(2)
  if (argv.includes('--help')) {
    console.log('npm run figma:visual -- [--component <Name>]… [--brand <id>]… [--max-diff <pct>] [--update-cache]')
    return
  }
  const only = new Set(argv.flatMap((a, i) => (a === '--component' ? [argv[i + 1]!] : [])))
  const brandFilter = new Set(argv.flatMap((a, i) => (a === '--brand' ? [argv[i + 1]!] : [])))
  const maxDiffIdx = argv.indexOf('--max-diff')
  const maxDiff = maxDiffIdx >= 0 ? Number(argv[maxDiffIdx + 1]) : 100
  if (argv.includes('--update-cache')) rmSync(resolve(OUT, '.cache'), { recursive: true, force: true })

  const manifest = readManifest()
  const { tokens } = readInputs()
  const brands = tokens.collections.find((c) => c.key === 'brand')?.modes.map(brandIdFromMode) ?? []
  const wanted = brands.filter((b) => !brandFilter.size || brandFilter.has(b))

  const { server, port } = await serveStatic(STATIC)
  const browser = await chromium.launch()
  const results: Result[] = []
  try {
    const pairs = await pairings(browser, port, only)
    if (!pairs.length) throw new Error('no story ↔ Figma variant pairs found — check --component, or run `npm run build-storybook`')
    console.log(`[figma:visual] ${pairs.length} variant(s) × ${wanted.length} brand(s)`)
    const pngs = await figmaPngs(manifest.fileKey, [...new Set(pairs.map((p) => p.nodeId))])
    for (const pair of pairs) {
      const figma = pngs.get(pair.nodeId)
      for (const brand of wanted) {
        const base = resolve(OUT, pair.component, `${pair.variant.replace(/[^\w=,-]+/g, '_')}.${brand}`)
        if (!figma) { results.push({ ...pair, brand, diffPct: null, note: 'Figma returned no image for this node' }); continue }
        const code = await shoot(browser, port, pair.storyId, brand)
        if (!code) { results.push({ ...pair, brand, diffPct: null, note: 'the story did not render' }); continue }
        mkdirSync(dirname(base), { recursive: true })
        writeFileSync(`${base}.figma.png`, figma)
        writeFileSync(`${base}.code.png`, code)
        const diffPct = comparePng(figma, code, `${base}.diff.png`)
        results.push({ ...pair, brand, diffPct })
        console.log(`  ${diffPct.toFixed(2).padStart(6)}%  ${pair.component} · ${pair.variant} · ${brand}`)
      }
    }
  } finally {
    await browser.close()
    server.close()
  }

  writeReport(results)
  const over = results.filter((r) => r.diffPct !== null && r.diffPct > maxDiff)
  const skipped = results.filter((r) => r.diffPct === null)
  console.log(`[figma:visual] ${results.length - skipped.length} compared, ${skipped.length} skipped · open figma/visual/report.html`)
  if (over.length) console.error(`[figma:visual] ${over.length} over --max-diff ${maxDiff}%: ${over.map((r) => `${r.component}/${r.variant}/${r.brand}`).join(', ')}`)
  process.exit(over.length ? 1 : 0)
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  await main().catch((error: unknown) => { console.error(`[figma:visual] ${error instanceof Error ? error.message : String(error)}`); process.exit(2) })
}
