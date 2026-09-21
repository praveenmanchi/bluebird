/** Figma ↔ code contract for VariableCardExpanded. */
export const figma = {
  setId: '84:1043',
  name: 'Variable search card expand',
  props: {
    'Frame 1430102576 (header row)': 'composed VariableCard: name | meta | kind | changeCount | onInspect | onCollapse',
    'Components Using the Searched Variable (text)': 'sectionTitle',
    'Frame 1430102678 (two change status instances)': 'summary',
    'Frame 14301025xx (detail rows)': 'rows[{label, value, valueLabel?, status?, icon?}]',
    'Tab Icons=layers show': 'onShowLayers',
    'Tab Icons=show': 'onShow',
  },
  figmaGaps: {
    'card-variable/title/font-size': 'consumed by the composed VariableCard (header row title)',
    'card-variable/title/font-weight': 'consumed by the composed VariableCard (header row title)',
  },
  notes: [
    'The root has no auto-layout in Figma; children are 1025 wide inside a 1049 frame (12 each side) → card-variable/padding (13) and card-variable/gap-row are used for the box.',
    'All chips ("Frame 1430102562", "Frame 1430102572") are instances of "change status" → composed ChangeStatus.',
    'Header type is Gap Inc Sans → type/family/brand; the section title is MuseoModerno → type/family/museo.',
  ],
} as const
