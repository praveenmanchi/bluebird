import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for SectionHeader. */
export const figma = {
  setId: '226:2612',
  name: 'settings page title',
  props: {
    Title: 'title',
    Title2: 'title !== undefined',
    'Description ': 'description',
    Logo: 'logo (github | storybook | teams | zeroheight | dual-file | ai | mcp | jira | database; undefined hides it)',
    'Settings brands (Brands)': 'logo',
    Toggle: 'toggle (+ checked / onToggle)',
  },
  figmaGaps: {
    ...scaleGaps('font/family-ui', 'font/weight-medium', 'font/line-label', 'font/line-caption'),
    'toggle/knob/bg': 'consumed by the composed Toggle (knob fill override on the Switch instance)',
  },
  notes: [
    'The Switch instance is hidden by default in Figma; `toggle` defaults to false accordingly and renders the composed Toggle.',
    'The logo is the "Settings brands" set (226:3580). Variant names differ from code: githib → github, zeroheigth → zeroheight, Dual file → dual-file, AI → ai, MCP → mcp, database (Storage). The webhooks variant is not used.',
    'section-header/title/font-weight resolves to "500px" in the generated CSS (a length, not a weight). Fix the Figma variable type.',
    'section-header/divider-color and section-header/padding exist in the Brand collection but are not used by this Figma component; left for a future divider variant.',
  ],
} as const
