/** Figma ↔ code contract for the "brand logos" set. */
export const figma = {
  setId: '40000064:9865',
  name: 'brand logos',
  props: { Brand: 'brand (or the surrounding data-brand, mirroring the `brand logos` variable binding)' },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-brand-logo-vector-brand-fiskars-fill': 'Logo artwork colour (Fiskars wordmark, #de8a2e since 2026-09-23). Colours live in figma/logos/fiskars.svg, not in tokens; re-export the SVG when the artwork changes.',
  },
  notes: 'Logo artwork keeps its own colours (the HCL variant is monochrome and follows Banner/Text). The Bridge variant is outlined text (~49 KB); a simplified asset would shrink the plugin bundle.',
} as const
