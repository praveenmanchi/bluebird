// Sample runs for the browser dev harness (?mode=mock), stories and tests. The
// copy follows the Figma screens (AI Agents · Gallery / Setup / Running / Results /
// Voice / Run all); in Figma the sandbox replaces all of it with real findings.
import type { AgentFinding, AgentId, RunResult, ScopeId, ScopeInfo } from './messages'

export { AGENTS, BRAND_MODES, GALLERY_COPY, MODES, OUTPUTS, PIPELINE_ORDER, RUN_ALL_COPY, SCOPES, agentById, isRunnable } from './agents'
export type { AgentDef, AgentRule, BotAgent } from './agents'

/** What each scope reads in the sample file. */
export const SAMPLE_SCOPES: Record<ScopeId, ScopeInfo> = {
  selection: { scope: 'selection', name: 'Checkout flow', frames: 3, layers: 148, textLayers: 42, instances: 31, truncated: false, empty: false },
  frame: { scope: 'frame', name: 'Payment', frames: 1, layers: 52, textLayers: 14, instances: 9, truncated: false, empty: false },
  section: { scope: 'section', name: 'Checkout', frames: 5, layers: 231, textLayers: 60, instances: 48, truncated: false, empty: false },
  page: { scope: 'page', name: 'Checkout flow', frames: 12, layers: 640, textLayers: 170, instances: 120, truncated: false, empty: false },
}

const f = (agent: AgentId, rule: string, id: string, severity: AgentFinding['severity'], title: string, meta: string, fixLabel: string | null, fixable: boolean, fix: AgentFinding['fix'] = fixLabel ? { kind: 'manual', note: fixLabel } : null): AgentFinding =>
  ({ id: `${agent}:${rule}:${id}`, agent, rule, severity, title, meta, nodeId: `fixture:${id}`, nodeIds: [`fixture:${id}`], fix, fixLabel, fixable })

