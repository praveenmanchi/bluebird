import { Button, WcagCard, useRpc } from '@shared/ui'
import { MSG, type ContrastIssue } from '../messages'

/** WCAG criterion a contrast issue is reported against. `fail` breaks 1.4.3 (AA); everything else below AAA breaks 1.4.6. */
export function criterionFor(issue: ContrastIssue): { code: string; title: string; rating: 'AA' | 'AAA'; needs: number } {
  const large = issue.fontSize >= 24 || (issue.fontSize >= 18.66 && issue.isBold)
  if (issue.level === 'fail') return { code: '1.4.3', title: 'Contrast (Minimum)', rating: 'AA', needs: large ? 3 : 4.5 }
  return { code: '1.4.6', title: 'Contrast (Enhanced)', rating: 'AAA', needs: large ? 4.5 : 7 }
}

const DESCRIPTION: Record<string, string> = {
  '1.4.3': 'Text and images of text have a contrast ratio of at least 4.5:1 (3:1 for large text).',
  '1.4.6': 'Text and images of text have a contrast ratio of at least 7:1 (4.5:1 for large text).',
}

/** One scan finding rendered as the Figma "WCAG Card" organism. */
export function IssueCard({ issue }: { issue: ContrastIssue }) {
  const rpc = useRpc()
  const c = criterionFor(issue)
  const focus = () => { void rpc.call(MSG.focus, { nodeId: issue.nodeId }).catch(() => undefined) }
  return (
    <WcagCard
      code={c.code}
      title={c.title}
      description={DESCRIPTION[c.code]}
      rating={c.rating}
      principle="perceivable"
      disabilities={['visual']}
      node={`${issue.name} [TEXT]`}
      colors={{ fg: issue.foreground, bg: issue.background }}
      whyItFails={`“${issue.text || issue.name}” (${issue.fontSize}px${issue.isBold ? ' bold' : ''}) measures ${issue.ratio.toFixed(2)}:1 against its background; ${c.rating} needs ${c.needs}:1.`}
      howToFix={`Darken the text or lighten the fill until the ratio reaches ${c.needs}:1, or increase the type size so the large-text threshold applies.`}
      themes={['zoom']}
      preview={(
        <div class="bb-a11y__preview">
          <span class="bb-a11y__sample" style={{ color: issue.foreground, background: issue.background }} aria-hidden="true">{issue.text || 'Aa'}</span>
          <Button variant="secondary" onClick={focus}>Select layer</Button>
        </div>
      )}
    />
  )
}
