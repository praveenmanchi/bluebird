import { scaleGaps } from '../../../shared/brand/scaleGaps'
// Figma ↔ code contract for the Run all screen (frame, not a component set).
import { BUTTON_SECONDARY, META_BADGE, PROGRESS_BAR, ROOT_HEIGHT, composed, measured, ownedBy } from './figma-gaps'

export const figma = {
  setId: '40000299:18411',
  name: 'Agents body',
  props: {
    Header: 'heading "Running all agents" + subtitle (subtitle), Button secondary "Stop all" (onStopAll)',
    Overall: '"n of m agents done · k findings so far" (done, total, findings), percent, ProgressBar (percent)',
    Pipeline: 'one row per agent: BotAvatar, name + status text, MetaBadge, LinkButton "Open" (rows, onOpen)',
    Merged: 'summary (findings, fixable) + Buttons "Open merged report" (onOpenMerged), "Apply n safe fixes" (onApply, applied)',
    'Voice Bar': 'VoiceBar Idle (onMic)',
  },
  figmaGaps: {
    ...scaleGaps('dimension/space/2', 'button/secondary/border-width', 'border-width/default', 'button/primary/border-width', 'dimension/opacity/55'),
    ...composed('Button', [...BUTTON_SECONDARY, 'button/primary/bg/disabled', 'button/primary/border/disabled', 'button/primary/radius', 'button/primary/gap', 'button/primary/padding-x', 'button/primary/height']),
    ...composed('ProgressBar', PROGRESS_BAR),
    ...composed('MetaBadge', [...META_BADGE, 'feedback/success', 'border/accent', 'border/subtle']),
  },
  derivedGaps: {
    '--bb-derived-agents-run-all-meta-badge-done-2-width': 'Button / Link Button / Meta Badge label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-run-all-meta-badge-done-3-width': 'Button / Link Button / Meta Badge label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-run-all-meta-badge-done-width': 'Button / Link Button / Meta Badge label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-run-all-meta-badge-running-width': 'Button / Link Button / Meta Badge label box — a HUG size Figma measured from its content, not a design value.',
    '--bb-derived-agents-run-all-root-height': ROOT_HEIGHT,
    ...measured([
      '--bb-derived-agents-run-all-button-stop-all-width', '--bb-derived-agents-run-all-button-open-merged-report-width', '--bb-derived-agents-run-all-button-apply-12-safe-width',
      '--bb-derived-agents-run-all-link-button-width', '--bb-derived-agents-run-all-link-button-height',
      ...['1', '2', '3', '4', '6'].map((n) => `--bb-derived-agents-run-all-meta-badge--${n}-width`),
      '--bb-derived-agents-run-all-meta-badge-skipped-width', '--bb-derived-agents-run-all-meta-badge-skipped-height',
    ], 'Button / Link Button / Meta Badge label box'),
    ...ownedBy('Button', ['--bb-derived-agents-run-all-button-stroke-width']),
    ...ownedBy('MetaBadge', ['--bb-derived-agents-run-all-meta-badge-stroke-width']),
    ...ownedBy('VoiceBar', ['--bb-derived-agents-run-all-voice-bar-height', '--bb-derived-agents-run-all-voice-bar-stroke-width']),
  },
  notes: 'Pipeline rows are plain frames in Figma (no component). Live runs walk the runnable agents one after another in the Figma order; queued rows say "Waits for <previous> to finish", Localization (Coming soon) is Skipped. "Apply n safe fixes" stays disabled until every agent has finished, as the note says.',
} as const
