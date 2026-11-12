// Accuracy suite: run the REAL scanner against the labelled cases on the
// "Accessibility · Ground truth" page and compare with each frame's expectation.
//
//   npm run gt          # needs `npm run dev:relay` and the bridge open in Figma,
//                       # with the ground-truth page as the current page
//
// Case frames are named "<id> · <title> ▸ <expect>", where <expect> is a
// comma-separated list of: none · contrast · contrast:aaa · assumed · nontext ·
// target · target:small · target:large · modes · unmeasurable (see
// tests/ground-truth/judge.ts). Unit tests prove the rules do what we meant;
// this proves they match what a designer sees in the file.
//
// The page is scanned once per run below — two readings of WCAG 2.2 on the web,
// then 2.1, 2.0, iOS and Android. A case answers the same way everywhere unless
// its name says otherwise ("… ▸ target:small | wcag20: none"), and it has to be
// right in every run.
import { WebSocket } from 'ws'
import { parseExpectation, judge, type CaseInput, type RunId, type ScanLike, type Verdict } from '../tests/ground-truth/judge'

const RELAY = 'ws://localhost:4001'
const PAGE = 'Accessibility · Ground truth'

interface Case { id: string; name: string; ids: string[] }

const RUNS: readonly { id: RunId; label: string; options: Record<string, unknown> }[] = [
  { id: 'wcag22', label: 'WCAG 2.2 · web · every instance walked', options: { dedupeInstances: false } },
  { id: 'wcag22', label: 'WCAG 2.2 · web · as the tab scans, repeated components once', options: {} },
  { id: 'wcag21', label: 'WCAG 2.1 · web · no 24px minimum, so no spacing exception', options: { standard: 'wcag21' } },
  { id: 'wcag20', label: 'WCAG 2.0 · web · no non-text or target-size criteria', options: { standard: 'wcag20' } },
  { id: 'ios', label: 'iOS · 44pt (Apple HIG), no spacing exception', options: { platform: 'ios' } },
  { id: 'android', label: 'Android · 48dp (Material), no spacing exception', options: { platform: 'android' } },
]

async function request<T>(ws: WebSocket, type: string, payload: unknown = {}): Promise<T> {
  const id = `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for ${type} — is the bridge open in Figma?`)), 60_000)
    const onMessage = (data: unknown) => {
      const msg = JSON.parse(String(data)) as { kind: string; id?: string; ok?: boolean; data?: T; error?: string }
      if (msg.kind !== 'response' || msg.id !== id) return
      clearTimeout(timer)
      ws.off('message', onMessage)
      if (msg.ok === false) reject(new Error(msg.error ?? `${type} failed`))
      else resolve(msg.data as T)
    }
    ws.on('message', onMessage)
    ws.send(JSON.stringify({ kind: 'request', id, type, payload }))
  })
}

function connect(): Promise<WebSocket> {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(`${RELAY}?role=browser`)
    ws.on('open', () => resolve(ws))
    ws.on('error', () => reject(new Error(`Could not reach the relay at ${RELAY}. Start it with \`npm run dev:relay\`.`)))
  })
}

async function main(): Promise<number> {
  const ws = await connect()
  try {
    // Expectations are read from layer names, so a window on a branch or an unsynced
    // copy would judge against the wrong text. Say which file answered.
    const where = await request<{ file: string; fileKey: string | null; page: string; cases: number }>(ws, 'dev:where')
    console.log(`[gt] reading "${where.file}"${where.fileKey ? ` (${where.fileKey})` : ''} › "${where.page.trim()}" — ${where.cases} cases`)
    const cases = (await request<Case[]>(ws, 'dev:cases')).filter((c) => /^GT-/.test(c.name))
    // Parsed once per run: a case may answer differently under another version or platform.
    const inputsFor = (run: RunId): CaseInput[] =>
      cases.map((c) => ({ id: c.id, name: c.name, ids: new Set(c.ids), expect: parseExpectation(c.name, run) }))

    let failed = 0
    for (const run of RUNS) {
      const inputs = inputsFor(run.id)
      const scan = await request<ScanLike>(ws, 'a11y:scan', { scope: 'page', ...run.options })
      if (scan.meta.page.trim().replace(/^↳\s*/, '') !== PAGE) {
        console.error(`[gt] the current Figma page is "${scan.meta.page}", not "${PAGE}". Open the ground-truth page and re-run.`)
        return 2
      }
      const verdicts = inputs.map((c) => judge(c, scan))
      console.log(`\n[gt] ${run.label}`)
      // Without the palette there are no per-brand verdicts to find, so say why
      // rather than let every `modes` case read as a scanner bug.
      if (scan.paletteError) console.log(`[gt] brand variables unavailable — ${scan.paletteError} Cases expecting "modes" cannot pass.`)
      print(verdicts)
      const wrong = verdicts.filter((v) => !v.pass).length
      console.log(wrong ? `[gt] ${wrong} of ${verdicts.length} cases WRONG` : `[gt] all ${verdicts.length} cases correct`)
      failed += wrong
    }
    return failed ? 1 : 0
  } finally {
    ws.close()
  }
}

function print(verdicts: readonly Verdict[]): void {
  const w = Math.max(...verdicts.map((v) => v.name.length))
  for (const v of verdicts) {
    const mark = v.pass ? '  ok  ' : ' WRONG'
    console.log(`${mark}  ${v.name.padEnd(w)}  expected ${v.expected.join(',') || 'none'}  got ${v.got.join(',') || 'none'}`)
  }
}

main().then((code) => process.exit(code)).catch((error: unknown) => {
  console.error(`[gt] ${error instanceof Error ? error.message : String(error)}`)
  process.exit(2)
})
