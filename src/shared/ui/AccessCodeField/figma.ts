/** Figma ↔ code contract for AccessCodeField ("Access Code Field" 40000321:20076). */
export const figma = {
  setId: '40000321:20076',
  name: 'Access Code Field',
  props: {
    Label: 'label',
    'Show helper': 'showHelper',
    State: 'Default/Filled = value, Focused = :focus-within, Error/Success = status, Disabled = disabled (state forces the look)',
    'Helper › Helper text': 'helperText (defaults to the Figma copy per state)',
    'Box › Reveal': 'built-in toggle: eye-close while masked, eye-open while visible',
  },
  figmaGaps: {
    'login/field/caret-height': 'The Caret rectangle is the native text caret; code colours it with caret-color: login/field/caret and the browser sizes it.',
  },
  derivedGaps: {
    '--bb-derived-access-code-field-root-width': 'The set frame is fixed at 344; instances fill the form, so code fills its container.',
  },
  notes: 'A native <input type="password"> renders the mask (Figma\'s "••••" Value text). Status glyphs are "Status error icons / error" and "/ Good"; the leading glyph is "API key". The Error helper copy ("4 attempts left") is Figma placeholder text — the login screen passes the sandbox\'s actual message.',
} as const
