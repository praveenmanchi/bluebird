/** Figma ↔ code contract for VisionSimGrid ("Vision Sim Grid" 40000463:9249). */
export const figma = {
  setId: '40000463:9249',
  name: 'Vision Sim Grid',
  props: { 'Vision Sim Tile instances': 'simulations (+ colors / labels forwarded to each tile)' },
  figmaGaps: {
    'a11y/surface/sunken': 'Bound inside the nested Vision Sim Tile instances; rendered by the composed <VisionSimTile>.',
    'a11y/radius/control': 'Bound inside the nested Vision Sim Tile instances; rendered by the composed <VisionSimTile>.',
    'a11y/space/tight': 'Bound inside the nested Vision Sim Tile instances; rendered by the composed <VisionSimTile>.',
    'a11y/space/inline': 'Bound inside the nested Vision Sim Tile instances; rendered by the composed <VisionSimTile>.',
  },
  notes: 'Created 2026-10-11. Figma is a wrapping auto-layout of six 137px tiles with a11y/space/section gaps; code uses a three-column grid at the same gap.',
} as const
