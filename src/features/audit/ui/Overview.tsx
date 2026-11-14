import { LevelRow, SectionTitle } from '@shared/ui'
import { countedOf, mappedOf } from '../audit'
import { needAttention, plural } from '../format'
import type { AuditResult, Coverage, ScreenCoverage } from '../messages'

/** A screen at or above this is mapped well enough not to be called out. Matches the shared score tone's green. */
const PASS_MARK = 80
const ATTENTION_LIMIT = 5

const notMapped = (c: Coverage) => countedOf(c) - mappedOf(c)
const heading = (title: string) => <SectionTitle class="bb-audit__heading" title={title} showCount={false} showAction={false} />

export interface OverviewProps {
  result: Extract<AuditResult, { status: 'ready' }>
  onScreen: (id: string) => void
}

/** Figma "Audit v2 · 3 Results" / "7 Chosen pages": coverage by library, then by screen, or by page when several were audited. */
export function Overview({ result, onScreen }: OverviewProps) {
  const { counts: c, screens, pageCoverage, source } = result
  const row = (key: string, name: string, hint: string, cover: Coverage) => (
    <LevelRow key={key} class="bb-audit__usage" name={name} hint={hint} passing={mappedOf(cover)} total={countedOf(cover)} />
  )
  const screenRow = (s: ScreenCoverage, withPage: boolean) => (
    <LevelRow key={s.id} class="bb-audit__usage bb-audit__screen" name={s.name} passing={mappedOf(s)} total={countedOf(s)}
      hint={`${withPage ? `${s.page} · ` : ''}${notMapped(s).toLocaleString()} not mapped`}
      role="button" tabIndex={0} title={`Open ${s.name}`}
      onClick={() => onScreen(s.id)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onScreen(s.id) } }} />
  )
  const several = pageCoverage.length > 1
  const attention = several ? needAttention(screens, PASS_MARK, ATTENTION_LIMIT) : []
  return (
    <>
      {heading('Mapped by library')}
      {source && row('components', 'Components', `${plural(c.total - c.library, 'instance')} not mapped`, { bound: 0, paints: 0, library: c.library, components: c.total })}
      {row('variables', 'Variables', `${plural(c.colours, 'value')} not mapped`, { bound: c.bound, paints: c.paints, library: 0, components: 0 })}
      {several && (
        <>
          {heading('By page')}
          {pageCoverage.map((p) => row(p.name, p.name, `${notMapped(p).toLocaleString()} not mapped · ${plural(p.screens, 'screen')}`, p))}
          {attention.length > 0 && heading('Screens that need attention')}
          {attention.map((s) => screenRow(s, true))}
        </>
      )}
      {!several && screens.length > 0 && (
        <>
          {heading('By screen')}
          {screens.map((s) => screenRow(s, false))}
        </>
      )}
    </>
  )
}
