// Icon SVGs over REST: GET /v1/images renders each variant of the manifest's icon set to SVG.
import { iconKey } from '../../src/shared/brand/extract'
import type { IconsSnapshot } from '../../src/shared/brand/snapshot'
import { figmaGet, withVersion } from './http'
import type { RestNode } from './types'

/** Figma caps ids per render call; batches keep a large icon set under the limit. */
const RENDER_BATCH = 50

export async function restIcons(fileKey: string, set: IconsSnapshot['set'], iconDoc: RestNode | undefined, version?: string): Promise<IconsSnapshot> {
  if (!iconDoc || iconDoc.type !== 'COMPONENT_SET') throw new Error(`Icon set ${set.id} (${set.name}) not found`)
  const variants = (iconDoc.children ?? []).filter((c) => c.type === 'COMPONENT')
  const urls: Record<string, string> = {}
  for (let i = 0; i < variants.length; i += RENDER_BATCH) {
    const ids = variants.slice(i, i + RENDER_BATCH).map((v) => v.id).join(',')
    const res = await figmaGet<{ images: Record<string, string | null> }>(withVersion(`/images/${fileKey}?ids=${encodeURIComponent(ids)}&format=svg&svg_outline_text=true&svg_include_id=false&svg_simplify_stroke=true`, version))
    for (const [id, url] of Object.entries(res.images)) if (url) urls[id] = url
  }
  const icons: IconsSnapshot['icons'] = {}
  const failed: string[] = []
  await Promise.all(variants.map(async (v) => {
    const url = urls[v.id]
    if (!url) { failed.push(v.name); return }
    const res = await fetch(url)
    if (!res.ok) { failed.push(v.name); return }
    icons[iconKey(v.name, set.variantProperty)] = { id: v.id, name: v.name.replace(`${set.variantProperty}=`, ''), svg: await res.text() }
  }))
  if (failed.length) throw new Error(`Figma did not render ${failed.length} icon(s): ${failed.join(', ')}`)
  // Keys in variant order, so the committed file does not reshuffle with fetch timing.
  const ordered = Object.fromEntries(variants.map((v) => iconKey(v.name, set.variantProperty)).filter((k) => icons[k]).map((k) => [k, icons[k]!]))
  return { fileKey, set, icons: ordered, marks: {} }
}
