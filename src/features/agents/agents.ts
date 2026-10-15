// The six agents: who they are, what they check and the copy their screens show.
// Static. What they find comes from the sandbox (../sandbox/run.ts).
import { config } from '@shared/config'
import type { BotAvatarProps, RatingLevel } from '@shared/ui'
import type { AgentId, RunMode, ScopeId } from './messages'

export type { AgentId, RunMode, ScopeId } from './messages'
export type BotAgent = NonNullable<BotAvatarProps['agent']>

export interface AgentRule { id: string; name: string; description: string; level: RatingLevel; enabled: boolean }

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
  /** Rule-pack name used in the first progress step. */
  rulePack: string
  ruleHead: string
  /** Whether the rule pack carries WCAG levels (the Rule Row's Rating). */
  levels: boolean
  rules: readonly AgentRule[]
  runLabel: string
  runningNote: string
  scoreLabel: string
  /** Needs a model key in Settings to do anything useful. */
  needsModel: boolean
  /** Unit the Run all row counts ("text layers", "layers"). */
  unit: string
}

export const SCOPES: readonly { id: ScopeId; label: string }[] = [
  { id: 'selection', label: 'Selection' },
  { id: 'frame', label: 'Current frame' },
  { id: 'section', label: 'Section' },
  { id: 'page', label: 'Whole page' },
]

export const MODES: readonly { id: RunMode; label: string; help: string }[] = [
  { id: 'review', label: 'Review only', help: 'Review only lists each issue with the rule it breaks. Nothing changes in the file.' },
  { id: 'suggest', label: 'Suggest fixes', help: 'Suggest fixes explains each issue and proposes a token swap or new copy. Nothing changes until you apply it.' },
  { id: 'autofix', label: 'Auto-fix safe issues', help: 'Auto-fix safe issues applies the token swaps and text fixes that cannot change the design, and lists the rest for you.' },
]

/** The brand modes the Accessibility agent can check: every brand in plugin.config.json. */
export const BRAND_MODES: readonly string[] = Object.values(config.brand.brands).map((b) => b.source.mode)

export const OUTPUTS: readonly { id: 'annotations' | 'report' | 'jira' | 'summary'; label: string; checked: boolean }[] = [
  { id: 'annotations', label: 'Dev Mode annotations on each issue', checked: true },
  { id: 'report', label: 'Report frame on the canvas', checked: true },
  { id: 'jira', label: 'Copy a Jira-ready list of what it can’t fix', checked: false },
  { id: 'summary', label: 'Download the report (Markdown + JSON)', checked: false },
]

export const GALLERY_COPY = {
  title: 'UX AI agents',
  subtitle: 'Expert agents that review, explain and fix your designs. Pick a scope, then run one agent or all of them.',
  runAll: 'Run all on scope',
  recent: 'RECENT RUNS',
} as const

const level = (id: string, name: string, description: string, lvl: RatingLevel, enabled = true): AgentRule => ({ id, name, description, level: lvl, enabled })
const plain = (rows: readonly [string, string, string][]): AgentRule[] => rows.map(([id, name, description]) => level(id, name, description, 'AA'))

