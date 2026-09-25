import { WcagCard, useRpc } from '@shared/ui'
import { annotationForTarget } from '../annotate'
import { TARGET_MIN_AA } from '../target'
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

  const enhanced = issue.required > TARGET_MIN_AA
  const code = enhanced ? '2.5.5' : '2.5.8'
  const smallest = Math.min(issue.width, issue.height)

  return (
    <WcagCard
      code={code}
      title={enhanced ? 'Target Size (Enhanced)' : 'Target Size (Minimum)'}
      description={`Targets are at least ${issue.required} by ${issue.required} CSS pixels, so they can be hit without precision pointing.`}
      rating={enhanced ? 'AAA' : 'AA'}
      principle="operable"
      disabilities={['physical']}
      severity={enhanced ? 'moderate' : 'serious'}
      occurrences={issue.occurrences > 1 ? { count: issue.occurrences, onSelectAll: selectAll } : undefined}
      node={`${issue.name} [${issue.evidence.toUpperCase()}]`}
      actual={`${issue.width} × ${issue.height} px`}
      required={`${issue.required} × ${issue.required} px`}
      whyItFails={`Its smallest side is ${smallest}px, under the ${issue.required}px minimum. Bluebird treats it as a target because ${EVIDENCE[issue.evidence]}.`}
      howToFix={`Grow the target to ${issue.required}×${issue.required}, or keep the artwork and add invisible padding so the hit area reaches ${issue.required}px.`}
      themes={['gestures']}
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
