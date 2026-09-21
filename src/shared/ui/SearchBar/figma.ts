/** Figma ↔ code contract for SearchBar. */
export const figma = {
  setId: '7:44532',
  name: 'search bar',
  props: { 'Enter Variables here ': 'placeholder' },
  figmaGaps: {},
  notes: [
    'The Figma placeholder text is a static layer; code exposes value/placeholder on a native <input type="search">.',
    'The glyph frame is 14px raw in Figma while search-bar/icon/size is 16px; code follows the token.',
    'The root padding (12) is raw; code reads search-bar/padding-x (13). Bind it in Figma to remove the 1px drift.',
  ],
} as const
