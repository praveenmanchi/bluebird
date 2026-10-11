const node = 'Bound on the nested Pipeline Node instances; PipelineNode reads it.'

/** Figma ↔ code contract for Pipeline ("Pipeline" 40000345:8676). */
export const figma = {
  setId: '40000345:8676',
  name: 'Pipeline',
  props: {
    'Figma file / Repository / Docs site (Pipeline Node instances)': 'nodes',
    'Rail / Link (link-active vs link)': 'activeLinks',
  },
  figmaGaps: {
    'publish/space/tight': node,
  },
  derivedGaps: {
    '--bb-derived-pipeline-root-width': 'FIXED 356 in Figma (the panel content width); in code the pipeline fills its parent and the rails absorb the extra width.',
  },
  notes: 'Created 2026-10-11 for the Publish tab. A single component with no properties; code exposes the three node instances (`nodes`) and which rail links are active (`activeLinks`), defaulting to the Figma sample: Figma file (layers, Done, "14 changes") → Repository (brands githib logo, Done, "bridge-ds-site · main") → Docs site (URL icon, Running, "ds.bridge.design"), with the first link publish/pipeline/link-active and the second publish/pipeline/link. Rendered as an ordered list; each rail is decorative (aria-hidden) and grouped into the list item of the node after it so the list only holds list items. The 18-wide Link fills its FILL rail and never shrinks below 18.',
} as const
