import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for ChangeRow ("Change Row" 40000345:8562). */
const badge = "Bound on the composed Meta Badge instance; MetaBadge's own CSS consumes it."

export const figma = {
  setId: '40000345:8562',
  name: 'Change Row',
  props: {
    Name: 'name',
    Detail: 'detail',
    Kind: 'kind (Color / Number / Component)',
    State: 'state (Default / Selected)',
    'Include (Checkbox instance, label hidden)': 'included + onIncludedChange (accessible name "Include <name>")',
    'Preview (swatch / Tab Icons box)': 'kind + swatch',
    'Change (Meta Badge instance, Label "Modified")': 'change → CHANGE_BADGE label + tone',
  },
  figmaGaps: {
    ...scaleGaps('icon/size/lg', 'border-width/default'), 'surface/accent-strong': 'Sample swatch colour: the row shows the changed value from data, so code paints it inline.',
    'checkbox/gap': "Bound on the composed Checkbox instance (gap between box and label); the label is hidden here and Checkbox's own CSS reads it.",
    'bridge/color/primary/600': 'Sample swatch fill in Figma (the Bridge primary of the default row). In code the Preview paints the scanned value — the swatch prop — so no design token is read.',
    'border/accent': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
  },
  derivedGaps: {
    '--bb-derived-change-row-root-width': 'FIXED 356 on the Components page; the row fills its list (and the Change Item header exposes it as FILL), so it is width: 100%.',
  },
  notes: 'Created 2026-10-11 for the Publish tab. The Change badge maps change → Added/Success, Modified/Accent (the Figma sample), Removed/Danger, Deprecated/Warning; Figma only draws Modified. The Preview for Kind=Number is the Tab Icons Variables glyph and for Kind=Component the component glyph, in a publish/surface/panel box; the glyph colour is not bound in Figma, code uses publish/text/body. The Include checkbox is uncontrolled unless `included` is passed and is named "Include <name>". `trailing` is a code-only slot after the badge.',
} as const
