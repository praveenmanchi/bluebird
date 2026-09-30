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
    'card-variable/title/font-size': 'consumed by the composed VariableCard (header row title)',
    'card-variable/title/font-weight': 'consumed by the composed VariableCard (header row title); the header rule here swaps only the family, so the bound weight applies',
  },
  derivedGaps: {
    '--bb-derived-variable-card-expanded-black-font-weight': 'Raw "Regular" (400) on the header title, whose fontWeight Figma binds to card-variable/title/font-weight; the binding wins and the composed VariableCard reads it.',
  },
  notes: [
    'The root has no auto-layout in Figma; children are 1025 wide inside a 1049 frame (12 each side) → card-variable/padding (13) and card-variable/gap-row are used for the box.',
    'All chips ("Frame 1430102562", "Frame 1430102572") are instances of "change status" → composed ChangeStatus.',
    'The header chip caption is overridden to "Usage No." (I84:1285;83:672) → VariableCard\'s changeLabel default; summary and row captions come from summary[].label / rows[].valueLabel ("Total No. of Usage No.", "Total No. of Nodes  Using", " Nodes  Using" in Figma, mirrored by the Default story).',
    'Every chip in Figma is Property 1=Default with its caption and count text rebound to card-variable/title/fg, and its count square (Frame 1430102560) overridden to badge-count/* and a raw 1px stroke. For an added / removed summary or row status, ChangeStatus\'s own [data-status] fill and border colour outrank that override, so only its radius and stroke width carry over.',
    'Header type is Gap Inc Sans → type/family/brand; the section title is MuseoModerno → type/family/museo.',
  ],
} as const