export const SAMPLE_FINDINGS: Record<AgentId, readonly AgentFinding[]> = {
  accessibility: [
    f('accessibility', '1.4.3', 'a1', 'critical', 'Key text is 2.9:1 on the selected row — needs 4.5:1', 'WCAG 1.4.3 · Ticket Row › Key · Ikea mode', 'Fix: jira/text/key → text/primary (7.8:1)', true, { kind: 'rebind-fill', variableId: 'fixture:var', variableName: 'text/primary' }),
    f('accessibility', '1.4.3', 'a2', 'critical', 'Status lozenge text is 3.1:1 in Fiskars — needs 4.5:1', 'WCAG 1.4.3 · Meta Badge › Label · Fiskars mode', 'Fix: feedback/warning → text/primary on tinted fill', true, { kind: 'rebind-fill', variableId: 'fixture:var', variableName: 'text/primary' }),
    f('accessibility', '1.4.11', 'a3', 'serious', 'Priority icon is 2.4:1 against the row — needs 3:1', 'WCAG 1.4.11 · Ticket Row › Priority · Fiskars mode', 'Fix: jira/priority/medium → feedback/warning-strong', true, { kind: 'rebind-stroke', variableId: 'fixture:var', variableName: 'feedback/warning-strong' }),
    f('accessibility', '2.5.8', 'a4', 'moderate', 'Copy-link icon is 16×16 with 4px spacing — needs a 24px target', 'WCAG 2.5.8 · Figma Link Card › Copy link', 'Fix: grow the hit area to 24×24', true, { kind: 'resize', width: 24, height: 24 }),
    f('accessibility', '1.1.1', 'a5', 'minor', 'Avatar initials have no accessible name', 'WCAG 1.1.1 · Avatar · 6 instances', 'Fix: name it for what it shows', false),
    f('accessibility', '1.4.11', 'a6', 'serious', 'Focus ring is 1.9:1 on the card surface — needs 3:1', 'WCAG 1.4.11 · Button › Focus · Disney mode', 'Fix: border/focus → border/accent', true, { kind: 'rebind-stroke', variableId: 'fixture:var', variableName: 'border/accent' }),
    f('accessibility', '1.4.11', 'a7', 'serious', 'Checkbox border is 2.2:1 when unchecked — needs 3:1', 'WCAG 1.4.11 · Checkbox › Box · Richemont mode', 'Fix: checkbox/border → border/strong', true, { kind: 'rebind-stroke', variableId: 'fixture:var', variableName: 'border/strong' }),
    f('accessibility', '2.4.7', 'a8', 'serious', 'Close button has no focus state variant', 'WCAG 2.4.7 · Banner › Close', null, false),
    f('accessibility', '2.5.8', 'a9', 'moderate', 'Tab labels sit 4px apart — needs a 24px target', 'WCAG 2.5.8 · Tab bar › Tab', null, false),
    f('accessibility', '1.4.12', 'a10', 'moderate', 'Helper text clips at 1.5× line height', 'WCAG 1.4.12 · Input › Helper', null, false),
    f('accessibility', '1.4.12', 'a11', 'moderate', 'Error message clips at 0.12em letter spacing', 'WCAG 1.4.12 · Input › Error', null, false),
    f('accessibility', '2.5.8', 'a12', 'moderate', 'Stepper dots are 12×12 with no spacing', 'WCAG 2.5.8 · Stepper › Step', null, false),
    f('accessibility', '1.4.12', 'a13', 'moderate', 'Card title overlaps the badge at 2× paragraph spacing', 'WCAG 1.4.12 · Agent Card › Name', null, false),
    f('accessibility', '1.1.1', 'a14', 'minor', 'Logo image has no text alternative', 'WCAG 1.1.1 · Banner › Logo', null, false),
  ],
  content: [
    f('content', 'placeholder-text', 'c1', 'serious', 'Lorem ipsum: “Lorem ipsum dolor sit amet…”', 'Lorem ipsum · Order Summary › Body', 'Fix: “Your order ships in 2–3 working days.”', true, { kind: 'replace-text', text: 'Your order ships in 2–3 working days.' }),
    f('content', 'fake-names', 'c2', 'moderate', 'Fake name: “John Doe”', 'Fake name · Ticket Row › Assignee · 4 layers', 'Fix: “Maya Okonkwo”', true, { kind: 'replace-text', text: 'Maya Okonkwo' }),
    f('content', 'placeholder-images', 'c3', 'minor', 'Image is a placeholder image (120×120 grey box)', 'Placeholder images · Cart Item › Image', null, false),
  ],
  writing: [
    f('writing', 'button-verbs', 'w1', 'moderate', 'Button reads “Submit” — say what it does', 'Button verbs · Checkout › Pay button', 'Fix: “Pay £42.00”', true, { kind: 'replace-text', text: 'Pay £42.00' }),
    f('writing', 'error-messages', 'w2', 'moderate', 'Error “Invalid input” does not say what to fix', 'Error messages · Card number › Error', 'Fix: “Enter the 16 digits on the front of your card”', true, { kind: 'replace-text', text: 'Enter the 16 digits on the front of your card' }),
    f('writing', 'sentence-case', 'w3', 'minor', '“Shipping Address” is in title case', 'Sentence case · Address › Title', 'Fix: “Shipping address”', true, { kind: 'replace-text', text: 'Shipping address' }),
  ],
  spelling: [
    f('spelling', 'spelling', 's1', 'moderate', '“Recieve” is misspelled', 'Spelling · Order confirmation › Body', 'Fix: “Receive”', true, { kind: 'replace-text', text: 'You will receive a confirmation email.' }),
    f('spelling', 'terminology', 's2', 'minor', '“Colour” and “Color” both appear', 'Terminology · Filters › Label', 'Fix: “Colour” (en-GB)', true, { kind: 'replace-text', text: 'Colour' }),
    f('spelling', 'grammar', 's3', 'minor', '“Its” should be “It’s”', 'Grammar · Empty state › Body', 'Fix: “It’s quiet in here.”', true, { kind: 'replace-text', text: 'It’s quiet in here.' }),
  ],
  'design-system': [
    f('design-system', 'detached', 'd1', 'serious', 'Card is a detached instance of Agent Card', 'Detached instances · Gallery › Card', 'Fix: swap back to the component', false),
    f('design-system', 'raw-colour', 'd2', 'moderate', 'Fill #1A5EE5 is surface/accent typed by hand', 'Raw colours · Scope › Selection', 'Fix: bind to surface/accent', true, { kind: 'rebind-fill', variableId: 'fixture:var', variableName: 'surface/accent' }),
    f('design-system', 'off-scale', 'd3', 'minor', 'Row gap 12 is space/inline-md typed by hand', 'Off-scale spacing · Checkout › Row', 'Fix: bind to space/inline-md', true, { kind: 'bind-number', field: 'itemSpacing', variableId: 'fixture:var', variableName: 'space/inline-md' }),
  ],
  localization: [
    f('localization', 'expansion', 'l1', 'serious', '“Pay now” may overflow in German, French, Arabic (German needs about 48% more width)', 'Text expansion · Checkout › Pay button · 96px box', 'Fix: allow wrapping or a wider box', false),
    f('localization', 'rtl', 'l2', 'minor', 'Chevron right is directional — mirror it for right-to-left (Arabic)', 'RTL · Breadcrumb › Chevron', null, false),
    f('localization', 'formats', 'l3', 'minor', '“12/31/2026” hard-codes a US date — formats change per locale', 'Locale formats · Order › Delivery date', null, false),
  ],
}

