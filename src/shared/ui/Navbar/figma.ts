/** Figma ↔ code contract for Navbar (7:44400). */
export const figma = {
  setId: '7:44400',
  name: 'Navbar',
  props: { 'Tab (×7)': 'items[]', 'Tab › Property 1=Active': 'active', 'Tab › Show Header Icons': 'showIcons', 'Tab › Property 1=Variant3': 'trailing' },
  figmaGaps: {
    'tab/gap': 'consumed by the composed Tab',
    'tab/padding-x': 'consumed by the composed Tab',
    'tab/padding-y': 'consumed by the composed Tab',
    'tab/icon/default': 'consumed by the composed Tab (glyph fill override on each Tab Icons instance)',
    'icon/glyph/default': 'strokes of the navbar-tab-icon vectors inside the Variant3 Tab instance; the composed Tab colours the glyph through tab/icon/*',
  },
  notes: 'All seven Figma instances swap the same Icon (91:1958); code maps a distinct Tab Icon per section. Arrow keys move the active tab (roving tabindex).',
} as const
