/** Figma ↔ code contract for Toggle. */
export const figma = {
  setId: '215:12515',
  name: 'Toggle',
  props: {
    Toggle: 'checked', Title: 'title', 'Descrpition Text': 'description', 'Switch (Status=On/Off)': 'checked' },
  figmaGaps: {},
  notes: [
    'Figma only publishes the Status=On instance inside this set; the Off track reads toggle/track/bg-off and the knob toggle/knob/*, which exist in the Brand collection.',
    'There is no Disabled variant in Figma; code dims with the shared --bb-derived-button-disabled-opacity (0.55) until a toggle opacity variable exists.',
    'toggle/label/font-weight resolves to "500px" in the generated CSS (a length, not a weight). Fix the Figma variable type.',
    'The 55px gap between description and switch belongs to an unnamed frame (Frame 1430102650); name it in Figma to get a readable derived token.',
  ],
} as const