export const SAMPLE_SCORES: Record<AgentId, number> = { accessibility: 70, content: 62, writing: 81, spelling: 95, 'design-system': 87, localization: 74 }

/** A finished sample run for an agent over a scope (what the mock sandbox answers). */
export function sampleRun(agent: AgentId, scope: ScopeId, runId = `sample-${agent}`): RunResult {
  const findings = SAMPLE_FINDINGS[agent]
  return {
    runId, agent, scope: SAMPLE_SCOPES[scope], brandModes: agent === 'accessibility' ? ['Bridge', 'Ikea', 'Richemont', 'Disney', 'Fiskars'] : [],
    steps: SAMPLE_STEPS[agent].map((label) => ({ label, status: 'done' as const })),
    findings, score: SAMPLE_SCORES[agent], checked: SAMPLE_SCOPES[scope].textLayers, durationMs: 3750,
    model: agent === 'spelling' || agent === 'writing' || agent === 'content' ? { provider: 'claude', model: 'claude-opus-5-5' } : null, stopped: false,
  }
}

/** The Running screen's steps per agent (after "Loaded rule pack"). */
export const SAMPLE_STEPS: Record<AgentId, readonly string[]> = {
  accessibility: ['Loaded rule pack · WCAG 2.2 AA (6 rules on)', 'Resolved Brand UI tokens in 5 brand modes', 'Checked contrast · 3 frames × 5 modes', 'Checking target size and spacing exceptions…'],
  content: ['Loaded rule pack · Content guide (all rules on)', 'Read 42 text layers', 'Found placeholder text in 3 frames', 'Asking claude-opus-5-5 for realistic copy (9 placeholders)'],
  writing: ['Loaded rule pack · Voice & tone (all rules on)', 'Read 42 text layers', 'Reviewing microcopy with the model (claude-opus-5-5, 38 texts in 1 request)'],
  spelling: ['Loaded rule pack · en-GB (all rules on)', 'Read 42 text layers', 'Checking spelling and grammar with the model (claude-opus-5-5, 38 texts in 1 request)'],
  'design-system': ['Loaded rule pack · Brand UI (all rules on)', 'Loaded Brand UI · 421 colour and 64 number tokens', 'Checking token bindings against Brand UI'],
  localization: ['Loaded rule pack · de · fr · ar (all rules on)', 'Read 42 text layers', 'Estimating expansion and RTL impact'],
}

export const VOICE_COPY = {
  userAsk: '“Check only the checkout frames and fix contrast in Ikea.”',
  userNote: 'Voice · 0:04 · transcribed',
  reply1: 'On it. Scanning the 3 checkout frames in Ikea mode, contrast rules only.',
  steps: ['Scope: Checkout flow · 3 frames · Ikea mode', 'Rules: 1.4.3 and 1.4.11 only', 'Found 6 issues · 4 fixable with Brand UI tokens'],
  reply2: 'I found 6 contrast issues. 4 can be fixed safely with tokens; 2 need a design decision. Should I apply the 4?',
  spokenNote: 'Spoken reply · 0:06',
  quickReplies: [
    { label: 'Yes, fix the 4', icon: 'status-good' },
    { label: 'Show me first', icon: 'inspect' },
    { label: 'Create Jira issues for the 2', icon: 'jira' },
  ],
  listening: '“Yes — fix the four and leave the other two for me.”',
  speaking: '“Applying the 4 safe fixes now. The other 2 are yours.”',
} as const
