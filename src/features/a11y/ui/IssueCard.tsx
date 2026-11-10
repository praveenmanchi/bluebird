import { WcagCard, useRpc } from '@shared/ui'
import { annotationForContrast } from '../annotate'
import { MSG, type ContrastIssue } from '../messages'
import { understandingUrl, type StandardId } from '../standards'
import { useAnnotate } from './useAnnotate'

import { criterionFor } from '../criteria'

export { criterionFor }

const DESCRIPTION: Record<string, string> = {
  '1.4.3': 'Text and images of text have a contrast ratio of at least 4.5:1 (3:1 for large text).',
  '1.4.6': 'Text and images of text have a contrast ratio of at least 7:1 (4.5:1 for large text).',
}

/** One scan finding rendered as the Figma "WCAG Card" organism. `standard` picks which version's Understanding page the link opens. */
export function IssueCard({ issue, standard }: { issue: ContrastIssue; standard?: StandardId }) {
  const rpc = useRpc()
  const c = criterionFor(issue)
  const { annotation, onAnnotate } = useAnnotate(
    issue.nodeId, issue.nodeIds, annotationForContrast(issue, c.code, c.needs).label,
  )
  const focus = () => { void rpc.call(MSG.focus, { nodeId: issue.nodeId }).catch(() => undefined) }
  const selectAll = issue.occurrences > 1
    ? () => { void rpc.call(MSG.selectAll, { nodeIds: issue.nodeIds }).catch(() => undefined) }
    : undefined
  // One click rebinds every layer that shares the pair, not just the focused one.
  const applyFix = issue.fix
    ? () => { void rpc.call(MSG.applyFix, { nodeIds: issue.nodeIds, variableId: issue.fix!.tokenId }).catch(() => undefined) }
    : undefined
  return (
    <WcagCard
      code={c.code}
      title={c.title}
      description={DESCRIPTION[c.code]}
      rating={c.rating}
      principle="perceivable"
      disabilities={['visual']}
      node={`${issue.name} [TEXT]`}
      occurrences={issue.occurrences > 1
        ? { count: issue.occurrences, onSelectAll: selectAll }
        : undefined}
      colors={{
        fg: issue.foreground,
        bg: issue.background,
        fgToken: issue.fgToken && { name: issue.fgToken.name, mode: issue.fgToken.mode },
        bgToken: issue.bgToken && { name: issue.bgToken.name, mode: issue.bgToken.mode },
      }}
      nodeToken={issue.fgToken && { name: issue.fgToken.name, mode: issue.fgToken.mode }}
      brandModes={issue.brandModes?.map((m) => ({
        brand: m.brand,
        pass: m.pass,
        ratio: `${m.ratio.toFixed(2)}:1`,
        current: m.brand === issue.fgToken?.mode,
      }))}
      fix={issue.fix && {
        token: { name: issue.fix.tokenName, mode: issue.fix.mode },
        value: issue.fix.hex,
        on: issue.background,
        ratio: `${issue.fix.ratio.toFixed(2)}:1`,
        onApply: applyFix,
      }}
      actual={`${issue.ratio.toFixed(2)}:1`}
      required={`${c.needs}:1 (${c.rating})`}
      whyItFails={`“${issue.text || issue.name}” (${issue.fontSize}px${issue.isBold ? ' bold' : ''}) measures ${issue.ratio.toFixed(2)}:1 against ${issue.assumedBackground ? 'an assumed white background — nothing opaque sits behind it' : 'its background'}; ${c.rating} needs ${c.needs}:1.${issue.occurrences > 1 ? ` ${issue.occurrences} layers share this pair.` : ''}`}
      severity={issue.assumedBackground ? 'moderate' : issue.level === 'fail' ? 'critical' : 'serious'}
      howToFix={issue.fix
        ? `Rebind the text to ${issue.fix.tokenName}, the nearest token in the ${issue.fix.mode} palette that reaches ${issue.fix.ratio.toFixed(2)}:1.`
        : `Darken the text or lighten the fill until the ratio reaches ${c.needs}:1, or increase the type size so the large-text threshold applies.`}
      themes={['zoom']}
      link={{ label: `Understanding SC ${c.code} ↗`, href: understandingUrl(standard, c.code === '1.4.3' ? 'contrast-minimum' : 'contrast-enhanced') }}
      sampleText={issue.text || 'Aa'}
      ratio={{ value: `${issue.ratio.toFixed(2)}:1`, requirement: `needs ${c.needs}:1` }}
      checks={['design']}
      annotation={annotation}
      onAnnotate={onAnnotate}
      onSelect={focus}
    />
  )
}
