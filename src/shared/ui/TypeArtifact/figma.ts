const header = 'Bound on the nested Artifact Header instance; the composed <ArtifactHeader> consumes it in ArtifactHeader.css.'

/** Figma ↔ code contract for TypeArtifact ("Type Artifact" 40000285:8231). */
export const figma = {
  setId: '40000285:8231',
  name: 'Type Artifact',
  props: {
    'Artifact Header (instance: Title / Subtitle overrides, Type icon swapped to text)': 'title + subtitle + onOpen',
    'Type Specimen × 4 (Level = Title / Label / Body / Caption)': 'levels',
  },
  figmaGaps: {
    'uxai/space/inline': header,
  },
  notes: 'Created 2026-10-09 for the UX AI chat. The set exposes no component properties; the header text and the specimen list are data. The Artifact Header instance swaps its Type icon (overridden "name") — the glyph is the text icon. Header and specimens are FILL in Figma, so they drop their FIXED set widths (width: auto) and stretch.',
} as const
