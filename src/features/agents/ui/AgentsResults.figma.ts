// Figma ↔ code contract for the Agent results screen (frame, not a component set).
import { BUTTON_PRIMARY, BUTTON_SECONDARY, META_BADGE, ROOT_HEIGHT, composed, measured, ownedBy, segmentTabs } from './figma-gaps'

export const figma = {
  setId: '40000299:6101',
  name: 'Agents body',
  props: {
    'Agent Header': 'AgentHeader, Status "Done · n issues" (agent, findings)',
    Summary: 'ReadinessMeter (score, caption) + By severity MetaBadges (findings)',
    Filters: 'SelecterRow of SegmentTab "All 14 / Critical 2 / …" (filter, onFilter)',
    Findings: 'FindingRow per open finding (findings, onFindingAction)',
    Actions: 'Buttons "Export report" (onExport), "Create n Jira issues" (onCreateJira), "Apply n safe fixes" (onApplySafe)',
  },
  figmaGaps: {
    ...composed('Button', [...BUTTON_PRIMARY, ...BUTTON_SECONDARY]),
    ...composed('MetaBadge', [...META_BADGE, 'feedback/danger', 'feedback/warning', 'border/accent', 'border/subtle']),
    ...composed('ReadinessMeter', ['mcp/space/tight']),
  },
  derivedGaps: {
    '--bb-derived-agents-results-root-height': ROOT_HEIGHT,
    ...segmentTabs('results', ['tab-selecters'], ['tab-selecters'], ['tab-selecters--1', 'tab-selecters--2', 'tab-selecters--3', 'tab-selecters--4', 'tab-selecters--5', 'tab-selecters-agents-body']),
    ...measured([
      '--bb-derived-agents-results-button--1-width', '--bb-derived-agents-results-button-agents-body-width',
      '--bb-derived-agents-results-meta-badge--1-width', '--bb-derived-agents-results-meta-badge--2-width', '--bb-derived-agents-results-meta-badge--3-width',
      '--bb-derived-agents-results-meta-badge-agents-body-width', '--bb-derived-agents-results-meta-badge-height',
    ], 'Button / Meta Badge label box'),
    ...ownedBy('Button', ['--bb-derived-agents-results-button-stroke-width']),
    ...ownedBy('MetaBadge', ['--bb-derived-agents-results-meta-badge-stroke-width']),
    ...ownedBy('FindingRow', ['--bb-derived-agents-results-finding-row-stroke-width']),
  },
  notes: 'Findings is FILL and clips in Figma; here it scrolls. The design lists 5 of the 14 issues the summary counts; the fixture carries all 14 so the filter counts are real. Applied and ignored findings leave the list and the counts, and the score moves toward 100.',
} as const
