import { PrincipleTag, RuleRow, SectionTitle, type Principle } from '@shared/ui'
import type { ScanTarget } from '../messages'
import { RULES, type Rule, type RuleId, type RuleSet } from '../rules'
import { describeTarget } from '../scope-summary'

export interface ReadyPanelProps {
  /** What a scan would read: undefined while it's being read, null when nothing is selected. */
  target: ScanTarget | null | undefined
  rules: RuleSet
  /** The rules for the chosen platform (iOS / Android swap in their own target minimum). */
  ruleList?: readonly Rule[]
  onToggleRule?: (id: RuleId, enabled: boolean) => void
  onCheckRules?: () => void
}

const PRINCIPLES: readonly Principle[] = ['perceivable', 'operable', 'understandable', 'robust']
const PROMISE = 'One scan reads every brand mode, so you see which brands break.'

function heading(target: ScanTarget | null | undefined): { title: string; body: string } {
  if (target === undefined) return { title: 'Ready to scan', body: 'Reading your selection…' }
  if (target === null) return { title: 'Nothing to check', body: 'This page has no layers yet.' }
  const page = target.scope === 'page' ? ' Nothing is selected, so the scan reads the whole page; select a frame to check just that.' : ''
  return { title: `Ready to check ${target.name}`, body: `${describeTarget(target)}.${page} ${PROMISE}` }
}

/**
 * Figma "Accessibility L · Ready to scan" (40000386:31267) › Start: what the scan will read, the
 * four WCAG principles, and the rules it checks (each rule's checkbox hides its findings). Its
 * Scan selection / Scan whole page buttons are left out: the toolbar's scope and Scan do that.
 */
export function ReadyPanel({ target, rules, ruleList = RULES, onToggleRule, onCheckRules }: ReadyPanelProps) {
  const { title, body } = heading(target)
  return (
    <section class="bb-a11y-ready" aria-label="Ready to scan">
      <div class="bb-a11y-ready__start">
        <h2 class="bb-a11y-ready__title">{title}</h2>
        <p class="bb-a11y-ready__body">{body}</p>
      </div>
      <div class="bb-a11y-ready__checks">
        <div class="bb-a11y-ready__principles" aria-label="WCAG principles">
          {PRINCIPLES.map((p) => <PrincipleTag key={p} principle={p} />)}
        </div>
        <SectionTitle class="bb-a11y-ready__heading" title="What we check" count={String(ruleList.filter((r) => rules[r.id]).length)} actionLabel="Check rules" onAction={onCheckRules} />
        <div class="bb-a11y-ready__rules" role="group" aria-label="Rules">
          {ruleList.map((r) => (
            <RuleRow
              key={r.id}
              class="bb-a11y-ready__rule"
              name={r.name}
              description={r.description}
              level={r.level}
              enabled={rules[r.id]}
              onToggle={(enabled) => onToggleRule?.(r.id, enabled)}
            />
          ))}
        </div>
      </div>
    </section>
  )
}
