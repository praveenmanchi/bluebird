import { scaleGaps } from '../../../shared/brand/scaleGaps'
// Figma ↔ code contract for the Agent setup screen (frame, not a component set).
import { ROOT_HEIGHT, VOICE_BAR, composed, measured, ownedBy, segmentTabs } from './figma-gaps'
import { tabSubMenuDerived, tabSubMenuGaps } from '../../../shared/ui/SegmentedControl/gaps'

export const figma = {
  setId: '40000298:5805',
  name: 'Agents body',
  props: {
    'Agent Header': 'AgentHeader, Status "Ready" (agent)',
    Scope: 'SelecterRow of SegmentTab (scope, onScope) + scope meta',
    'Rule pack': 'RuleRow per rule (rules, onToggleRule) + LinkButton "Edit rules" (onEditRules)',
    'How it works': 'mode SelecterRow (mode, onMode), brand Checkboxes (brands, onBrand), output Checkboxes (outputs, onOutput)',
    Run: 'VoiceBar Idle (onMic) + Button primary Large (onRun)',
  },
  figmaGaps: {
    ...scaleGaps('border-width/default', 'button/primary/border-width'),
    ...tabSubMenuGaps(),
    ...composed('Button', ['button/primary/bg/default', 'button/primary/border/default', 'button/primary/radius', 'button/primary/gap', 'button/primary/padding-x-lg', 'button/primary/height-lg']),
    ...composed('Checkbox', ['checkbox/gap']),
    ...composed('VoiceBar', VOICE_BAR),
  },
  derivedGaps: {
    '--bb-derived-agents-setup-checkbox-bridge-width': 'Button / Link Button / Checkbox label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-setup-checkbox-create-jira-issues-width': 'Button / Link Button / Checkbox label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-setup-checkbox-dev-mode-annotations-width': 'Button / Link Button / Checkbox label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-setup-checkbox-disney-width': 'Button / Link Button / Checkbox label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-setup-checkbox-fiskars-width': 'Button / Link Button / Checkbox label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-setup-checkbox-ikea-width': 'Button / Link Button / Checkbox label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-setup-checkbox-report-markdown-json-width': 'Button / Link Button / Checkbox label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-setup-checkbox-richemont-width': 'Button / Link Button / Checkbox label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-setup-tab-sub-menu-1-height': 'Size or stroke of the composed Tab sub menu instance; SegmentedControl.css owns the box and its width hugs the labels.',
    '--bb-derived-agents-setup-tab-sub-menu-1-width': 'Size or stroke of the composed Tab sub menu instance; SegmentedControl.css owns the box and its width hugs the labels.',
    '--bb-derived-agents-setup-tab-sub-menu-2-height': 'Size or stroke of the composed Tab sub menu instance; SegmentedControl.css owns the box and its width hugs the labels.',
    '--bb-derived-agents-setup-tab-sub-menu-2-width': 'Size or stroke of the composed Tab sub menu instance; SegmentedControl.css owns the box and its width hugs the labels.',
    ...tabSubMenuDerived('--bb-derived-agents-setup-tab-sub-menu', ['height', 'stroke-width', 'agents-body-width', '-1-width']),
    '--bb-derived-agents-setup-root-height': ROOT_HEIGHT,
    ...segmentTabs('setup', ['selection', 'current-frame', 'section', 'whole-page'], ['selection']),
    ...segmentTabs('setup', ['tab-selecters'], ['tab-selecters'], ['tab-selecters--1', 'tab-selecters--2', 'tab-selecters-agents-body']),
    ...measured([
      '--bb-derived-agents-setup-button-width', '--bb-derived-agents-setup-link-button-width', '--bb-derived-agents-setup-link-button-height',
      ...['1', '2', '3', '4', '5', '6', '7', '8'].map((n) => `--bb-derived-agents-setup-checkbox--${n}-width`),
      '--bb-derived-agents-setup-checkbox-post-a-summary-width', '--bb-derived-agents-setup-checkbox-post-a-summary-height',
    ], 'Button / Link Button / Checkbox label box'),
    ...ownedBy('Button', ['--bb-derived-agents-setup-button-stroke-width']),
    ...ownedBy('RuleRow', ['--bb-derived-agents-setup-rule-row-height']),
    ...ownedBy('VoiceBar', ['--bb-derived-agents-setup-voice-bar-height', '--bb-derived-agents-setup-voice-bar-stroke-width']),
  },
  notes: 'The two FILL panels (Rule pack, How it works) wrap below each other once they cannot hold a Rule Row at its Figma width (381.5); the Voice Bar keeps half its Figma width (634) beside the run button before the Run row wraps. Only "Suggest fixes" has explanation copy in Figma; Review only / Auto-fix copy is code fixture text. Rule packs other than WCAG hide the Rule Row Rating (the component has no "no level" option).',
} as const
