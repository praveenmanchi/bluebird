// Pure half of the ground-truth runner: parse a case's expectation from its
// frame name and decide whether the scan agreed. Unit tested so the runner
// itself only has to talk to the relay.

/**
 * contrast      — fails AA (1.4.3)
 * contrast:aaa  — clears AA but not AAA (1.4.6); the scanner reports these too
 * assumed       — the backdrop was assumed white, not measured
 */
export type Expectation = 'none' | 'contrast' | 'contrast:aaa' | 'assumed' | 'nontext' | 'target' | 'unmeasurable'

const KNOWN: readonly Expectation[] = ['none', 'contrast', 'contrast:aaa', 'assumed', 'nontext', 'target', 'unmeasurable']

/** "GT-C03 · text on rect inside group ▸ contrast" → ['contrast']. */
export function parseExpectation(frameName: string): Expectation[] {
  const marker = frameName.lastIndexOf('▸')
  if (marker < 0) throw new Error(`"${frameName}" has no ▸ expectation`)
  const list = frameName.slice(marker + 1).split(',').map((s) => s.trim()).filter(Boolean)
  for (const item of list) {
    if (!KNOWN.includes(item as Expectation)) throw new Error(`"${frameName}": unknown expectation "${item}"`)
  }
  return list.length === 1 && list[0] === 'none' ? [] : (list as Expectation[])
}

export interface CaseInput {
  id: string
  name: string
  /** Every node id inside the case frame. */
  ids: ReadonlySet<string>
  expect: readonly Expectation[]
}

/** The subset of ScanResult the judge needs — kept loose so the runner has no build dependency on the plugin. */
export interface ScanLike {
  meta: { page: string }
  issues: readonly { nodeIds: readonly string[]; level: string; assumedBackground?: boolean }[]
  nonText: readonly { nodeIds: readonly string[] }[]
  targets: readonly { nodeIds: readonly string[] }[]
  unmeasurable: readonly { nodeId: string }[]
}

export interface Verdict {
  id: string
  name: string
  expected: readonly Expectation[]
  got: readonly Expectation[]
  pass: boolean
}

/** What the scan actually said about the nodes inside one case. */
export function observed(c: CaseInput, scan: ScanLike): Expectation[] {
  const hit = (ids: readonly string[]) => ids.some((id) => c.ids.has(id))
  const got = new Set<Expectation>()
  for (const i of scan.issues) {
    if (!hit(i.nodeIds)) continue
    got.add(i.level === 'fail' ? 'contrast' : 'contrast:aaa')
    if (i.assumedBackground) got.add('assumed')
  }
  for (const n of scan.nonText) if (hit(n.nodeIds)) got.add('nontext')
  for (const t of scan.targets) if (hit(t.nodeIds)) got.add('target')
  for (const u of scan.unmeasurable) if (c.ids.has(u.nodeId)) got.add('unmeasurable')
  return [...got].sort()
}

export function judge(c: CaseInput, scan: ScanLike): Verdict {
  const got = observed(c, scan)
  const expected = [...c.expect].sort()
  return { id: c.id, name: c.name, expected, got, pass: got.join() === expected.join() }
}
