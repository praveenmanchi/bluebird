/** Figma ↔ code contract for WcagCard ("WCAG Card" 419:39993). */
export const figma = {
  setId: '419:39993',
  name: 'WCAG Card',
  props: {
    Cognitive: 'disabilities includes "cognitive"',
    Auditory: 'disabilities includes "auditory"',
    'Physical/Motor': 'disabilities includes "physical"',
    Visual: 'disabilities includes "visual"',
    'Rating (instance)': 'rating',
    'Principle (instance)': 'principle',
    '1.4.3 (text)': 'code',
    'Contrast (Minimum) (text)': 'title',
    'Understanding SC 1.4.3 ↗ (text)': 'link',
    'Node / Colors / Why it fails / How to fix (rows)': 'node / colors / whyItFails / howToFix',
    'Component 13/14/15 (Theme instances)': 'themes',
    'Rectangle 3475057': 'preview',
  },
  figmaGaps: {
    'principle/perceivable/bg': 'consumed by the composed PrincipleTag',
    'disability-indicator/border/default': 'consumed by the composed DisabilityIndicator',
    'disability-indicator/icon/color': 'Figma overrides the Rating instance fill with the disability glyph colour; code keeps rating/bg/default from the composed Rating so the level chip stays brand-coloured.',
    'theme-card/border/default': 'consumed by the composed ThemeChip',
  },
  notes: 'The four visibility bindings are crossed in Figma (the Auditory indicator is toggled by "Cognitive" and vice versa); code maps each boolean to its own indicator kind. The last row is labelled "How to fix" twice in Figma; code labels the theme row "Themes" by default (themesLabel).',
} as const
