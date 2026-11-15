import { Button, CheckItem, Checkbox, LinkButton, PublishEmptyState, Spinner, useRpc } from '@shared/ui'
import { cancelRun, loadPages, openDetails, runAudit } from '../actions'
import { plural } from '../model'
import { audit, handoffError, handoffPhase, pages, picked, pickedPages, setIgnored, ticket, togglePage } from '../state'
import { DetailsStep, ResultStep, ReviewStep } from './HandoffSteps'
import { ActionBar, ProgressView, stepSummary } from './parts'

const flowsLabel = (flows: number) => flows ? plural(flows, 'prototype flow') : 'no prototype'

/** Figma "Docs · Hand-off · 2 Audit pop-up": what developers would trip over, before the hand-off is built. */
function AuditDialog() {
  const rpc = useRpc()
  const result = audit.value!
  const findings = result.findings
  return (
    <div class="bb-docs__scrim">
      <div class="bb-docs__dialog" role="dialog" aria-modal="true" aria-labelledby="bb-docs-audit-title">
        <h2 id="bb-docs-audit-title">Before you hand off</h2>
        <p>
          We checked {plural(result.screens, 'screen')} on {result.pages.join(', ')}. Developers will see these in Dev Mode.
          {findings.length ? ' Fix them now, or hand off as is and they are listed as known issues.' : ' Nothing needs fixing.'}
        </p>
        <div class="bb-docs__checks">
          {result.lines.map((l) => <CheckItem key={l.category} status={l.status} title={l.title} detail={l.detail} showAction={false} />)}
        </div>
        <div class="bb-docs__dialog-actions">
          <Button variant="secondary" onClick={() => { handoffPhase.value = 'pages' }}>Cancel</Button>
          {findings.length > 0 && <Button variant="secondary" onClick={() => { handoffPhase.value = 'review' }}>Review issues</Button>}
          <Button variant="primary" onClick={() => { setIgnored(findings.map((f) => f.id), true); void openDetails(rpc) }}>{findings.length ? 'Ignore and continue' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  )
}

function PagesStep() {
  const rpc = useRpc()
  const list = pages.value
  const auditing = handoffPhase.value === 'auditing'
  const chosen = pickedPages.value
  const all = list.length > 0 && chosen.length === list.length
  const screens = chosen.reduce((n, p) => n + p.screens, 0), flows = chosen.reduce((n, p) => n + p.flows, 0)
  return (
    <>
      <div class="bb-docs__scroll">
        <section class="bb-docs__card bb-docs__card--fill" aria-label="Select pages">
          {list.length === 0
            ? <PublishEmptyState state="empty-file" title="No pages with screens" body="A hand-off covers whole pages. Add frames to a page in this file and they are listed here." actions={[{ label: 'Check again', variant: 'secondary', onClick: () => { void loadPages(rpc) } }]} />
            : (
              <>
                <p class="bb-docs__hint">Pick the pages you finished designing. Bluebird reads each page’s prototype, lists every component used and checks the screens before it builds the hand-off.</p>
                <div class="bb-docs__row-head">
                  <h3 class="bb-docs__heading">Pages in this file</h3>
                  <LinkButton icon={null} onClick={() => { picked.value = new Set(all ? [] : list.map((p) => p.id)) }}>{all ? 'Clear all' : 'Select all'}</LinkButton>
                </div>
                <div class="bb-docs__options">
                  {list.map((p) => (
                    <Checkbox key={p.id} checked={picked.value.has(p.id)} disabled={auditing} label={`${p.name} · ${plural(p.screens, 'screen')} · ${flowsLabel(p.flows)}`} onChange={(on) => togglePage(p.id, on)} />
                  ))}
                </div>
              </>
            )}
        </section>
      </div>
      <ActionBar
        summary={auditing ? <span role="status">Checking {plural(screens, 'screen')}…</span> : chosen.length ? `${plural(chosen.length, 'page')} · ${plural(screens, 'screen')} · ${plural(flows, 'flow')}` : 'No pages selected'}
        primary={{ label: 'Check and hand off', disabled: !chosen.length || auditing, onClick: () => { void runAudit(rpc) } }}
      />
    </>
  )
}

/** Figma "Docs · Hand-off · 7 No prototype". */
function NoPrototype() {
  const rpc = useRpc()
  const chosen = pickedPages.value
  const screens = chosen.reduce((n, p) => n + p.screens, 0)
  return (
    <>
      <div class="bb-docs__scroll">
        <section class="bb-docs__card bb-docs__card--fill">
          <PublishEmptyState
            state="no-changes"
            icon="ui-prototype-none"
            title={`${chosen.map((p) => p.name).join(', ')} ${chosen.length === 1 ? 'has' : 'have'} no prototype links`}
            body={`Without links there is no user flow to draw. Bluebird can lay the ${plural(screens, 'screen')} out in canvas order instead, or you can link them in Prototype mode and check again.`}
            actions={[{ label: 'Use canvas order', variant: 'secondary', onClick: () => { handoffPhase.value = 'audit' } }]}
          />
        </section>
      </div>
      <ActionBar
        summary={`${chosen.map((p) => p.name).join(', ')} · ${plural(screens, 'screen')} · no prototype`}
        secondary={{ label: 'Back', onClick: () => { handoffPhase.value = 'pages' } }}
        primary={{ label: 'Check again', onClick: () => { void runAudit(rpc) } }}
      />
    </>
  )
}

/** Figma "Documentation · 600 · Hand-off": Select pages → Audit pop-up → Review issues → Details → Generating → Result. */
export function HandoffMode() {
  const rpc = useRpc()
  const phase = handoffPhase.value
  switch (phase) {
    case 'loading':
      return <div class="bb-docs__scroll"><div class="bb-docs__loading" role="status"><Spinner tone="accent" size="lg" label="Reading this file’s pages" /><span>Reading this file’s pages…</span></div></div>
    case 'failed':
      return (
        <>
          <div class="bb-docs__scroll">
            <section class="bb-docs__card bb-docs__card--fill">
              <PublishEmptyState
                state="failed"
                title="Couldn’t finish the hand-off"
                body={handoffError.value}
                actions={[{ label: 'Start again', variant: 'primary', onClick: () => { void loadPages(rpc) } }]}
              />
            </section>
          </div>
          <ActionBar summary="Nothing was drawn" />
        </>
      )
    case 'review': return <ReviewStep />
    case 'no-prototype': return <NoPrototype />
    case 'details': return <DetailsStep />
    case 'building': {
      const chosen = pickedPages.value
      const subject = `${chosen.map((p) => p.name).join(', ')} · ${plural(chosen.reduce((n, p) => n + p.screens, 0), 'screen')}${ticket.value ? ` · ${ticket.value.key}` : ''}`
      return (
        <>
          <div class="bb-docs__scroll"><ProgressView subject={subject} title="Building the hand-off" waiting="Reading the prototype" /></div>
          <ActionBar summary={stepSummary()} secondary={{ label: 'Cancel', onClick: cancelRun }} primary={{ label: 'Create hand-off', disabled: true, onClick: () => undefined }} />
        </>
      )
    }
    case 'result': return <ResultStep />
    default:
      return <><PagesStep />{phase === 'audit' && <AuditDialog />}</>
  }
}
