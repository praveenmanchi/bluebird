import { CheckItem, ReadinessMeter, SectionTitle } from '@shared/ui'
import { blocked, failingChecks, goTo, scenario } from '../state'
import { ActionBar } from './ActionBar'
import { Card, SelectionLink, type SelectionLinkProps } from './cards'
import './CheckStep.css'

export type CheckStepProps = Pick<SelectionLinkProps, 'onOpenNode' | 'onCopyLink'>

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Figma "MCP v2 · 2 Check" and "Error · Not ready" (a failing check locks Generate). */
export function CheckStep({ onOpenNode, onCopyLink }: CheckStepProps) {
  const s = scenario.value
  const warnings = s.checks.filter((c) => c.status === 'warning').length
  const fails = failingChecks.value
  const caption = blocked.value ? `Push locked · ${plural(fails, 'check')} ${fails === 1 ? 'is' : 'are'} failing` : undefined
  const summary = blocked.value
    ? `${plural(fails, 'check')} must pass before you can generate`
    : `Ready to generate · ${plural(warnings, 'warning')} won’t block the push`
  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Handoff check">
          <SectionTitle title="Handoff readiness" showCount={false} showAction={false} />
          <ReadinessMeter tone={s.readiness.tone} value={s.readiness.value} caption={caption} />
          <ul class="bb-mcp-handoff__checks" aria-label="Handoff checks">
            {s.checks.map((c) => (
              <li key={c.id}><CheckItem status={c.status} title={c.title} detail={c.detail} actionLabel={c.actionLabel} /></li>
            ))}
          </ul>
        </Card>
        <Card label="Checking">
          <SectionTitle title="Checking" showCount={false} actionLabel="Change" onAction={() => goTo(0)} />
          <SelectionLink selection={s.selection} onOpenNode={onOpenNode} onCopyLink={onCopyLink} />
        </Card>
      </div>
      <ActionBar
        summary={summary}
        secondary={[{ label: 'Back', onClick: () => goTo(0) }]}
        primary={{ label: 'Next: Generate', disabled: blocked.value, onClick: () => goTo(2) }}
      />
    </>
  )
}
