import { scaleGaps } from '../shared/brand/scaleGaps'
/** Figma ↔ code contract for the Settings screen (frame, not a component set). */
export const figma = {
  setId: '40000350:19914',
  name: 'Settings page',
  props: { Toggle: 'Toggle with showSwitch={false} (instance Toggle=false): the session summary row; the design\'s copy is placeholder', Container: 'ButtonGroup: "Logoff session" secondary / "Reset all Settings" primary', settings: 'SettingsButton active (settings / Variant2)' },

  derivedGaps: {
    '--bb-derived-settings-screen-tab-width': 'Width of the "Accessibility Checker" Tab instance (162 → 154 when the frame moved to its own "settings" page on 2026-10-11). Tabs hug their label in code (Tab.css), so the shell row never pins it.',
    '--bb-derived-settings-screen-settings-height': 'The settings button grew 33px → 40px in Figma on 2026-09-23; the shell renders the composed <SettingsButton>, which already sizes itself from --bb-derived-settings-button-root-height (40px). Reading it here would pin the row twice.',
  },
  figmaGaps: {
    ...scaleGaps('border-width/default', 'dimension/space/10', 'space/inset-sm', 'space/inset-xs', 'space/inset-lg-alt', 'dimension/space/6', 'dimension/space/8'),
    'footer/bg/default': 'consumed by the shell Footer', 'footer/border/top': 'consumed by the shell Footer', 'footer/padding-x': 'consumed by the shell Footer', 'footer/padding-y': 'consumed by the shell Footer',
    'Banner/bg': 'consumed by the shell Banner', 'Border': 'consumed by the shell tab row (shell.css)',
    'tab/indicator/color': 'consumed by the composed SettingsButton (Variant2 stroke)',
    'tab/gap': 'consumed by the composed Tab', 'tab/padding-x': 'consumed by the composed Tab', 'tab/padding-y': 'consumed by the composed Tab', 'tab/icon/default': 'consumed by the composed Tab',
    'button/secondary/padding-x': 'consumed by the composed ButtonGroup (its gap)', 'toggle/gap': 'consumed by the composed Toggle',
  },
  codeOnly: {
    TeamBanner: 'Team Banner (204:7270) at the bottom of the page, stretched to the content width (2026-10-09, user request). The Settings page frame 40000100:13084 does not hold it; the older Settings Layout frames do (instances 287:47433 Main screens, 335:8011 / 340:8089 / 287:38289 UX copy), always last and full width. Version stays the Figma copy until the plugin has a real version source (the Footer\'s V2.11.0 is placeholder too).',
    PersonaRow: 'Persona switch moved here from the banner sub-bar (2026-10-09). Not in the Figma Settings page yet: composes Toggle (showSwitch=false) + SegmentedControl ("Group Tab selecters", 2 level); shown only when 2+ personas are configured.',
  },
  notes: 'The screen reuses the app chrome; only the settings glyph state (Variant2: indicator stroke) and the rows belong to it. Reset asks for confirmation (not in the design) because it wipes every stored preference.',
} as const
