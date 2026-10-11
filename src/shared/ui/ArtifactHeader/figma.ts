/** Figma ↔ code contract for ArtifactHeader ("Artifact Header" 40000285:8144). */
export const figma = {
  setId: '40000285:8144',
  name: 'Artifact Header',
  props: {
    Title: 'title',
    Subtitle: 'subtitle',
    'Type icon (Tab Icons instance, swapped per artifact)': 'icon',
    'Open (Link Button instance, Label override)': 'actionLabel + onOpen',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the UX AI artifacts. The Type tile holds a Tab Icons instance (colors by default; Type Artifact swaps in text, Component Artifact component) → composed <Icon>. "Open" is a real Link Button instance (Label "Open in Figma ↗", overridden to "Go to component ↗" in Component Artifact) → composed <LinkButton>. The Title pairs uxai/font/size-heading (13) with uxai/font/line-label (16.8), as bound in Figma. The Text frame hugs to 33 inside a FIXED 32 root, so it overflows by 1 in Figma.',
} as const
