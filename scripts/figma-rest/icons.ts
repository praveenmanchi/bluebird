// Icon SVGs over REST: GET /v1/images renders each variant of the manifest's icon sets to SVG.
import { iconKey, iconLabel, oneVariantPerGlyph } from '../../src/shared/brand/extract'
import type { IconEntry, IconsSnapshot, UiIconSet } from '../../src/shared/brand/snapshot'
import { figmaGet, withVersion } from './http'
import type { RestNode } from './types'

/** Figma caps ids per render call; batches keep a large icon set under the limit. */
const RENDER_BATCH = 50
/** UI icon sets name their variants `Icon=<slug>, Size=<Small|Medium|Large>`. */
const UI_VARIANT_PROPERTY = 'Icon'

/** Renders one variant per glyph (Size variants collapse to the drawn original) to SVG, keyed by `keyOf(variant name)` in variant order. */
async function renderSet(fileKey: string, label: string, doc: RestNode | undefined, keyOf: (name: string) => string, entry: (v: RestNode, svg: string) => IconEntry, version?: string): Promise<Record<string, IconEntry>> {
  if (!doc || doc.type !== 'COMPONENT_SET') throw new Error(`Icon set ${label} not found`)
  const variants = oneVariantPerGlyph((doc.children ?? []).filter((c) => c.type === 'COMPONENT'), keyOf)
  const urls: Record<string, string> = {}
  for (let i = 0; i < variants.length; i += RENDER_BATCH) {
    const ids = variants.slice(i, i + RENDER_BATCH).map((v) => v.id).join(',')
    const res = await figmaGet<{ images: Record<string, string | null> }>(withVersion(`/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=svg&svg_outline_text=true&svg_include_id=false&svg_simplify_stroke=true`, version))
    for (const [id, url] of Object.entries(res.images)) if (url) urls[id] = url
  }
  const icons: Record<string, IconEntry> = {}
  const failed: string[] = []
  await Promise.all(variants.map(async (v) => {
    const url = urls[v.id]
    if (!url) { failed.push(v.name); return }
    const res = await fetch(url)
    if (!res.ok) { failed.push(v.name); return }
    icons[keyOf(v.name)] = entry(v, await res.text())
  }))
  if (failed.length) throw new Error(`Figma did not render ${failed.length} icon(s) in ${label}: ${failed.join(', ')}`)
  // Keys in variant order, so the committed file does not reshuffle with fetch timing.
  return Object.fromEntries(variants.map((v) => keyOf(v.name)).filter((k) => icons[k]).map((k) => [k, icons[k]!]))
}

export async function restIcons(fileKey: string, set: IconsSnapshot['set'], iconDoc: RestNode | undefined, version?: string): Promise<IconsSnapshot> {
  const icons = await renderSet(fileKey, `${set.id} (${set.name})`, iconDoc, (name) => iconKey(name, set.variantProperty),
    (v, svg) => ({ id: v.id, name: iconLabel(v.name, set.variantProperty), svg }), version)
  return { fileKey, set, icons, marks: {} }
}

/** The Figma UI icon sets on the Icons page, as `ui-<prefix>-<variant>` glyphs. */
export async function restUiIcons(fileKey: string, sets: readonly UiIconSet[], byId: ReadonlyMap<string, RestNode>, version?: string): Promise<Record<string, IconEntry>> {
  const out: Record<string, IconEntry> = {}
  for (const set of sets) {
    Object.assign(out, await renderSet(fileKey, `${set.id} (${set.name})`, byId.get(set.id), (name) => `ui-${set.prefix}-${iconKey(name, UI_VARIANT_PROPERTY)}`,
      (v, svg) => ({ id: v.id, name: iconLabel(v.name, UI_VARIANT_PROPERTY), svg, set: set.prefix }), version))
  }
  return out
}
