// Models asked for JSON still wrap it in prose or a code fence now and then.
// Pull the first JSON value out of a reply; null when there is none.

export function extractJson(text: string): unknown {
  const trimmed = text.trim()
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed)
  const candidates = [fenced?.[1]?.trim(), trimmed]
  for (const candidate of candidates) {
    if (!candidate) continue
    const direct = tryParse(candidate)
    if (direct !== undefined) return direct
    const start = Math.min(...['[', '{'].map((c) => candidate.indexOf(c)).filter((i) => i >= 0))
    if (!Number.isFinite(start)) continue
    const open = candidate[start]!
    const close = open === '[' ? ']' : '}'
    const end = candidate.lastIndexOf(close)
    if (end > start) {
      const inner = tryParse(candidate.slice(start, end + 1))
      if (inner !== undefined) return inner
    }
  }
  return null
}

function tryParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown
  } catch {
    return undefined
  }
}

/** The reply as an array of objects, whatever wrapping the model chose ({ findings: [...] }, [...], or a lone object). */
export function extractArray(text: string): Record<string, unknown>[] {
  const value = extractJson(text)
  const list = Array.isArray(value) ? value
    : typeof value === 'object' && value !== null
      ? (Object.values(value).find((v) => Array.isArray(v)) as unknown[] | undefined) ?? [value]
      : []
  return list.filter((x): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x))
}
