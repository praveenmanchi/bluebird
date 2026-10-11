// Sample data for the AI Agents tab, copied from the Figma screens (AI Agents ·
// Gallery / Setup / Running / Results / Voice / Run all). UI only: nothing here
// comes from Figma or an AI yet. Copy that the screens do not show (the other
// agents' rule packs and findings, the other scope sizes) is marked "not in Figma".
import type { BotAvatarProps, FindingSeverity, RatingLevel } from '@shared/ui'

export type AgentId = 'accessibility' | 'content' | 'writing' | 'spelling' | 'design-system' | 'localization'
export type BotAgent = NonNullable<BotAvatarProps['agent']>
export type CardState = 'ready' | 'running' | 'idle' | 'coming-soon'
export type ScopeId = 'selection' | 'frame' | 'section' | 'page'
export type RunMode = 'review' | 'suggest' | 'autofix'

export interface AgentRule { id: string; name: string; description: string; level: RatingLevel; enabled: boolean }

export interface AgentFinding {
  id: string
  severity: FindingSeverity
  title: string
  meta: string
  /** The suggested swap, shown as the Fix chip; null when the agent only explains. */
  fix: string | null
  /** Can be applied with tokens alone (the "Fixable" filter and "Apply N safe fixes"). */
  fixable: boolean
  /** Layer to select on Locate. Fixture ids: the sandbox answers "Layer no longer exists". */
  nodeId: string
}

export interface AgentDef {
  id: AgentId
  bot: BotAgent
  /** Gallery card and pipeline name. */
  name: string
  /** Agent Header name. */
  title: string
  purpose: string
  headerPurpose: string
  /** The card's rule-pack Context Chip. */
  rulesLabel: string
  headerChips: readonly string[]
  card: { state: CardState; meta?: string }
  /** Rule-pack name used in the first progress step ("Loaded rule pack · …"). */
  rulePack: string
  ruleHead: string
  /** Whether the rule pack carries WCAG levels (the Rule Row's Rating). */
  levels: boolean
  rules: readonly AgentRule[]
  runLabel: string
  /** Running view progress steps after "Loaded rule pack". */
  steps: readonly string[]
  runningNote: string
  scoreLabel: string
  /** Score before any fix is applied. */
  score: number
  findings: readonly AgentFinding[]
  /** Run all pipeline row. */
  pipeline: { running: { label: string; unit: string; total: number }; done: string; findings: number; fixable: number }
}

export const SCOPES: readonly { id: ScopeId; label: string }[] = [
  { id: 'selection', label: 'Selection' },
  { id: 'frame', label: 'Current frame' },
  { id: 'section', label: 'Section' },
  { id: 'page', label: 'Whole page' },
]

/** What each scope covers. Selection is the Figma copy; the others are not in Figma. */
export const SCOPE_SIZE: Record<ScopeId, { name: string; frames: number; layers: number }> = {
  selection: { name: 'Checkout flow', frames: 3, layers: 148 },
  frame: { name: 'Payment', frames: 1, layers: 52 },
  section: { name: 'Checkout', frames: 5, layers: 231 },
  page: { name: 'Checkout flow', frames: 12, layers: 640 },
}

export const MODES: readonly { id: RunMode; label: string; help: string }[] = [
  { id: 'review', label: 'Review only', help: 'Review only lists each issue with the rule it breaks. Nothing changes in the file.' },
  { id: 'suggest', label: 'Suggest fixes', help: 'Suggest fixes explains each issue and proposes a token swap. Nothing changes until you apply it.' },
  { id: 'autofix', label: 'Auto-fix safe issues', help: 'Auto-fix safe issues applies the token swaps that cannot change the design, and lists the rest for you.' },
]

export const BRAND_MODES: readonly string[] = ['Bridge', 'Ikea', 'Richemont', 'Disney', 'Fiskars']

export const OUTPUTS: readonly { id: string; label: string; checked: boolean }[] = [
  { id: 'annotations', label: 'Dev Mode annotations on each issue', checked: true },
  { id: 'report', label: 'Report (Markdown + JSON)', checked: true },
  { id: 'jira', label: 'Create Jira issues for what it can’t fix', checked: false },
  { id: 'summary', label: 'Post a summary on BB-142', checked: true },
]

