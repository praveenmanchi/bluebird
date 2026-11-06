import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for SearchBar. */
export const figma = {
  setId: '7:44532',
  name: 'search bar',
  props: { 'Enter Variables here ': 'placeholder' },
  figmaGaps: { ...scaleGaps('space/inset-lg-alt') },
  derivedGaps: {
    '--bb-derived-search-bar-vector--1-width': 'Inner vector of the search glyph (both of its parts are named "Vector"). Icon `search` draws it; only the glyph box is CSS.',
    '--bb-derived-search-bar-vector--1-height': 'Inner vector of the search glyph (both of its parts are named "Vector"). Icon `search` draws it; only the glyph box is CSS.',
  },
  notes: [
    'The Figma placeholder text is a static layer; code exposes value/placeholder on a native <input type="search">.',
    'The glyph frame is 14px raw in Figma while search-bar/icon/size is 16px; code follows the token.',
    'The root padding (12) is raw; code reads search-bar/padding-x (13). Bind it in Figma to remove the 1px drift.',
  ],
} as const
