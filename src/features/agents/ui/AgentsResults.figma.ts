import { scaleGaps } from '../../../shared/brand/scaleGaps'
// Figma ↔ code contract for the Agent results screen (frame, not a component set).
import { BUTTON_PRIMARY, BUTTON_SECONDARY, META_BADGE, ROOT_HEIGHT, composed, measured, ownedBy, segmentTabs } from './figma-gaps'
import { tabSubMenuDerived, tabSubMenuGaps } from '../../../shared/ui/SegmentedControl/gaps'

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
    ...scaleGaps('border-width/default', 'button/secondary/border-width', 'button/primary/border-width'),
    ...tabSubMenuGaps(),
    ...composed('Button', [...BUTTON_PRIMARY, ...BUTTON_SECONDARY]),
    ...composed('MetaBadge', [...META_BADGE, 'feedback/danger', 'feedback/warning', 'border/accent', 'border/subtle']),
    ...composed('ReadinessMeter', ['mcp/space/tight']),
  },
  derivedGaps: {
    ...tabSubMenuDerived('--bb-derived-agents-results-tab-sub-menu'),
    '--bb-derived-agents-results-root-height': ROOT_HEIGHT,
    '--bb-derived-agents-results--font-family': 'The "!" text inside the icon artwork of the nested Tab sub menu items (Filters › Item 2–5 › Icon › Union); the composed SegmentedControl draws that icon as a glyph, not as text.',
    '--bb-derived-agents-results--font-weight': 'The "!" text inside the icon artwork of the nested Tab sub menu items (Filters › Item 2–5 › Icon › Union); the composed SegmentedControl draws that icon as a glyph, not as text.',
    ...segmentTabs('results', ['tab-selecters'], ['tab-selecters'], ['tab-selecters--1', 'tab-selecters--2', 'tab-selecters--3', 'tab-selecters--4', 'tab-selecters--5', 'tab-selecters-agents-body']),
    ...measured([
      '--bb-derived-agents-results-button-export-report-width', '--bb-derived-agents-results-button-apply-6-safe-width',
      '--bb-derived-agents-results-meta-badge-2-critical-width', '--bb-derived-agents-results-meta-badge-4-serious-width', '--bb-derived-agents-results-meta-badge-6-moderate-width',
      '--bb-derived-agents-results-meta-badge-2-minor-width', '--bb-derived-agents-results-meta-badge-2-minor-height',
    ], 'Button / Meta Badge label box'),
    ...ownedBy('Button', ['--bb-derived-agents-results-button-stroke-width']),
    ...ownedBy('MetaBadge', ['--bb-derived-agents-results-meta-badge-stroke-width']),
    ...ownedBy('FindingRow', ['--bb-derived-agents-results-finding-row-stroke-width']),
  },
  notes: 'Findings is FILL and clips in Figma; here it scrolls. The design lists 5 of the 14 issues the summary counts; the fixture carries all 14 so the filter counts are real. Applied and ignored findings leave the list and the counts, and the score moves toward 100.',
} as const
