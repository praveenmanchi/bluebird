import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for VariableCardExpanded. */
export const figma = {
  setId: '84:1043',
  name: 'Variable search card expand',
  props: {
    'Frame 1430102576 (header row)': 'composed VariableCard: name | meta | kind | changeCount | changeLabel | onInspect | onCollapse',
    'Components Using the Searched Variable (text)': 'sectionTitle',
    'Frame 1430102678 (two change status instances)': 'summary',
    'Frame 14301025xx (detail rows)': 'rows[{label, value, valueLabel?, status?, icon?}]',
    'Tab Icons=layers show': 'onShowLayers',
    'Tab Icons=show': 'onShow',
  },
  figmaGaps: {
    ...scaleGaps('icon/size/lg'),
    'card-variable/title/font-size': 'consumed by the composed VariableCard (header row title)',
  },
  derivedGaps: {
    '--bb-derived-variable-card-expanded-frame-1430102596-gap': 'every detail row is one CSS rule; it reads frame-1430102590-gap, the same value',
    '--bb-derived-variable-card-expanded-frame-1430102597-gap': 'every detail row is one CSS rule; it reads frame-1430102590-gap, the same value',
    '--bb-derived-variable-card-expanded-frame-1430102598-gap': 'every detail row is one CSS rule; it reads frame-1430102590-gap, the same value',
    '--bb-derived-variable-card-expanded-frame-1430102599-gap': 'every detail row is one CSS rule; it reads frame-1430102590-gap, the same value',
  },
  notes: [
    '2026-10-28: the root became VERTICAL auto layout (padding 12, gap 8, rows FILL, action groups HUG) so the card reflows to the 600 plugin → the derived root padding/gap are read directly.',
    'All chips ("Frame 1430102562", "Frame 1430102572") are instances of "change status" → composed ChangeStatus.',
    'The header chip caption is overridden to "Usage No." (I84:1285;83:672) → VariableCard\'s changeLabel default; summary and row captions come from summary[].label / rows[].valueLabel ("Total No. of Usage No.", "Total No. of Nodes  Using", " Nodes  Using" in Figma, mirrored by the Default story).',
    'Every chip in Figma is Property 1=Default with its caption and count text rebound to card-variable/title/fg, and its count square (Frame 1430102560) overridden to badge-count/* and a raw 1px stroke. For an added / removed summary or row status, ChangeStatus\'s own [data-status] fill and border colour outrank that override, so only its radius and stroke width carry over.',
    '2026-10-28: header and row text (raw Museo Sans before, not installed in Figma nor a web font) is bound to card-variable/title/* and card-variable/meta/* + font/weight-regular; rows use card-variable/title/font-size-sm. The section title is still MuseoModerno → type/family/display.',
  ],
} as const
