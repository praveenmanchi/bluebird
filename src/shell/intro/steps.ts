// Coach-mark copy and targets. Figma page "↳ Onboarding": section 1.5 (layout intro, 40002978:38298)
// and sections 2.1–2.12 (one tab intro each). Targets are CSS selectors read against the tab's
// first-open state; a step whose target isn't on screen falls back to a centred card, or is dropped
// when it is `optional` (the footer's size controls are hidden in Dev Mode).

export interface IntroStep {
  /** Selector(s) to spotlight; the box is the union of every match unless `first` is set. Omit for a centred card. */
  target?: string | readonly string[]
  /** Spotlight only the first match of each selector. */
  first?: boolean
  /** Drop the step instead of centring the card when the target isn't rendered. */
  optional?: boolean
  title: string
  body: string
}

/** The open tab in the tab row. */
export const ACTIVE_TAB = '.bb-tabbar__tabs .bb-tab[aria-selected="true"]'
/** The footer's info button that replays the current tab's intro. */
export const HELP_BUTTON = '.bb-footer__help'

export const LAYOUT_INTRO: readonly IntroStep[] = [
  { target: '.bb-tabbar__tabs', title: 'Your tabs', body: 'Each tab is one tool, picked for your persona. Click a tab to switch. Scroll the row sideways to see the rest.' },
  { target: '.bb-tabbar__settings', title: 'Settings', body: 'Connect GitHub, Jira, AI and your Figma key, switch persona, or replay any intro.' },
  { target: '.bb-footer__status', optional: true, title: 'Connection status', body: 'Git, UX AI, MCP and Dual File. A green tick means it is set up, amber means something is missing. Hover a pill for details.' },
  { target: '.bb-footer__meta', optional: true, title: 'Last sync and version', body: 'How long since the plugin last read this file, and the plugin version you are on.' },
  { target: '.bb-footer__size', optional: true, title: 'Pick a size', body: 'L, M and S switch the plugin between large, medium and small. L gives you the most room.' },
  { target: '.bb-footer__minimize', optional: true, title: 'Minimize', body: 'Shrinks the plugin to a small bird on the canvas. Click the bird to expand it again. Every tab keeps its place.' },
  { target: '.bb-footer__grip', optional: true, title: 'Resize freely', body: 'Drag this corner to make the plugin any size between S and L.' },
  { target: HELP_BUTTON, title: 'Help on every tab', body: 'The info icon replays the intro for the tab you are on. Next, each tab shows you around the first time you open it.' },
]

interface TabIntro {
  /** Welcome body; the title is "Welcome to <tab label>". Also the What's new pop-up's description. */
  welcome: string
  steps: readonly IntroStep[]
}

const REPLAY: IntroStep = { target: HELP_BUTTON, title: 'Open this tour again', body: 'Click the info icon in the footer any time to replay the intro for this tab.' }

