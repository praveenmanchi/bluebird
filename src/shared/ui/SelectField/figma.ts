/** Figma ↔ code contract for SelectField ("dropdown" 215:12201; "dropbox" 215:12356 is the labelled alias). */
export const figma = {
  setId: '215:12201',
  name: 'dropdown',
  props: {
    'Label Input label': 'value | placeholder',
    'Input bottom label (hidden layer)': 'helper',
    'eye (hidden instance)': 'revealIcon',
    'dropbox › Label Title': 'label',
    'dropbox › Tab Icons': 'labelIcon',
  },
  figmaGaps: {},
  notes: 'Value text is Inter in Figma while dropdown/font/family resolves to Noto Sans; the trigger reads type/family/inter and the label/helper read dropdown/font/family as bound.',
} as const
