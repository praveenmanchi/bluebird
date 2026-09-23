// Accuracy suite: run the REAL scanner against the labelled cases on the
// "Accessibility · Ground truth" page and compare with each frame's expectation.
//
//   npm run gt          # needs `npm run dev:relay` and the bridge open in Figma,
//                       # with the ground-truth page as the current page
//
// Case frames are named "<id> · <title> ▸ <expect>", where <expect> is a
// comma-separated list of: none · contrast · contrast:assumed · nontext ·
// target · unmeasurable. Unit tests prove the rules do what we meant; this
// proves they match what a designer sees in the file.
import { WebSocket } from 'ws'
import { parseExpectation, judge, type CaseInput, type ScanLike, type Verdict } from '../tests/ground-truth/judge'

const RELAY = 'ws://localhost:4001'
const PAGE = 'Accessibility · Ground truth'

interface Case { id: string; name: string; ids: string[] }

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
    const scan = await request<ScanLike>(ws, 'a11y:scan', { scope: 'page', dedupeInstances: false })
    if (scan.meta.page !== PAGE) {
      console.error(`[gt] the current Figma page is "${scan.meta.page}", not "${PAGE}". Open the ground-truth page and re-run.`)
      return 2
    }
    const cases = await request<Case[]>(ws, 'dev:cases')
    const inputs: CaseInput[] = cases
      .filter((c) => /^GT-/.test(c.name))
      .map((c) => ({ id: c.id, name: c.name, ids: new Set(c.ids), expect: parseExpectation(c.name) }))

    const verdicts = inputs.map((c) => judge(c, scan))
    print(verdicts)
    const failed = verdicts.filter((v) => !v.pass).length
    console.log(failed ? `\n[gt] ${failed} of ${verdicts.length} cases WRONG` : `\n[gt] all ${verdicts.length} cases correct`)
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
