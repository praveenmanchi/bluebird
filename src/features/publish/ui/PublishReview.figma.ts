import { SCREEN, composedBy, instanceBox } from '../../../shared/brand/screenGaps'

// Figma ↔ code contract for the Publish tab's "Publish v2 · 1 Review changes · Changes" screen: a frame, not a component set.
// The tab renders it from state (Tab.tsx) and it is checked against publish.css.
export const figma = {
  setId: '40000484:8324',
  name: 'Publish',
  props: {},
  figmaGaps: {
    ...composedBy('Button', ['button/primary/bg/default', 'button/primary/border-width', 'button/primary/border/default', 'button/primary/gap', 'button/primary/height', 'button/primary/padding-x', 'button/primary/radius', 'button/primary/width-md', 'button/secondary/bg/default', 'button/secondary/border-width', 'button/secondary/border/default', 'button/secondary/gap', 'button/secondary/height', 'button/secondary/padding-x', 'button/secondary/radius', 'button/secondary/width-md']),
    ...composedBy('Change Item', ['border/accent', 'border/default', 'surface/raised']),
    ...composedBy('Tab sub menu', ['border-width/default', 'dimension/radius/8', 'dimension/space/2', 'dimension/space/4', 'dropdown/border/default', 'dropdown/menu/bg', 'icon/glyph/on-accent']),
  },
  derivedGaps: {
    '--bb-derived-publish-review-root-width': SCREEN.root,
    '--bb-derived-publish-review-root-height': SCREEN.root,
    '--bb-derived-publish-review-changes-height': SCREEN.fill,
    ...instanceBox('Button', ['--bb-derived-publish-review-button-width']),
    ...instanceBox('Change Item', ['--bb-derived-publish-review-control-height', '--bb-derived-publish-review-control-width', '--bb-derived-publish-review-info-height', '--bb-derived-publish-review-info-width', '--bb-derived-publish-review-primary-height', '--bb-derived-publish-review-primary-width', '--bb-derived-publish-review-secondary-height', '--bb-derived-publish-review-secondary-width', '--bb-derived-publish-review-translucent-height', '--bb-derived-publish-review-translucent-width']),
    ...instanceBox('Section Title', ['--bb-derived-publish-review-section-title-height', '--bb-derived-publish-review-section-title-width']),
    ...instanceBox('Stepper', ['--bb-derived-publish-review-stepper-height', '--bb-derived-publish-review-stepper-width']),
    ...instanceBox('Tab sub menu', ['--bb-derived-publish-review-tab-sub-menu-height', '--bb-derived-publish-review-tab-sub-menu-width']),
  },
  notes: 'Body of \'Publish v2 · 1 Review changes · Changes\' on the Publish page. Top-level layers: Stepper, Panels, Actions.',
} as const
