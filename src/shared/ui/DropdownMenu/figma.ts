/** Figma ↔ code contract for Dropdown menu. */
export const figma = {
  setId: '40000047:5251',
  name: 'Dropdown menu',
  props: {},
  figmaGaps: {
    'menu/item/bg/default': 'consumed by the composed MenuItem (override on the menu-item instances)',
    'menu/item/bg/selected': 'consumed by the composed MenuItem',
    'menu/item/radius': 'consumed by the composed MenuItem',
    'menu/item/gap': 'consumed by the composed MenuItem',
    'menu/item/height': 'consumed by the composed MenuItem',
  },
} as const