export const GALLERY_COPY = {
  title: 'UX AI agents',
  subtitle: 'Expert agents that review, explain and fix your designs. Pick a scope, then run one agent or all of them.',
  runAll: 'Run all on scope',
  recent: 'RECENT RUNS',
} as const

export const RECENT_RUNS: readonly { id: string; agent: AgentId; bot: BotAgent; text: string }[] = [
  { id: 'r1', agent: 'accessibility', bot: 'accessibility', text: 'Accessibility · Checkout flow (3 frames) · 14 issues, 6 fixed · 2h ago' },
  { id: 'r2', agent: 'spelling', bot: 'spelling', text: 'Spelling & grammar · Settings page · 3 typos fixed · 2h ago' },
]

const a11yFindings: readonly AgentFinding[] = [
  { id: 'a1', severity: 'critical', title: 'Key text is 2.9:1 on the selected row — needs 4.5:1', meta: 'WCAG 1.4.3 · Ticket Row › Key · Ikea, Richemont', fix: 'Fix: jira/text/key → text/primary (7.8:1)', fixable: true, nodeId: 'fixture:a1' },
  { id: 'a2', severity: 'critical', title: 'Status lozenge text is 3.1:1 in Fiskars — needs 4.5:1', meta: 'WCAG 1.4.3 · Meta Badge › Label · Fiskars', fix: 'Fix: feedback/warning → text/primary on tinted fill', fixable: true, nodeId: 'fixture:a2' },
  { id: 'a3', severity: 'serious', title: 'Priority icon is 2.4:1 against the row — needs 3:1', meta: 'WCAG 1.4.11 · Ticket Row › Priority · Fiskars', fix: 'Fix: jira/priority/medium → feedback/warning-strong', fixable: true, nodeId: 'fixture:a3' },
  { id: 'a4', severity: 'moderate', title: 'Copy-link icon is 16×16 with 4px spacing — needs a 24px target', meta: 'WCAG 2.5.8 · Figma Link Card › Copy link', fix: 'Fix: wrap in a 24px target (jira/size/avatar)', fixable: true, nodeId: 'fixture:a4' },
  { id: 'a5', severity: 'minor', title: 'Avatar initials have no accessible name', meta: 'WCAG 1.1.1 · Avatar · 6 instances', fix: 'Fix: add “Assigned to {name}” annotation', fixable: false, nodeId: 'fixture:a5' },
  // Not in Figma: the other 9 of the 14 issues the summary counts.
  { id: 'a6', severity: 'serious', title: 'Focus ring is 1.9:1 on the card surface — needs 3:1', meta: 'WCAG 1.4.11 · Button › Focus · Disney', fix: 'Fix: border/focus → border/accent', fixable: true, nodeId: 'fixture:a6' },
  { id: 'a7', severity: 'serious', title: 'Checkbox border is 2.2:1 when unchecked — needs 3:1', meta: 'WCAG 1.4.11 · Checkbox › Box · Richemont', fix: 'Fix: checkbox/border → border/strong', fixable: true, nodeId: 'fixture:a7' },
  { id: 'a8', severity: 'serious', title: 'Close button has no focus state variant', meta: 'WCAG 2.4.7 · Banner › Close', fix: null, fixable: false, nodeId: 'fixture:a8' },
  { id: 'a9', severity: 'moderate', title: 'Tab labels sit 4px apart — needs a 24px target', meta: 'WCAG 2.5.8 · Tab bar › Tab', fix: null, fixable: false, nodeId: 'fixture:a9' },
  { id: 'a10', severity: 'moderate', title: 'Helper text clips at 1.5× line height', meta: 'WCAG 1.4.12 · Input › Helper', fix: null, fixable: false, nodeId: 'fixture:a10' },
  { id: 'a11', severity: 'moderate', title: 'Error message clips at 0.12em letter spacing', meta: 'WCAG 1.4.12 · Input › Error', fix: null, fixable: false, nodeId: 'fixture:a11' },
  { id: 'a12', severity: 'moderate', title: 'Stepper dots are 12×12 with no spacing', meta: 'WCAG 2.5.8 · Stepper › Step', fix: null, fixable: false, nodeId: 'fixture:a12' },
  { id: 'a13', severity: 'moderate', title: 'Card title overlaps the badge at 2× paragraph spacing', meta: 'WCAG 1.4.12 · Agent Card › Name', fix: null, fixable: false, nodeId: 'fixture:a13' },
  { id: 'a14', severity: 'minor', title: 'Logo image has no text alternative', meta: 'WCAG 1.1.1 · Banner › Logo', fix: null, fixable: false, nodeId: 'fixture:a14' },
]

