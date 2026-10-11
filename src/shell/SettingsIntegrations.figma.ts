/** Figma ↔ code contract for the Settings · Integrations screen (frame, not a component set). */
const PREFIX = '--bb-derived-settings-integrations-'
const composed = (component: string) => `Bound on the composed ${component} instance; ${component}'s own CSS consumes it.`
const chrome = 'App chrome (Banner, tab row, settings glyph, Footer) cloned from the Settings page frame; the shell renders it (Banner.tsx, TabBar.tsx, shell.css, Footer).'
const fill = 'FILL in Figma; the field takes its column or section width in code (.bb-integrations__section rules lift the set-width cap).'
const hug = 'HUG of label + field (+ helper) in Figma; the composed component sizes itself.'
const persona = 'PersonaCard instance (264:10472) rendered by SettingsScreen above the session row; PersonaCard.css owns its padding and size.'
const team = 'TeamBanner instance (204:7270) rendered by SettingsScreen as the last row; TeamBanner.css draws its own surface.'
const stale = 'Stale text-style override on the dropbox value text (same Inter 400 as the "dropbox" set); SelectField reads dropdown/fg/value and dropdown/font/*.'

const gaps = (reason: string, names: readonly string[]) => Object.fromEntries(names.map((n) => [PREFIX + n, reason]))
const indexed = (base: string, count: number, suffixes: readonly string[]) =>
  Array.from({ length: count }, (_, i) => i + 1).flatMap((n) => suffixes.map((s) => `${base}--${n}-${s}`))

export const figma = {
  setId: '40000408:8714',
  name: 'Settings · Integrations',
  props: {
    'Settings body': 'SettingsIntegrations: one IntegrationSection per entry of integrations/sections.ts (GitHub, Notifications, Storybook, Zeroheight, Dual File Mode, AI Agent Assistance, MCP + Code Sync, Jira)',
    'Section header': 'SectionHeader (logo, title, description; the switch drives the section\'s enabled value)',
    'Input Box': 'Input (secret fields use password + eye)',
    dropbox: 'SelectInput: SelectField over a DropdownMenu of MenuItems',
    Toggle: 'Toggle',
    'Custom Instructions': 'TextArea',
    'AI service': 'Icon ai-claude / ai-openai / ai-gemini',
    Actions: 'ButtonGroup: Test Connection (not wired yet, says so) / Save Configuration (saves the section)',
    'Persona card': 'PersonaCard, rendered by SettingsScreen',
    'Team Banner': 'TeamBanner, rendered by SettingsScreen',
  },
  figmaGaps: {
    Background: 'The SettingsScreen root (.bb-settings) paints Background around the sections.',
    'Banner/bg': chrome, Boader: chrome, 'tab/gap': chrome, 'tab/padding-x': chrome, 'tab/padding-y': chrome,
    'tab/icon/default': chrome, 'tab/indicator/color': chrome,
    'footer/bg/default': chrome, 'footer/border/top': chrome, 'footer/padding-x': chrome, 'footer/padding-y': chrome,
    'settings/space/page-x': 'Body inline padding; in code the sections sit inside the Settings screen column (.bb-settings), which already pads it.',
    'input/gap/label': composed('Input / TextArea'),
    'input/label/font-size': composed('Input'),
    'dropdown/gap/label': composed('SelectField'),
    'dropdown/label/font-size': composed('SelectField'),
    'toggle/gap': composed('Toggle'),
    'toggle/knob/bg': composed('Toggle'),
    'button/secondary/padding-x': composed('ButtonGroup'),
    'section-header/description/fg': composed('SectionHeader'),
    'section-header/description/font-size': composed('SectionHeader'),
  },
  derivedGaps: {
    ...gaps(chrome, [
      'banner-gap', 'banner-height', 'banner-padding-bottom', 'banner-padding-left', 'banner-padding-right', 'banner-padding-top', 'banner-width',
      'frame-1430102558-gap', 'frame-1430102558-padding-right', 'frame-1430102627-height', 'frame-1430102627-width',
      'settings-gap', 'settings-height', 'settings-padding-bottom', 'settings-padding-left', 'settings-padding-right', 'settings-padding-top', 'settings-width',
      'tab-height', 'tab-width', 'tab-icons-height', 'tab-icons-width',
    ]),
    ...gaps('Desktop-mock width (1074); the screen fills the 360–760px plugin window.', ['root-width']),
    ...gaps(persona, ['persona-card-gap', 'persona-card-height', 'persona-card-padding-bottom', 'persona-card-padding-left', 'persona-card-padding-right', 'persona-card-padding-top', 'persona-card-width']),
    ...gaps(team, ['team-banner-fill', 'team-banner-height', 'team-banner-padding-bottom', 'team-banner-padding-left', 'team-banner-padding-right', 'team-banner-padding-top', 'team-banner-radius', 'team-banner-width']),
    ...gaps(fill, [
      'actions-width', 'custom-instructions-width', 'section-header-width', 'toggle-width', 'mcp-r1-c1-column-1-width', 'input-box-settings-integrations-width',
      ...indexed('input-box', 28, ['width']).filter((n) => n !== 'input-box--19-width'),
      ...[1, 2, 3, 7, 8].map((n) => `dropbox--${n}-width`), 'dropbox-settings-integrations-width',
      'ai-r2-column-1-width', 'ai-r3-column-1-width',
    ]),
    ...gaps(hug, [
      ...indexed('input-box', 28, ['height']).filter((n) => n !== 'input-box--23-height'), 'input-box-settings-integrations-height',
      'dropbox-height', 'custom-instructions-height', 'actions-height', 'section-header-height',
      'toggle--1-height', 'toggle--2-height', 'toggle--3-height', 'toggle-settings-integrations-height',
      'jira-height', 'jira-row-1-height', 'mcp-row-2-height',
    ]),
    ...gaps(composed('SectionHeader'), ['section-header-gap', 'section-header-padding-right']),
    ...gaps(stale, ['label-input-label-color', 'label-input-label-font-family', 'label-input-label-font-weight']),
  },
  notes: 'Desktop mock 1074 × ~3680. Code: two columns from a 560px container up (halves, or Dual File\'s 324 / fill split), one column below; the AI provider rows wrap the API key under the model when narrow. Values persist per section through integrations:get / integrations:save (figma.clientStorage, zod-validated, field rules in @shared/integrations/validate). Test Connection is wired for Jira (via the proxy) and Dual File Mode (Figma REST); other sections say it is not wired. Dual File is ahead of Figma: code has two file slots, each with ID, API key and a "File N contains" dropbox (Variables / Components / Variables + Components), where the frame still shows the Variables/Components ID + key pairs. Figma has Styleguide ID as a "dropbox"; code uses an Input because listing styleguides needs the Zeroheight API. Select options (branches, paths, models) are fixed lists until the GitHub/AI APIs are wired. The Jira "Base URL - Enterprise" helper in Figma is the Input Box placeholder copy; code says what the field is for.',
} as const
