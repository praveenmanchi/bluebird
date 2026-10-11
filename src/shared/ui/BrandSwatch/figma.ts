const swatch = 'Bound on the nested Color Swatch (Size=Large) instance; rendered by the composed <ColorSwatch size="large">, whose ColorSwatch.css consumes it.'

/** Figma ↔ code contract for BrandSwatch ("Brand Swatch" 40000285:8153). */
export const figma = {
  setId: '40000285:8153',
  name: 'Brand Swatch',
  props: {
    Brand: 'label (caption text; defaults to BRAND_LABELS[brand]) + brand (BrandId → data-brand on the swatch)',
    Hex: 'hex',
    'Swatch (instance, explicit Brand UI mode + fill override)': 'brand + color',
  },
  figmaGaps: {
    'uxai/beam/5': swatch,
    'uxai/swatch/border': swatch,
    'uxai/radius/chip': swatch,
    'uxai/size/swatch-lg': swatch,
  },
  derivedGaps: {
    '--bb-derived-brand-swatch-swatch-stroke-width': 'Stroke weight of the nested Color Swatch instance; ColorSwatch.css draws it from --bb-derived-color-swatch-root-stroke-width (same 1px).',
  },
  notes: 'Created 2026-10-09 for the UX AI Color Artifact. Figma shows one brand\'s value by setting an explicit Brand UI mode on the Swatch instance; code puts data-brand={brand} on the ColorSwatch only, so the swatch fill (and its border) resolve in that brand while the captions stay in the surrounding one. Figma default Hex is "#0A84FF" while the default fill (uxai/beam/5) resolves to #0C8CE9 — the default text is kept verbatim.',
} as const
