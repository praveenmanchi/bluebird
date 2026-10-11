import { WcagCard, useRpc } from '@shared/ui'
import { annotationForTarget } from '../annotate'
import { PLATFORM_TARGETS, requiredLabel, targetCriterion, unitOf } from '../target'
import { MSG, type TargetSizeIssue } from '../messages'
import { useAnnotate } from './useAnnotate'

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

  const code = targetCriterion(issue)
  const enhanced = code === '2.5.5'
  const smallest = Math.min(issue.width, issue.height)
  const unit = unitOf(issue)
  const platform = PLATFORM_TARGETS[issue.platform ?? 'web']
  // On iOS / Android the bar is the platform's guideline, not only WCAG's.
  const standard = issue.platform && issue.platform !== 'web' ? `${platform.label} (${platform.source})` : 'WCAG'

  return (
    <WcagCard
      mode="touch"
      code={code}
      title={enhanced ? 'Target Size (Enhanced)' : 'Target Size (Minimum)'}
      description={issue.platform && issue.platform !== 'web'
        ? `${platform.label} asks for tap targets of at least ${issue.required} by ${issue.required} ${unit} (${platform.source}), so they can be hit without precision pointing.`
        : `Targets are at least ${issue.required} by ${issue.required} CSS pixels, so they can be hit without precision pointing.`}
      rating={enhanced ? 'AAA' : 'AA'}
      principle="operable"
      disabilities={['physical']}
      severity={enhanced ? 'moderate' : 'serious'}
      occurrences={issue.occurrences > 1 ? { count: issue.occurrences, onSelectAll: selectAll } : undefined}
      node={`${issue.name} [${issue.evidence.toUpperCase()}]`}
      actual={`${issue.width} × ${issue.height} ${unit}`}
      required={requiredLabel(issue)}
      whyItFails={`Its smallest side is ${smallest}${unit}, under the ${standard} minimum of ${issue.required}${unit}. Bluebird treats it as a target because ${EVIDENCE[issue.evidence]}.`}
      howToFix={`Grow the target to ${issue.required}×${issue.required}${unit}, or keep the artwork and add invisible padding so the hit area reaches ${issue.required}${unit}.`}
      themes={['gestures']}
      // The scan measures the hit area but not the gap to the nearest target, so no neighbour is drawn.
      target={{ width: issue.width, height: issue.height, minimum: issue.required }}
      link={{
        label: `Understanding SC ${code} ↗`,
        href: enhanced
          ? 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-enhanced.html'
          : 'https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html',
      }}
      checks={['design']}
      annotation={annotation}
      onAnnotate={onAnnotate}
      onSelect={focus}
    />
  )
}
