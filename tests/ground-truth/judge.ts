// Pure half of the ground-truth runner: parse a case's expectation from its
// frame name and decide whether the scan agreed. Unit tested so the runner
// itself only has to talk to the relay.

/**
 * contrast      — fails AA (1.4.3)
 * contrast:aaa  — clears AA but not AAA (1.4.6); the scanner reports these too
 * assumed       — the backdrop was assumed white, not measured
 * target        — a target-size finding, whichever bar it misses
 * target:small  — a target under 24px
 * target:large  — a target of 24px or more that still misses the bar it was measured against
 * modes         — the contrast finding is judged in every brand mode (opt-in: only checked where a case asks for it)
 */
export type Expectation = 'none' | 'contrast' | 'contrast:aaa' | 'assumed' | 'nontext' | 'target' | 'target:small' | 'target:large' | 'modes' | 'unmeasurable'

const KNOWN: readonly Expectation[] = ['none', 'contrast', 'contrast:aaa', 'assumed', 'nontext', 'target', 'target:small', 'target:large', 'modes', 'unmeasurable']

/** 2.5.8's minimum, repeated here so the runner has no build dependency on the plugin. */
const TARGET_MIN_AA = 24

/**
 * The configurations the suite scans in. A case answers the same way in all of
 * them unless its name says otherwise, which keeps the common case readable.
 */
export type RunId = 'wcag22' | 'wcag21' | 'wcag20' | 'ios' | 'android'

export const RUN_IDS: readonly RunId[] = ['wcag22', 'wcag21', 'wcag20', 'ios', 'android']

export const DEFAULT_RUN: RunId = 'wcag22' 

/**
 * What a case expects in one run.
 *
 * "GT-C03 · text on rect inside group ▸ contrast" → ['contrast'] in every run.
 * A run whose answer differs says so after a pipe, and only that run reads it:
 * "GT-T02 · two 16px targets ▸ target:small | wcag20: none".
 */
export function parseExpectation(frameName: string, run: RunId = DEFAULT_RUN): Expectation[] {
  const marker = frameName.lastIndexOf('▸')
  if (marker < 0) throw new Error(`"${frameName}" has no ▸ expectation`)
  const [fallback = '', ...overrides] = frameName.slice(marker + 1).split('|')
  let text = fallback
  for (const override of overrides) {
    const at = override.indexOf(':')
    if (at < 0) throw new Error(`"${frameName}": an override reads "<run>: <expectation>"`)
    const id = override.slice(0, at).trim()
    if (!RUN_IDS.includes(id as RunId)) throw new Error(`"${frameName}": unknown run "${id}"`)
    if (id === run) text = override.slice(at + 1)
  }
  const list = text.split(',').map((s) => s.trim()).filter(Boolean)
  if (!list.length) throw new Error(`"${frameName}" has no ▸ expectation`)
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
  /** Set when the brand palette could not be read: then no case can expect `modes`. */
  paletteError?: string
  issues: readonly { nodeIds: readonly string[]; level: string; assumedBackground?: boolean; brandModes?: readonly unknown[] }[]
  nonText: readonly { nodeIds: readonly string[] }[]
  targets: readonly { nodeIds: readonly string[]; width?: number; height?: number }[]
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
    if (i.brandModes?.length) got.add('modes')
  }
  for (const n of scan.nonText) if (hit(n.nodeIds)) got.add('nontext')
  for (const t of scan.targets) {
    if (!hit(t.nodeIds)) continue
    // A scan that does not say the size is only known to have found a target.
    if (t.width === undefined || t.height === undefined) got.add('target')
    else got.add(Math.min(t.width, t.height) < TARGET_MIN_AA ? 'target:small' : 'target:large')
  }
  for (const u of scan.unmeasurable) if (c.ids.has(u.nodeId)) got.add('unmeasurable')
  return [...got].sort()
}

export function judge(c: CaseInput, scan: ScanLike): Verdict {
  const expected = [...c.expect].sort()
  // Older cases say only "target", and only some cases ask about brand modes: compare at the detail the case asked for.
  const loose = expected.includes('target')
  const seen = observed(c, scan)
    .map((e): Expectation => (loose && (e === 'target:small' || e === 'target:large') ? 'target' : e))
    .filter((e) => e !== 'modes' || expected.includes('modes'))
  const got = [...new Set(seen)].sort()
  return { id: c.id, name: c.name, expected, got, pass: got.join() === expected.join() }
}
