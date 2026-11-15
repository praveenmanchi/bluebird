// Sample data for ?mode=mock, stories and tests: the Button component and the
// Publish page, as the Figma "Documentation · 600" screens show them.
import type { RawComponent } from './sandbox/collect-component'
import type { PageInfo, PageScan, ScreenScan, Ticket } from './types'

export const BUTTON: RawComponent = {
  summary: {
    nodeId: '40000040:5139', name: 'Button', kind: 'Component set', variants: 12, properties: ['Type', 'State', 'Size', 'Label', 'Leading icon'],
    tokens: 4, nested: 2, rawValues: 0, brands: ['Bridge', 'Ikea', 'Richemont', 'Disney', 'Fiskars'], preview: null,
  },
  anatomy: [
    { n: 1, name: 'Container', detail: 'Auto layout, row', x: 0, y: 0 },
    { n: 2, name: 'Leading icon', detail: 'Instance swap “Leading icon”, off by default', x: 0.18, y: 0 },
    { n: 3, name: 'Label', detail: 'Text property “Label”', x: 0.6, y: 0 },
    { n: 4, name: 'Trailing icon', detail: 'Instance swap “Trailing icon”, off by default', x: 1, y: 0 },
  ],
  properties: [
    { name: 'Type', value: 'Primary · Secondary' },
    { name: 'State', value: 'Default · Hover · Disabled' },
    { name: 'Size', value: 'Medium · Large' },
    { name: 'Label', value: 'Text · “Button”' },
    { name: 'Leading icon', value: 'Instance swap' },
  ],
  tokens: [
    { name: 'button/primary/bg/default', kind: 'color', role: 'Fill', layer: 'Container', alias: 'surface/accent', value: '#0978C8' },
    { name: 'button/primary/fg/default', kind: 'color', role: 'Text', layer: 'Label', alias: 'text/on-accent', value: '#FFFFFF' },
    { name: 'button/primary/radius', kind: 'number', role: 'Corner radius', layer: 'Container', alias: 'radius/lg', value: '6' },
    { name: 'button/primary/padding-x', kind: 'number', role: 'Padding x', layer: 'Container', alias: 'space/inset-lg', value: '13' },
  ],
  brandDiff: {
    token: 'button/primary/bg/default',
    values: [{ brand: 'Bridge', value: '#0978C8' }, { brand: 'Ikea', value: '#161616' }, { brand: 'Richemont', value: '#004165' }, { brand: 'Disney', value: '#0063E5' }, { brand: 'Fiskars', value: '#FF8E00' }],
  },
  checks: [
    { status: 'fail', title: 'Contrast 1.4.3 · fails at 3.5:1', detail: 'Label #FFFFFF on #0C8CE9 · needs 4.5:1 · measured in the current brand mode' },
    { status: 'warning', title: 'Target size 2.5.8', detail: '32 px on its short side · passes AA 24 px, below 44 px for 2.5.5' },
  ],
  code: '<Button type="primary" size="medium">\n  Save changes\n</Button>',
}

/** The same Button after a designer changed it: what "Out of date" compares against. */
export const BUTTON_CHANGED: RawComponent = {
  ...BUTTON,
  summary: { ...BUTTON.summary, variants: 18 },
  properties: BUTTON.properties.map((p) => p.name === 'Size' ? { ...p, value: 'Small · Medium · Large' } : p),
  tokens: BUTTON.tokens.map((t) => t.name === 'button/primary/radius' ? { ...t, value: '8' } : t),
}

export const PAGES: readonly PageInfo[] = [
  { id: 'p:publish', name: 'Publish', screens: 14, flows: 6 },
  { id: 'p:mcp', name: 'MCP', screens: 13, flows: 8 },
  { id: 'p:login', name: 'Login', screens: 10, flows: 1 },
  { id: 'p:jira', name: 'Jira', screens: 12, flows: 0 },
  { id: 'p:settings', name: 'Settings', screens: 3, flows: 0 },
]

const SCREEN_NAMES = ['Extract', 'Changes', 'Details', 'Release notes', 'Final review', 'Publishing', 'Published', 'First release', 'No changes', 'Not connected', 'Empty file', 'Extract failed', 'Push rejected', 'Build failed']

function screen(i: number, page: string, prefix: string, linked: boolean): ScreenScan {
  const name = `${page} · ${SCREEN_NAMES[i] ?? `Screen ${i + 1}`}`
  return {
    id: `${prefix}:s${i}`, name, page,
    unboundGaps: prefix === 'publish' && i < 3 ? [{ id: `${prefix}:gap${i}`, name: i === 2 ? 'Link actions' : 'Extract row', gap: 8 }] : [],
    frames: prefix === 'publish' ? [{ id: `${prefix}:actions${i}`, name: 'Actions bar' }, ...(i < 6 ? [{ id: `${prefix}:detail${i}`, name: 'Detail panel' }] : [])] : [],
    defaultNamed: prefix === 'publish' && i < 2 ? [{ id: `${prefix}:frame${i}`, name: 'Frame 1430102627' }, { id: `${prefix}:frame${i}b`, name: 'Frame 1430102628' }] : [],
    rawColors: 0, rawTextSizes: 0, linked,
    components: [{ name: 'Button', tier: 'atoms' }, { name: 'Change Row', tier: 'molecules' }, ...(i === 0 ? [{ name: 'Pipeline', tier: 'organisms' as const }] : [])],
  }
}

function scan(info: PageInfo, prefix: string, links: number): PageScan {
  return {
    id: info.id, name: info.name, flows: info.flows, links,
    // On a prototyped page every screen but "Empty file" is linked.
    screens: Array.from({ length: info.screens }, (_, i) => screen(i, info.name, prefix, links > 0 && SCREEN_NAMES[i] !== 'Empty file')),
  }
}

export const SCANS: Readonly<Record<string, PageScan>> = {
  'p:publish': scan(PAGES[0]!, 'publish', 21),
  'p:mcp': scan(PAGES[1]!, 'mcp', 30),
  'p:login': scan(PAGES[2]!, 'login', 9),
  'p:jira': scan(PAGES[3]!, 'jira', 0),
  'p:settings': scan(PAGES[4]!, 'settings', 0),
}

export const TICKETS: readonly Ticket[] = [
  { key: 'BB-210', summary: 'Publish flow v2 · build the tab from the 600 px design', status: 'In Progress' },
  { key: 'BB-318', summary: 'Component documentation · generate a spec from a component', status: 'To Do' },
  { key: 'BB-322', summary: 'Hand-off page for a finished flow', status: 'To Do' },
]
