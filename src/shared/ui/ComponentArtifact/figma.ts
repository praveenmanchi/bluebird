const header = 'Bound on the nested Artifact Header instance; the composed <ArtifactHeader> consumes it in ArtifactHeader.css.'
const button = 'Bound on the nested Button instances of the Preview; the composed <Button> consumes it in Button.css (the preview is a live render, not a drawing).'
const badge = 'Bound on the nested Meta Badge (Tone=Neutral) instances of the Props row; the composed <MetaBadge> consumes it in MetaBadge.css.'
const chip = 'Bound on the nested Context Chip (Type=Citation) instance of the Code row; the composed <ContextChip type="citation"> consumes it in ContextChip.css.'

/** Figma ↔ code contract for ComponentArtifact ("Component Artifact" 40000285:8254). */
export const figma = {
  setId: '40000285:8254',
  name: 'Component Artifact',
  props: {
    'Artifact Header (instance: Title / Subtitle overrides, Type icon swapped, Open label → "Go to component ↗")': 'title + subtitle + icon + actionLabel + onOpen',
    'Preview (frame holding 3 Button instances: Primary, Secondary, Primary Disabled; Medium, leading Variables icon)': 'children',
    'Properties › Meta Badge × 6 (Tone=Neutral, Label override)': 'properties',
    'Code › Context Chip (Type=Citation, Label override)': 'code',
  },
  figmaGaps: {
    'uxai/space/inline': header,
    'button/primary/bg/default': button,
    'button/primary/border/default': button,
    'button/primary/radius': button,
    'button/primary/gap': button,
    'button/primary/padding-x': button,
    'button/primary/width-md': 'Bound on the FIXED-width Button instances; the default preview passes width="fixed", so Button.css reads it under [data-width="fixed"].',
    'button/primary/height': button,
    'button/primary/bg/disabled': button,
    'button/primary/border/disabled': button,
    'button/secondary/bg/default': button,
    'button/secondary/border/default': button,
    'button/secondary/radius': button,
    'button/secondary/gap': button,
    'button/secondary/padding-x': button,
    'button/secondary/width-md': 'Bound on the FIXED-width Secondary Button instance; the default preview passes width="fixed", so Button.css reads it under [data-width="fixed"].',
    'button/secondary/height': button,
    'border/subtle': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
    'uxai/chip/bg': chip,
    'uxai/chip/border': chip,
    'uxai/radius/chip': chip,
    'uxai/space/hair': chip,
  },
  derivedGaps: {
    '--bb-derived-component-artifact-button-opacity': 'Opacity of the State=Disabled Button instance; the composed <Button disabled> applies it from --bb-derived-button-disabled-opacity (same 0.55).',
    '--bb-derived-component-artifact-button-stroke-width': 'Stroke weight of the nested Button instances; Button.css draws it from button/primary|secondary/border-width (same 1px).',
    '--bb-derived-component-artifact-context-chip-stroke-width': 'Stroke weight of the nested Context Chip instance; ContextChip.css draws it from --bb-derived-context-chip-root-stroke-width (same 1px).',
    '--bb-derived-component-artifact-meta-badge-stroke-width': 'Stroke weight of the nested Meta Badge instances; MetaBadge.css draws it from border/width/default (same 1px).',
  },
  notes: 'Created 2026-10-09 for the UX AI chat. No component properties; the header text, preview, prop names and code path are data. The Preview is a slot (`children`) so the chat can render the real component; its default reproduces the Figma Preview with the shared <Button> (Primary / Secondary / Primary disabled, Medium, width="fixed", leading Variables glyph 91:1958, no trailing icon). The header Type icon is swapped to the component glyph and the Open link label overridden to "Go to component ↗".',
} as const
