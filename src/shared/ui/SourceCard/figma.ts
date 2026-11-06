import { scaleGaps } from '../../brand/scaleGaps'
const badge = 'Bound on the nested Meta Badge ("Status") instance; rendered by the composed <MetaBadge>, whose MetaBadge.css consumes it.'

/** Figma ↔ code contract for SourceCard ("Source Card" 40000284:8167). */
export const figma = {
  setId: '40000284:8167',
  name: 'Source Card',
  props: {
    Name: 'name',
    Meta: 'meta',
    'Status (Meta Badge: Tone=Success, Label "Indexed", Show meta off)': 'status + statusTone',
    'Include (Checkbox: Selected=Checked, Show label off)': 'selected + onToggle',
    'Type icon (Tab Icon=Variables)': 'icon',
  },
  figmaGaps: {
    ...scaleGaps('border-width/default'),
    'feedback/success': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
    'checkbox/gap': 'Bound on the nested Checkbox ("Include") instance; rendered by the composed <Checkbox>, whose Checkbox.css consumes it.',
  },
  derivedGaps: {},
  notes: 'Created 2026-10-09 for the UX AI tab. Composes MetaBadge (Status, Tone=Success "Indexed", meta hidden) and Checkbox (Include, Checked, label hidden — named "Include <Name>" for assistive tech). The card is selectable through the checkbox (`selected` / `onToggle`). Figma fixes the card at 380 × 44 (derived); the code keeps the height and uses the width with max-width: 100%. The 32 Type tile plus 9 + 9 row padding is taller than 44, so in Figma (and here, align-items: center) the tile overhangs the padding evenly.',
} as const
