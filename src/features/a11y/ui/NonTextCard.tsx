import { WcagCard, useRpc } from '@shared/ui'
import { annotationForNonText } from '../annotate'
import { NON_TEXT_MIN } from '../nontext'
import { MSG, type NonTextIssue } from '../messages'
import { understandingUrl, type StandardId } from '../standards'
import { useAnnotate } from './useAnnotate'

const DESCRIPTION = 'User interface components and graphical objects have a contrast ratio of at least 3:1 against adjacent colours.'

/** One 1.4.11 finding — a border too faint to see — rendered as the WCAG card. `standard` picks the Understanding page's version (2.1 or 2.2; 2.0 has no 1.4.11). */
export function NonTextCard({ issue, standard }: { issue: NonTextIssue; standard?: StandardId }) {
  const rpc = useRpc()
  const focus = () => { void rpc.call(MSG.focus, { nodeId: issue.nodeId }).catch(() => undefined) }
  const selectAll = issue.occurrences > 1
    ? () => { void rpc.call(MSG.selectAll, { nodeIds: issue.nodeIds }).catch(() => undefined) }
    : undefined
  const { annotation, onAnnotate } = useAnnotate(issue.nodeId, issue.nodeIds, annotationForNonText(issue).label)

  return (
    <WcagCard
      code="1.4.11"
      title="Non-text Contrast"
      description={DESCRIPTION}
      rating="AA"
      principle="perceivable"
      disabilities={['visual']}
      severity="serious"
      occurrences={issue.occurrences > 1 ? { count: issue.occurrences, onSelectAll: selectAll } : undefined}
      node={`${issue.name} [STROKE]`}
      colors={{ fg: issue.foreground, bg: issue.background }}
      actual={`${issue.ratio.toFixed(2)}:1`}
      required={`${NON_TEXT_MIN}:1 (AA)`}
      whyItFails={`The “${issue.name}” border measures ${issue.ratio.toFixed(2)}:1 against what it sits on; a visible boundary needs ${NON_TEXT_MIN}:1.`}
      howToFix={`Darken or lighten the stroke until it reaches ${NON_TEXT_MIN}:1. A border nobody can see is a border that is not there.`}
      themes={['forms']}
      link={{ label: 'Understanding SC 1.4.11 ↗', href: understandingUrl(standard, 'non-text-contrast') }}
      sampleText="▭"
      sampleCaption="Sample of this exact pair"
      ratio={{ value: `${issue.ratio.toFixed(2)}:1`, requirement: `needs ${NON_TEXT_MIN}:1` }}
      checks={['design']}
      annotation={annotation}
      onAnnotate={onAnnotate}
      onSelect={focus}
    />
  )
}