export const TAB_INTROS: Readonly<Record<string, TabIntro>> = {
  varsearch: {
    welcome: 'Find every layer that uses a variable, across pages and brand modes.',
    steps: [
      { target: '.bb-varsearch__toolbar .bb-page-filter', title: 'Choose pages', body: 'Pick which pages to scan. Fewer pages make the search faster.' },
      { target: '.bb-varsearch__toolbar .bb-filter-dropdown', title: 'Filter by layer type', body: 'Narrow results to components, frames or text before you search.' },
      { target: ['.bb-varsearch__search', '.bb-varsearch__go'], title: 'Search a variable', body: 'Type a variable name, such as dropdown/border, then press Search.' },
      { target: '.bb-varsearch__content > *', title: 'Your results land here', body: 'See how many components and layers use the variable. Select them on the canvas or jump straight to one.' },
    ],
  },
  a11y: {
    welcome: 'Check your selection against WCAG in every brand mode.',
    steps: [
      { target: '.bb-a11y__filters', title: 'Set the rules', body: 'Pick the platform, WCAG version and level you need to meet.' },
      { target: '.bb-a11y__toolbar > .bb-button', title: 'Run a scan', body: 'Scans the selected frames. Run it again after each fix.' },
      { target: '.bb-a11y-ready__checks', title: 'What gets checked', body: 'The WCAG principles and rules this scan covers.' },
      { target: '.bb-a11y__results', title: 'Fix each issue', body: 'Results land here. Every issue shows the layer, the colours, why it fails and how to fix it.' },
    ],
  },
  audit: {
    welcome: 'See how much of your file is mapped to the design system.',
    steps: [
      { target: ['.bb-audit__filter', '.bb-audit__source', '.bb-audit__view'], title: 'Choose what to audit', body: 'Pick the pages, the library and the scope to check.' },
      { target: '.bb-audit__cells:has(.bb-kpi-tile)', title: 'Compared against your libraries', body: 'The libraries the audit counts as the design system.' },
      { target: '.bb-audit__cells:has(.bb-version-option)', title: 'Pick a scope', body: 'Audit your selection, this page or the pages you choose.' },
      { target: '.bb-audit__toolbar > .bb-button', title: 'Run the audit', body: 'Counts every layer that uses library components and variables, then shows what to fix.' },
    ],
  },
  varmapper: {
    welcome: 'Find hard-coded values in your selection and bind them to the right variables.',
    steps: [
      { target: ['.bb-varmapper__source', '.bb-varmapper__search'], title: 'Pick the source and filter', body: 'Choose the library to match against, then filter by layer or value.' },
      { target: '.bb-varmapper__tiles', title: 'Read the match types', body: 'Exact is ready to bind. Check and Near need a quick look. No match needs a pick.' },
      { target: '.bb-varmapper__filters .bb-link-button', title: 'Bind them all', body: 'Select every exact match, then bind them in one go.' },
      { target: '.bb-varmapper-row', first: true, title: 'Bind a value', body: 'Each value shows the recommended variable. Press Bind to apply it.' },
    ],
  },
  publish: {
    welcome: 'Turn design-system changes into a versioned release.',
    steps: [
      { target: '.bb-publish__stepper', title: 'Four steps to a release', body: 'Review changes, write release notes, check everything, then publish.' },
      { target: '.bb-publish .bb-pipeline', title: 'Where it goes', body: 'Your file, the repository and the docs site this release goes through. Change the route in Settings.' },
      { target: '.bb-publish-empty-state__actions .bb-button', title: 'Find what changed', body: 'Run extract to compare the file with the last release.' },
      { target: '.bb-publish__actions', title: 'Move on', body: 'When the change list looks right, go to release notes.' },
    ],
  },
  documentation: {
    welcome: 'Generate component specs and hand-off notes from your file.',
    steps: [
      { target: '.bb-docs__modes', title: 'Pick what to document', body: 'Components for specs, Hand-off for screens, Style guide for foundations.' },
      { target: '.bb-selection-preview', title: 'Check your selection', body: 'The component you selected, with its tokens, variants and raw values.' },
      { target: '.bb-docs__options', first: true, title: 'Choose the sections', body: 'Turn on the parts you want in the doc: anatomy, tokens, brands, accessibility, code.' },
      { target: '.bb-docs__actions .bb-button', title: 'Generate the doc', body: 'Places a doc frame on the Documentation page, plus Markdown and JSON for the next release.' },
    ],
  },
  extraction: {
    welcome: 'Save snapshots of your variables and compare them to see what changed.',
    steps: [
      { target: '.bb-extraction__select', title: 'Pick a comparison', body: 'Choose the branch or extraction to compare against.' },
      { target: '.bb-extraction__compare > .bb-button', title: 'Extract', body: 'Save a fresh snapshot of every variable, then compare it with the one you picked.' },
      { target: '.bb-extraction__header .bb-meta-badge', title: 'Repository status', body: 'Whether GitHub is connected, so a comparison can be pushed as a branch.' },
      { target: '.bb-extraction .bb-publish-empty-state', title: 'Changes land here', body: 'Added, modified and removed variables for every brand mode, and the components each change affects.' },
    ],
  },
  history: {
    welcome: 'Everything your team extracted, reported and handed off, in one timeline.',
    steps: [
      { target: '.bb-history__header .bb-meta-badge', title: 'Shared with your team', body: 'History lives in your team repository, so everyone sees the same timeline.' },
      { target: '.bb-history__range', title: 'Pick a date range', body: 'Show the last few days, weeks or everything.' },
      { target: '.bb-history__features', title: 'Filter by feature', body: 'Extraction, changelog, reports, versioning, MCP or UX AI.' },
      { target: '.bb-history-card', first: true, title: 'Open an entry', body: 'Each card shows who did what, the ticket and the change counts. View details opens it.' },
    ],
  },
  mcp: {
    welcome: 'Hand off components and screens to code, then track the pull request.',
    steps: [
      { target: '.bb-mcp-handoff__scenario', title: 'Pick a scenario', body: 'Component to Storybook, screen to code, or a library update.' },
      { target: '.bb-mcp-handoff__stepper', title: 'Four steps', body: 'Select, check, hand off, then track the pull request.' },
      { target: '.bb-mcp-handoff__card', first: true, title: 'Your selection and ticket', body: 'What you selected, how it was detected, and the Jira issue it is linked to.' },
      { target: '.bb-mcp-handoff__panels > .bb-mcp-handoff__card:last-child', title: 'Check the connections', body: 'The MCP server, repository and Storybook this hand-off uses.' },
    ],
  },
  jira: {
    welcome: 'Your Jira tickets inside Figma: read them, update them and link frames.',
    steps: [
      { target: '.bb-jira-board__scope-search', title: 'Find your tickets', body: 'Switch lists, search, or filter by status, sprint and priority.' },
      { target: '.bb-jira-board__tickets', title: 'Pick a ticket', body: 'Tickets are grouped by status. Pick one to open it.' },
      { target: '.bb-jira-board__quick', title: 'Update the ticket', body: 'Change status, story points and priority, or log work, without leaving Figma.' },
      { target: '.bb-jira-board__list-header .bb-link-button', title: 'Stay in sync', body: 'Refresh pulls the latest from Jira.' },
    ],
  },
  uxai: {
    welcome: 'Ask questions about your design system and get answers from your own files.',
    steps: [
      { target: '.bb-uxai-composer', title: 'Ask a question', body: 'Type about colours, type, components or icons.' },
      { target: '.bb-uxai-composer__sources', title: 'Ground the answer', body: 'Add sources so answers come from your own files and libraries.' },
      { target: '.bb-uxai-sources__scroll > *', title: 'Answers land here', body: 'Every answer shows what it searched, and colours, type, components and variables come back as cards.' },
    ],
  },
  agents: {
    welcome: 'Agents review, explain and fix your designs. Pick a scope, then run one or all.',
    steps: [
      { target: '.bb-agents-gallery__tabs', title: 'Pick a scope', body: 'Selection, current frame, section or the whole page.' },
      { target: '.bb-agents-gallery__card', first: true, title: 'Run an agent', body: 'Each card shows what the agent checks and the rules it uses. Press Run to start.' },
      { target: '.bb-agents-gallery__run-all', title: 'Run them all', body: 'Run every ready agent on the scope in one go.' },
    ],
  },
}

/** The steps for one tab: welcome on the open tab, its own steps, then the footer replay. */
export function tabIntroSteps(tabId: string, label: string): IntroStep[] {
  const intro = TAB_INTROS[tabId]
  const welcome: IntroStep = { target: ACTIVE_TAB, title: `Welcome to ${label}`, body: `${intro?.welcome ?? 'A quick look at what this tab does.'} Here is a 30-second tour.` }
  return [welcome, ...(intro?.steps ?? []), REPLAY]
}

/** One-line description for the What's new pop-up. */
export function tabDescription(tabId: string): string {
  return TAB_INTROS[tabId]?.welcome ?? 'A new tool for your persona.'
}