export const AGENTS: readonly AgentDef[] = [
  {
    id: 'accessibility', bot: 'accessibility', name: 'Accessibility', title: 'Accessibility agent',
    purpose: 'Reviews contrast, target size, focus and text spacing against WCAG 2.2 in every brand mode.',
    headerPurpose: 'Expert in WCAG 2.2. Reviews your selection, frame or page, explains every issue and can fix it with your tokens.',
    rulesLabel: 'WCAG 2.2 AA · 7 rules', headerChips: ['WCAG 2.2 AA · 7 rules', `Brand UI · ${BRAND_MODES.length} modes`],
    rulePack: 'WCAG 2.2 AA', ruleHead: 'RULE PACK · WCAG 2.2', levels: true,
    rules: [
      level('1.4.3', '1.4.3 Contrast (minimum)', 'Text 4.5:1, large text 3:1, in every brand mode', 'AA'),
      level('1.4.11', '1.4.11 Non-text contrast', 'Borders doing the job alone reach 3:1', 'AA'),
      level('2.5.8', '2.5.8 Target size (minimum)', 'Interactive layers 24×24 or spaced apart', 'AA'),
      level('1.4.12', '1.4.12 Text spacing', 'Fixed or truncating text boxes that can’t take 1.5× line height', 'AA'),
      level('2.4.7', '2.4.7 Focus visible', 'Control component sets carry a focus state', 'AA'),
      level('1.1.1', '1.1.1 Non-text content', 'Images and icons are named for what they show', 'A'),
      level('1.4.6', '1.4.6 Contrast (enhanced)', 'Text 7:1, large text 4.5:1', 'AAA', false),
    ],
    runLabel: 'Run accessibility review', runningNote: 'Keep designing. Results also land in the Accessibility tab.',
    scoreLabel: 'WCAG 2.2 AA conformance', needsModel: false, unit: 'layers',
  },
  {
    id: 'content', bot: 'content', name: 'Content', title: 'Content agent',
    purpose: 'Finds lorem ipsum, fake names and placeholder images, and writes realistic content in their place.',
    headerPurpose: 'Finds lorem ipsum, fake names and placeholder images, and writes realistic content in their place with your model.',
    rulesLabel: 'Content guide · 4 rules', headerChips: ['Content guide · 4 rules', 'Realistic copy from the model'],
    rulePack: 'Content guide', ruleHead: 'RULE PACK · CONTENT GUIDE', levels: false,
    rules: plain([['placeholder-text', 'Placeholder text', 'Lorem ipsum, “Text goes here”, “Label”'], ['fake-names', 'Fake names', 'John Doe, Jane Smith and friends'], ['placeholder-data', 'Placeholder data', 'example.com emails, 555 numbers, 12345'], ['placeholder-images', 'Placeholder images', 'Grey boxes named image or photo']]),
    runLabel: 'Run content review', runningNote: 'Keep designing. Suggestions arrive once the model answers.',
    scoreLabel: 'Realistic content', needsModel: false, unit: 'text layers',
  },
  {
    id: 'writing', bot: 'writing', name: 'UX writing', title: 'UX writing agent',
    purpose: 'Checks microcopy against your voice and tone: clarity, sentence case, button verbs, error messages.',
    headerPurpose: 'Checks microcopy against your voice and tone: clarity, sentence case, button verbs, error messages. Needs a model key.',
    rulesLabel: 'Voice & tone · 5 rules', headerChips: ['Voice & tone · 5 rules', 'Reviewed by your model'],
    rulePack: 'Voice & tone', ruleHead: 'RULE PACK · VOICE & TONE', levels: false,
    rules: plain([['sentence-case', 'Sentence case', 'Titles, buttons and labels'], ['button-verbs', 'Button verbs', 'Buttons start with what they do'], ['error-messages', 'Error messages', 'Say what happened and what to do next'], ['clarity', 'Clarity', 'Short sentences, no jargon, specific labels'], ['tone', 'Voice & tone', 'Calm, confident, no shouting or apologising']]),
    runLabel: 'Run UX writing review', runningNote: 'Keep designing. Results stream in as each batch of text comes back.',
    scoreLabel: 'Voice & tone match', needsModel: true, unit: 'text layers',
  },
  {
    id: 'spelling', bot: 'spelling', name: 'Spelling & grammar', title: 'Spelling & grammar agent',
    purpose: 'Catches typos, grammar and inconsistent terms across every text layer, with your product dictionary.',
    headerPurpose: 'Catches typos, grammar and inconsistent terms across every text layer, with your product dictionary (Settings › Custom Instructions). Needs a model key.',
    rulesLabel: 'en-GB · product dictionary', headerChips: ['en-GB · product dictionary', 'Reviewed by your model'],
    rulePack: 'en-GB', ruleHead: 'RULE PACK · EN-GB', levels: false,
    rules: plain([['spelling', 'Spelling', 'en-GB with the product dictionary'], ['grammar', 'Grammar', 'Agreement, articles and punctuation'], ['terminology', 'Terminology', 'One name per concept across the scope']]),
    runLabel: 'Run spelling check', runningNote: 'Keep designing. Results stream in as each batch of text comes back.',
    scoreLabel: 'Text without errors', needsModel: true, unit: 'text layers',
  },
  {
    id: 'design-system', bot: 'design-system', name: 'Design system', title: 'Design system agent',
    purpose: 'Flags detached instances, raw colours and off-scale spacing, and rebinds them to Brand UI tokens.',
    headerPurpose: 'Flags detached instances, raw colours, off-scale spacing and unstyled text, and rebinds raw values to Brand UI tokens.',
    rulesLabel: 'Brand UI · 5 rules', headerChips: ['Brand UI · 5 rules', `Brand UI · ${BRAND_MODES.length} modes`],
    rulePack: 'Brand UI', ruleHead: 'RULE PACK · BRAND UI', levels: false,
    rules: plain([['detached', 'Detached instances', 'Frames that used to be a component'], ['raw-colour', 'Raw colours', 'Fills and strokes without a variable'], ['off-scale', 'Off-scale spacing', 'Gaps and padding off the 4px scale or typed by hand'], ['raw-radius', 'Raw radii', 'Corner radii that match a token but aren’t bound'], ['unstyled-text', 'Unstyled text', 'Text without a text style or font variables']]),
    runLabel: 'Run design system check', runningNote: 'Keep designing. Results stream in as each frame finishes.',
    scoreLabel: 'Token coverage', needsModel: false, unit: 'layers',
  },
  {
    id: 'localization', bot: 'localization', name: 'Localization', title: 'Localization agent',
    purpose: 'Estimates text expansion, truncation and right-to-left impact for German, French and Arabic.',
    headerPurpose: 'Estimates text expansion into German, French and Arabic against each text box, flags directional icons for RTL and hard-coded formats.',
    rulesLabel: 'de · fr · ar · RTL', headerChips: ['de · fr · ar · RTL', 'W3C expansion table'],
    rulePack: 'de · fr · ar', ruleHead: 'RULE PACK · LOCALES', levels: false,
    rules: plain([['expansion', 'Text expansion', 'Fixed and single-line boxes against +25–35% growth'], ['rtl', 'Right-to-left', 'Directional icons to mirror in Arabic'], ['formats', 'Locale formats', 'US dates, 12-hour times, currency, imperial units'], ['concatenation', 'Sentence fragments', 'Strings that only work in English word order']]),
    runLabel: 'Run localization check', runningNote: 'Keep designing. Results stream in as each frame finishes.',
    scoreLabel: 'Localization readiness', needsModel: false, unit: 'text layers',
  },
]

/** Run all order: deterministic packs first, then the model-backed ones. */
export const PIPELINE_ORDER: readonly AgentId[] = ['accessibility', 'design-system', 'content', 'localization', 'spelling', 'writing']

export const RUN_ALL_COPY = {
  title: 'Running all agents',
  subtitle: (scope: string, name: string, frames: number) => `${scope} · ${name} · ${frames} ${frames === 1 ? 'frame' : 'frames'} · agents run one after another so fixes don’t collide`,
  note: 'Apply unlocks when every agent has finished.',
} as const

export function agentById(id: AgentId): AgentDef {
  const agent = AGENTS.find((a) => a.id === id)
  if (!agent) throw new Error(`Unknown agent ${id}`)
  return agent
}

/** Every agent runs; the ones that need a model say so in their results when no key is set. */
export const isRunnable = (_agent: AgentDef): boolean => true
