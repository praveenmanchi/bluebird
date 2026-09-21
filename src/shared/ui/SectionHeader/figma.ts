/** Figma ↔ code contract for SectionHeader. */
export const figma = {
  setId: '226:2612',
  name: 'settings page title',
  props: {
    Title: 'title',
    Title2: 'title !== undefined',
    'Description ': 'description',
    Logo: 'logo (github | storybook | teams | zeroheight; undefined hides it)',
    'brands (Property 1)': 'logo',
    Toggle: 'toggle (+ checked / onToggle)',
  },
  figmaGaps: {},
  notes: [
    'The Switch instance is hidden by default in Figma; `toggle` defaults to false accordingly and renders the composed Toggle.',
    'The Figma instance is "Property 1=githib" (typo in the design file); code maps it to the `github` artwork.',
    'section-header/title/font-weight resolves to "500px" in the generated CSS (a length, not a weight). Fix the Figma variable type.',
    'section-header/divider-color and section-header/padding exist in the Brand collection but are not used by this Figma component; left for a future divider variant.',
  ],
} as const
