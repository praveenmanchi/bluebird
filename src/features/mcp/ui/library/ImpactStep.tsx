import { ConnectionRow, LinkButton, Notice, PublishEmptyState, SectionTitle, Spinner } from '@shared/ui'
import { breakingScreen } from '../../library'
import type { ImpactedScreen } from '../../messages'
import { chosenScreens, goTo, impactError, impactPhase, impactResult, leftOut, release, target, toggleScreen } from '../../state'
import { ActionBar } from '../ActionBar'
import { Card } from '../cards'

export interface ImpactStepProps {
  /** Scan the file again (after a failure, or once screens were updated in Figma). */
  onRescan: () => void
  /** Select and reveal a screen on the canvas. */
  onOpenNode: (nodeId: string) => void
}

const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`
const uses = (s: ImpactedScreen) => s.uses.map((u) => `${u.name} ×${u.count}`).join(' · ')

function ScreenRow({ screen, onOpenNode }: { screen: ImpactedScreen; onOpenNode: ImpactStepProps['onOpenNode'] }) {
  const r = release.value
  const out = leftOut.value.includes(screen.nodeId)
  const risky = r ? breakingScreen(screen, r) : false
  return (
    <div class="bb-mcp-handoff__screen">
      <ConnectionRow
        name={screen.name}
        detail={`${out ? 'Left out · ' : ''}${screen.page} · ${uses(screen)}${risky ? ' · uses a removed component' : ''}`}
        status={out ? 'issue' : risky ? 'error' : 'good'}
        actionLabel={out ? 'Add back' : 'Leave out'}
        onAction={() => toggleScreen(screen.nodeId)}
      />
      <LinkButton icon={null} onClick={() => onOpenNode(screen.nodeId)} aria-label={`Show ${screen.name} in Figma`}>Show in Figma</LinkButton>
    </div>
  )
}

/** Figma "MCP v3 · Library update · 2 Impact": the screens in this file that use what the release changed. */
export function ImpactStep({ onRescan, onOpenNode }: ImpactStepProps) {
  const phase = impactPhase.value
  const result = impactResult.value
  const screens = result?.screens ?? []
  const chosen = chosenScreens.value.length
  const risky = release.value ? chosenScreens.value.filter((s) => breakingScreen(s, release.value!)).length : 0
  const summary = phase === 'loading' ? 'Looking for the changed components on every page…'
    : phase === 'failed' ? (impactError.value ?? 'The file could not be scanned.')
      : !screens.length ? 'No screen in this file uses the changed components.'
        : `${plural(chosen, 'screen')} to update in ${target.value.repo}${risky ? ` · ${risky} with a breaking change` : ''}`

  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Screens impacted">
          <SectionTitle title="Screens impacted" count={phase === 'done' ? String(screens.length) : undefined} showCount={phase === 'done'} actionLabel="Scan again" showAction={phase !== 'loading'} onAction={onRescan} />
          {phase === 'loading' && <div class="bb-mcp-handoff__loading" role="status"><Spinner tone="accent" size="sm" label="Scanning the file" /><span class="bb-mcp-handoff__caption">Looking for the changed components on every page…</span></div>}
          {phase === 'failed' && <PublishEmptyState state="failed" title="Couldn’t scan the file" body={impactError.value} actions={[{ label: 'Back', variant: 'secondary', onClick: () => goTo(0) }, { label: 'Try again', variant: 'primary', onClick: onRescan }]} />}
          {phase === 'done' && !screens.length && (
            <PublishEmptyState
              state="no-changes"
              icon="ui-toolbar-frame"
              title="No screen uses these components"
              body="Nothing in this file needs updating for this release. Open the file that holds your screens and run the scan there, or pick another release."
              actions={[{ label: 'Pick another release', variant: 'secondary', onClick: () => goTo(0) }]}
            />
          )}
          {phase === 'done' && screens.length > 0 && (
            <>
              <ul class="bb-mcp-handoff__stack">
                {screens.map((s) => <li key={s.nodeId}><ScreenRow screen={s} onOpenNode={onOpenNode} /></li>)}
              </ul>
              <p class="bb-mcp-handoff__caption">
                {result ? `${plural(result.scanned, 'instance')} on ${plural(result.pages, 'page')} looked at.` : ''}
                {result?.truncated ? ' The scan stopped at its limit, so there may be more screens.' : ''}
                {' '}Components are matched by name.
              </p>
            </>
          )}
        </Card>
        {phase === 'done' && screens.length > 0 && (
          <Card label="Update in Figma first">
            <SectionTitle title="Update in Figma first" showCount={false} showAction={false} />
            <Notice tone="info" title="Accept the library update in this file">
              Libraries › Updates brings the new components into these screens, so the design matches what the code is updated to.
            </Notice>
          </Card>
        )}
      </div>
      <ActionBar
        summary={summary}
        secondary={[{ label: 'Back', onClick: () => goTo(0) }]}
        primary={{ label: 'Next: Hand off', disabled: phase !== 'done' || chosen === 0, onClick: () => goTo(2) }}
      />
    </>
  )
}