/** Generic copy for agents the Setup / Running / Results screens do not draw. */
function plainRules(rows: readonly [string, string][]): AgentRule[] {
  return rows.map(([name, description], i) => ({ id: `r${i}`, name, description, level: 'AA', enabled: true }))
}

export const AGENTS: readonly AgentDef[] = [
  {
    id: 'accessibility', bot: 'accessibility', name: 'Accessibility', title: 'Accessibility agent',
    purpose: 'Reviews contrast, target size, focus and text spacing against WCAG 2.2 in every brand mode.',
    headerPurpose: 'Expert in WCAG 2.2. Reviews your selection, frame or page, explains every issue and can fix it with your tokens.',
    rulesLabel: 'WCAG 2.2 AA · 86 rules', headerChips: ['WCAG 2.2 AA · 86 rules', 'Brand UI · 5 modes'],
    card: { state: 'ready' },
    rulePack: 'WCAG 2.2 AA', ruleHead: 'RULE PACK · WCAG 2.2', levels: true,
    rules: [
      { id: '1.4.3', name: '1.4.3 Contrast (minimum)', description: 'Text 4.5:1, large text 3:1, in every brand mode', level: 'AA', enabled: true },
      { id: '1.4.11', name: '1.4.11 Non-text contrast', description: 'Icons, borders and focus rings 3:1', level: 'AA', enabled: true },
      { id: '2.5.8', name: '2.5.8 Target size (minimum)', description: 'Targets 24×24 or spaced apart', level: 'AA', enabled: true },
      { id: '1.4.12', name: '1.4.12 Text spacing', description: 'Line, letter and paragraph spacing hold up', level: 'AA', enabled: true },
      { id: '2.4.7', name: '2.4.7 Focus visible', description: 'Every control shows a focus state variant', level: 'AA', enabled: true },
      { id: '1.1.1', name: '1.1.1 Non-text content', description: 'Icons and images carry a text alternative', level: 'A', enabled: true },
      { id: '1.4.6', name: '1.4.6 Contrast (enhanced)', description: 'Text 7:1, large text 4.5:1', level: 'AAA', enabled: false },
    ],
    runLabel: 'Run accessibility review',
    steps: ['Resolved Brand UI tokens in 5 brand modes', 'Checked contrast · 3 frames × 5 modes', 'Checking target size and spacing exceptions…'],
    runningNote: 'Keep designing. Results also land in the Accessibility tab.',
    scoreLabel: 'WCAG 2.2 AA conformance', score: 70,
    findings: a11yFindings,
    pipeline: { running: { label: 'Checking contrast', unit: 'frames', total: 3 }, done: '14 issues · 6 fixable with tokens', findings: 14, fixable: 6 },
  },
  {
    id: 'content', bot: 'content', name: 'Content', title: 'Content agent',
    purpose: 'Finds lorem ipsum, fake names and placeholder images, and swaps in realistic content for each persona.',
    headerPurpose: 'Finds lorem ipsum, fake names and placeholder images, and swaps in realistic content for each persona.',
    rulesLabel: 'Content guide · 24 rules', headerChips: ['Content guide · 24 rules', 'Brand UI · 5 modes'],
    card: { state: 'running' },
    rulePack: 'Content guide', ruleHead: 'RULE PACK · CONTENT GUIDE', levels: false,
    // Not in Figma.
    rules: plainRules([['Placeholder text', 'Lorem ipsum and “Text goes here”'], ['Fake names', 'John Doe, Jane Smith and friends'], ['Placeholder images', 'Grey boxes and stock silhouettes']]),
    runLabel: 'Run content review',
    steps: ['Loaded personas · 3 personas', 'Found placeholder text in 3 frames', 'Replacing placeholder names…'],
    runningNote: 'Keep designing. Results stream in as each frame finishes.',
    scoreLabel: 'Realistic content', score: 62,
    findings: [
      { id: 'c1', severity: 'serious', title: 'Order summary still reads “Lorem ipsum dolor”', meta: 'Placeholder text · Order Summary › Body', fix: 'Fix: swap in persona copy (Maya, returning buyer)', fixable: true, nodeId: 'fixture:c1' },
      { id: 'c2', severity: 'moderate', title: 'Assignee is “John Doe” in 4 rows', meta: 'Fake names · Ticket Row › Assignee', fix: 'Fix: use the team roster', fixable: true, nodeId: 'fixture:c2' },
      { id: 'c3', severity: 'minor', title: 'Product image is a grey placeholder', meta: 'Placeholder images · Cart Item › Image', fix: null, fixable: false, nodeId: 'fixture:c3' },
    ],
    pipeline: { running: { label: 'Replacing placeholder names', unit: 'layers', total: 9 }, done: '9 placeholders · all replaced', findings: 9, fixable: 9 },
  },
  {
    id: 'writing', bot: 'writing', name: 'UX writing', title: 'UX writing agent',
    purpose: 'Checks microcopy against your voice and tone: clarity, sentence case, button verbs, error messages.',
    headerPurpose: 'Checks microcopy against your voice and tone: clarity, sentence case, button verbs, error messages.',
    rulesLabel: 'Voice & tone · 42 rules', headerChips: ['Voice & tone · 42 rules', 'Brand UI · 5 modes'],
    card: { state: 'ready', meta: 'Last run yesterday · 9 suggestions' },
    rulePack: 'Voice & tone', ruleHead: 'RULE PACK · VOICE & TONE', levels: false,
    rules: plainRules([['Sentence case', 'Titles, buttons and labels'], ['Button verbs', 'Buttons start with what they do'], ['Error messages', 'Say what happened and what to do next']]),
    runLabel: 'Run UX writing review',
    steps: ['Read 64 text layers', 'Checked sentence case and button verbs', 'Checking error messages…'],
    runningNote: 'Keep designing. Results stream in as each frame finishes.',
    scoreLabel: 'Voice & tone match', score: 81,
    findings: [
      { id: 'w1', severity: 'moderate', title: 'Button reads “Submit” — say what it does', meta: 'Button verbs · Checkout › Pay button', fix: 'Fix: “Pay £42.00”', fixable: true, nodeId: 'fixture:w1' },
      { id: 'w2', severity: 'moderate', title: 'Error “Invalid input” does not say what to fix', meta: 'Error messages · Card number › Error', fix: 'Fix: “Enter the 16 digits on the front of your card”', fixable: true, nodeId: 'fixture:w2' },
      { id: 'w3', severity: 'minor', title: '“Shipping Address” is in title case', meta: 'Sentence case · Address › Title', fix: 'Fix: “Shipping address”', fixable: true, nodeId: 'fixture:w3' },
    ],
    pipeline: { running: { label: 'Checking microcopy', unit: 'text layers', total: 64 }, done: '9 suggestions · 2 button labels, 7 error messages', findings: 9, fixable: 3 },
  },
  {
    id: 'spelling', bot: 'spelling', name: 'Spelling & grammar', title: 'Spelling & grammar agent',
    purpose: 'Catches typos, grammar and inconsistent terms across every text layer, with your product dictionary.',
    headerPurpose: 'Catches typos, grammar and inconsistent terms across every text layer, with your product dictionary.',
    rulesLabel: 'en-GB · product dictionary', headerChips: ['en-GB · product dictionary', 'Brand UI · 5 modes'],
    card: { state: 'ready', meta: 'Last run 2h ago · 3 typos' },
    rulePack: 'en-GB', ruleHead: 'RULE PACK · EN-GB', levels: false,
    rules: plainRules([['Spelling', 'en-GB with the product dictionary'], ['Grammar', 'Agreement, articles and punctuation'], ['Terminology', 'One name per concept across the file']]),
    runLabel: 'Run spelling check',
    steps: ['Read 64 text layers', 'Checked spelling against en-GB', 'Checking terminology…'],
    runningNote: 'Keep designing. Results stream in as each frame finishes.',
    scoreLabel: 'Text without errors', score: 95,
    findings: [
      { id: 's1', severity: 'moderate', title: '“Recieve” is misspelled', meta: 'Spelling · Order confirmation › Body', fix: 'Fix: “Receive”', fixable: true, nodeId: 'fixture:s1' },
      { id: 's2', severity: 'minor', title: '“Colour” and “Color” both appear', meta: 'Terminology · Filters › Label', fix: 'Fix: “Colour” (en-GB)', fixable: true, nodeId: 'fixture:s2' },
      { id: 's3', severity: 'minor', title: '“Its” should be “It’s”', meta: 'Grammar · Empty state › Body', fix: 'Fix: “It’s”', fixable: true, nodeId: 'fixture:s3' },
    ],
    pipeline: { running: { label: 'Checking spelling', unit: 'text layers', total: 64 }, done: '3 typos · all fixable', findings: 3, fixable: 3 },
  },
  {
    id: 'design-system', bot: 'design-system', name: 'Design system', title: 'Design system agent',
    purpose: 'Flags detached instances, raw colours and off-scale spacing, and rebinds them to Brand UI tokens.',
    headerPurpose: 'Flags detached instances, raw colours and off-scale spacing, and rebinds them to Brand UI tokens.',
    rulesLabel: 'Brand UI · 421 tokens · 87 components', headerChips: ['Brand UI · 421 tokens · 87 components', 'Brand UI · 5 modes'],
    card: { state: 'idle' },
    rulePack: 'Brand UI', ruleHead: 'RULE PACK · BRAND UI', levels: false,
    rules: plainRules([['Detached instances', 'Frames that used to be a component'], ['Raw colours', 'Fills and strokes without a variable'], ['Off-scale spacing', 'Gaps and padding off the spacing scale']]),
    runLabel: 'Run design system check',
    steps: ['Loaded Brand UI · 421 tokens', 'Checked raw colours', 'Checking spacing scale…'],
    runningNote: 'Keep designing. Results stream in as each frame finishes.',
    scoreLabel: 'Token coverage', score: 87,
    findings: [
      { id: 'd1', severity: 'serious', title: 'Card is a detached instance of Agent Card', meta: 'Detached instances · Gallery › Card', fix: 'Fix: swap back to Agent Card / Ready', fixable: true, nodeId: 'fixture:d1' },
      { id: 'd2', severity: 'moderate', title: 'Fill #1A5EE5 has no variable', meta: 'Raw colours · Scope › Selection', fix: 'Fix: bind to surface/accent', fixable: true, nodeId: 'fixture:d2' },
    ],
    pipeline: { running: { label: 'Checking token bindings', unit: 'layers', total: 148 }, done: '5 raw values · all rebindable', findings: 5, fixable: 5 },
  },
  {
    id: 'localization', bot: 'localization', name: 'Localization', title: 'Localization agent',
    purpose: 'Tests text expansion, truncation and right-to-left layouts in German, French and Arabic.',
    headerPurpose: 'Tests text expansion, truncation and right-to-left layouts in German, French and Arabic.',
    rulesLabel: 'de · fr · ar · RTL', headerChips: ['de · fr · ar · RTL'],
    card: { state: 'coming-soon' },
    rulePack: 'de · fr · ar', ruleHead: 'RULE PACK · LOCALES', levels: false,
    rules: [], runLabel: 'Run localization check', steps: [], runningNote: '',
    scoreLabel: 'Localization', score: 0, findings: [],
    pipeline: { running: { label: 'Checking locales', unit: 'frames', total: 3 }, done: 'Not available yet', findings: 0, fixable: 0 },
  },
]

/** Run all order on the Figma screen (done first, then running, queued, skipped). */
export const PIPELINE_ORDER: readonly AgentId[] = ['accessibility', 'spelling', 'writing', 'content', 'design-system', 'localization']

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
  /** Not in Figma: the canned reply the bar speaks after the user lets go of the mic. */
  speaking: '“Applying the 4 safe fixes now. The other 2 are yours.”',
} as const

export const RUN_ALL_COPY = {
  title: 'Running all agents',
  subtitle: (scope: string, name: string, frames: number) => `${scope} · ${name} · ${frames} frames · agents run one after another so fixes don’t collide`,
  note: 'Apply unlocks when every agent has finished.',
} as const

export function agentById(id: AgentId): AgentDef {
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) throw new Error(`Unknown agent ${id}`)
  return agent
}

export const isRunnable = (agent: AgentDef): boolean => agent.card.state !== 'coming-soon'
