// First-run tour, built from the persona's own tabs: Welcome → one step per tab that
// has a demo scene → Setup. Copy follows the Figma "Onboarding flow" section
// (page "onboarding screens", 40000423:5239); tabs without a scene are left out
// rather than explained with a placeholder.
import type { ResolvedTab } from '@shared/config'

export type SceneId = 'welcome' | 'a11y' | 'audit' | 'varsearch' | 'varmapper' | 'jira' | 'mcp' | 'uxai' | 'agents' | 'publish' | 'setup'

/** The Settings entry at the right end of the tour's tab list (Setup step). */
export const SETTINGS_TAB = 'settings'

export interface TourStep {
  /** Stable id: the tab id for tab steps, `welcome` / `setup` otherwise. */
  id: string
  scene: SceneId
  title: string
  body: string
  /** Tab highlighted in the tour's tab list; null on Welcome. */
  tabId: string | null
}

interface TabCopy { scene: SceneId; title: string; body: string }

const TAB_COPY: Readonly<Record<string, TabCopy>> = {
  a11y: {
    scene: 'a11y',
    title: 'Catch contrast issues before they ship',
    body: 'Scan a selection, frame or page against WCAG 2.2, 2.1 or 2.0. Every finding shows its ratio in every brand and suggests the token that fixes it.',
  },
  audit: {
    scene: 'audit',
    title: 'One audit for the whole design system',
    body: 'Run it on a selection, a page or several pages. One score shows how much comes from the system, then every hard-coded colour, stray spacing and detached component, with a way to find each one.',
  },
  varsearch: {
    scene: 'varsearch',
    title: 'Find everything that uses a variable',
    body: 'Type a variable name and see every component, frame and text style bound to it, on all pages or the ones you pick. Select the layers or jump straight to them.',
  },
  varmapper: {
    scene: 'varmapper',
    title: 'Turn hard-coded values into variables',
    body: 'Select a layer to see every hard-coded colour, border, spacing and type value, with the variable from your Dual File source. Bind one or many.',
  },
  jira: {
    scene: 'jira',
    title: 'Your Jira tickets, next to your designs',
    body: 'Connect a board to see your stories without leaving Figma. Link frames to tickets, check status and pick up the next item.',
  },
  mcp: {
    scene: 'mcp',
    title: 'Hand off designs straight to code',
    body: 'Check a screen is ready, generate code through the Figma MCP server, then push a branch and open a pull request.',
  },
  uxai: {
    scene: 'uxai',
    title: 'Ask your design system anything',
    body: 'Attach variables, components or docs and ask in plain language. Answers come back with swatches, type specimens and component previews.',
  },
  publish: {
    scene: 'publish',
    title: 'Publish your design system as a release',
    body: 'Extract what changed since the last release, review it per brand, let the version and notes draft themselves, then publish to your docs site.',
  },
  agents: {
    scene: 'agents',
    title: 'Expert agents that review your work',
    body: 'Point an accessibility, content, writing, spelling, design-system or localisation agent at your selection and get findings or fixed screens back.',
  },
}

const WELCOME: TourStep = {
  id: 'welcome',
  scene: 'welcome',
  title: 'Welcome to Design Studio',
  body: 'Accessibility checks, tokens, Jira, code handoff and AI help in one plugin, themed for your brand. Here’s a quick tour of each tab.',
  tabId: null,
}

const SETUP: TourStep = {
  id: 'setup',
  scene: 'setup',
  title: 'One last thing — add a key',
  body: 'The AI features need a Claude, OpenAI, or Gemini API key — paste one in Settings and they light up. Everything else works right away.',
  tabId: SETTINGS_TAB,
}

/** True when the tour has a demo scene for this tab id. */
export function hasTourStep(tabId: string): boolean {
  return Object.prototype.hasOwnProperty.call(TAB_COPY, tabId)
}

export function buildTour(tabs: readonly Pick<ResolvedTab, 'id'>[]): TourStep[] {
  const tabSteps = tabs.flatMap((tab): TourStep[] => {
    const copy = TAB_COPY[tab.id]
    return copy ? [{ id: tab.id, tabId: tab.id, ...copy }] : []
  })
  return [WELCOME, ...tabSteps, SETUP]
}

/** "02 / 07" — the Figma counter pads both numbers to two digits. */
export function stepCounter(index: number, total: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(index + 1)} / ${pad(total)}`
}
