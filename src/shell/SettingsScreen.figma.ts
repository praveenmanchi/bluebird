/** Figma ↔ code contract for the Settings screen (frame, not a component set). */
export const figma = {
  setId: '40000100:13084',
  name: 'Settings page',
  props: { Toggle: 'Keep me signed in (session.keepSignedIn → session:update); the session summary above it reuses the same type tokens', Container: 'ButtonGroup: "Logoff session" secondary / "Reset all Settings" primary', settings: 'TabBar settingsActive (settings / Variant2)' },
  figmaGaps: {
    'footer/bg/default': 'consumed by the shell Footer', 'footer/border/top': 'consumed by the shell Footer', 'footer/padding-x': 'consumed by the shell Footer', 'footer/padding-y': 'consumed by the shell Footer',
    'Banner/bg': 'consumed by the shell Banner', 'Boader': 'consumed by the shell tab row (shell.css)',
    'tab/gap': 'consumed by the composed Tab', 'tab/padding-x': 'consumed by the composed Tab', 'tab/padding-y': 'consumed by the composed Tab', 'tab/icon/default': 'consumed by the composed Tab',
    'button/secondary/padding-x': 'consumed by the composed ButtonGroup (its gap)', 'toggle/gap': 'consumed by the composed Toggle (and the session summary row gap)',
  },
  notes: 'The screen reuses the app chrome; only the settings glyph state (Variant2: translucent square) and the two rows belong to it. Reset asks for confirmation (not in the design) because it wipes every stored preference.',
} as const
