import { WcagCard, useRpc } from '@shared/ui'
import { annotationForTarget } from '../annotate'
import { PLATFORM_TARGETS, requiredLabel, targetCitation, unitOf } from '../target'
import { MSG, type TargetSizeIssue } from '../messages'
import { understandingUrl } from '../standards'
import { useAnnotate } from './useAnnotate'
import { useIgnore } from './useIgnore'
import { confidenceLine, targetConfidence } from '../confidence'
import { targetIgnoreKey } from '../ignore'

const EVIDENCE: Record<TargetSizeIssue['evidence'], string> = {
  reaction: 'it carries a prototype interaction',
  control: 'its component name marks it as a control',
}

/** One 2.5.8 / 2.5.5 finding — a tap target below the minimum — as the WCAG card. */
export function TargetCard({ issue }: { issue: TargetSizeIssue }) {
  const rpc = useRpc()
  const focus = () => { void rpc.call(MSG.focus, { nodeId: issue.nodeId }).catch(() => undefined) }
  const selectAll = issue.occurrences > 1
    ? () => { void rpc.call(MSG.selectAll, { nodeIds: issue.nodeIds }).catch(() => undefined) }
    : undefined

  const { annotation, onAnnotate } = useAnnotate(issue.nodeId, issue.nodeIds, annotationForTarget(issue).label)
  const ignore = useIgnore(targetIgnoreKey(issue))

  // A WCAG criterion only when the size really misses one; otherwise the platform's own guideline.
  const cited = targetCitation(issue)
  const enhanced = cited.level === 'AAA'
  const smallest = Math.min(issue.width, issue.height)
  const unit = unitOf(issue)
  const platform = PLATFORM_TARGETS[issue.platform ?? 'web']
  // On iOS / Android the bar is the platform's guideline, not only WCAG's.
  const standard = issue.platform && issue.platform !== 'web' ? `${platform.label} (${platform.source})` : 'WCAG'

  return (
    <WcagCard
      mode="touch"
      code={cited.code ?? cited.label}
      title={cited.title}
      description={issue.platform && issue.platform !== 'web'
        ? `${platform.label} asks for tap targets of at least ${issue.required} by ${issue.required} ${unit} (${platform.source}), so they can be hit without precision pointing.`
        : `Targets are at least ${issue.required} by ${issue.required} CSS pixels, so they can be hit without precision pointing.`}
      rating={cited.level}
      principle="operable"
      disabilities={['physical']}
      severity={enhanced ? 'moderate' : 'serious'}
      occurrences={issue.occurrences > 1 ? { count: issue.occurrences, onSelectAll: selectAll } : undefined}
      node={`${issue.name} [${issue.evidence.toUpperCase()}]`}
      evidence={confidenceLine(targetConfidence(issue))}
      ignored={ignore.ignoredCard && { reason: ignore.ignoredCard.reason, onUndo: ignore.ignoredCard.onUndo }}
      onIgnore={ignore.onIgnore}
      actual={`${issue.width} × ${issue.height} ${unit}`}
      required={requiredLabel(issue)}
      whyItFails={`Its smallest side is ${smallest}${unit}, under the ${standard} minimum of ${issue.required}${unit}. Bluebird treats it as a target because ${EVIDENCE[issue.evidence]}.`}
      howToFix={`Grow the target to ${issue.required}×${issue.required}${unit}, or keep the artwork and add invisible padding so the hit area reaches ${issue.required}${unit}.`}
      themes={['gestures']}
      // The scan measures the hit area but not the gap to the nearest target, so no neighbour is drawn.
      target={{ width: issue.width, height: issue.height, minimum: issue.required }}
      // The finding carries the version it was measured against (2.1 files everything under 2.5.5).
      link={cited.code ? { label: `Understanding SC ${cited.code}`, href: understandingUrl(issue.standard, enhanced ? 'target-size-enhanced' : 'target-size-minimum') } : undefined}
      checks={['design']}
      annotation={annotation}
      onAnnotate={onAnnotate}
      onSelect={focus}
    />
  )
}
