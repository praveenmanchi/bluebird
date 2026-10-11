// Figma ↔ code contract for the Agent running screen (frame, not a component set).
import { BUTTON_SECONDARY, PROGRESS_BAR, ROOT_HEIGHT, composed, measured, ownedBy } from './figma-gaps'

export const figma = {
  setId: '40000298:6038',
  name: 'Agents body',
  props: {
    'Agent Header': 'AgentHeader, Status "Running n%" (agent, percent)',
    Progress: 'label (progressLabel), percent, ProgressBar Success (percent), ThinkingStep list (steps)',
    'Found so far': 'FindingRow per streamed finding (findings, foundCount, onFindingAction)',
    Footer: 'note + Button secondary "Stop agent" (onStop)',
  },
  figmaGaps: {
    ...composed('Button', BUTTON_SECONDARY),
    ...composed('ProgressBar', PROGRESS_BAR),
    ...composed('ThinkingStep', ['uxai/space/inline']),
    ...composed('FindingRow', ['agents/surface/field', 'agents/radius/control', 'agents/space/row-y']),
  },
  derivedGaps: {
    '--bb-derived-agents-running-root-height': ROOT_HEIGHT,
    ...measured([
      '--bb-derived-agents-running-button-width',
      '--bb-derived-agents-running-thinking-step--1-width', '--bb-derived-agents-running-thinking-step--2-width', '--bb-derived-agents-running-thinking-step--3-width',
      '--bb-derived-agents-running-thinking-step-agents-body-width', '--bb-derived-agents-running-thinking-step-height',
    ], 'Button / Thinking Step label box'),
    ...ownedBy('Button', ['--bb-derived-agents-running-button-stroke-width']),
    ...ownedBy('FindingRow', ['--bb-derived-agents-running-finding-row-stroke-width']),
  },
  notes: 'Found so far is FILL and clips in Figma; here the list scrolls. Figma says "Checking 8 of 12 frames" while the scope is 3 frames; live runs count the scope\'s own frames and layers.',
} as const
