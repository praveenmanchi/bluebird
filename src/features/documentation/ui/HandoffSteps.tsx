import { CheckItem, Checkbox, FindingRow, LinkButton, SegmentedControl, StatusPill, TextArea, TicketRow, useRpc, type FindingAction } from '@shared/ui'
import { requestSettings } from '@shared/navigation'
import { locate, openDetails, postToJira, runHandoff } from '../actions'
import { handoffTitle, plural } from '../model'
import {
  audience, audit, handoff, handoffPhase, ignored, include, intent, openFindings, pickedPages, postState, restartHandoff, reviewFilter, setIgnored, ticket, tickets,
  toggleInclude, version,
} from '../state'
import { AUDIENCES, CATEGORY_LABEL, DRAFT_VERSIONS, INCLUDES, type FindingCategory } from '../types'
import { ActionBar, Select } from './parts'

const NO_TICKET = 'No ticket'
const SHORT: Readonly<Record<FindingCategory, string>> = { spacing: 'Spacing', components: 'Components', names: 'Names', prototype: 'Prototype', values: 'Values' }
/** The audit cannot rewrite the design: Locate and Ignore only. */
const ACTIONS: readonly FindingAction[] = ['locate', 'ignore']

/** Figma "Docs · Hand-off · 3 Review issues": the findings by category, each one locatable and ignorable. */
export function ReviewStep() {
  const rpc = useRpc()
  const findings = audit.value?.findings ?? []
  const categories = [...new Set(findings.map((f) => f.category))]
  const shown = reviewFilter.value === 'all' ? categories : categories.filter((c) => c === reviewFilter.value)
  const open = openFindings.value.length
  const act = (id: string, nodeId: string) => (action: FindingAction) => {
    if (action === 'locate') locate(rpc, nodeId)
    else if (action === 'ignore') setIgnored([id], !ignored.value.has(id))
  }
  return (
    <>
      <div class="bb-docs__scroll">
        <section class="bb-docs__card bb-docs__card--fill" aria-label="Review issues">
          <SegmentedControl
            class="bb-docs__filters"
            aria-label="Filter issues"
            options={[{ value: 'all', label: `All ${findings.length}` }, ...categories.map((c) => ({ value: c, label: `${SHORT[c]} ${findings.filter((f) => f.category === c).length}` }))]}
            value={reviewFilter.value}
            onChange={(value: FindingCategory | 'all') => { reviewFilter.value = value }}
          />
          {shown.map((category) => (
            <div key={category} class="bb-docs__group">
              <h3 class="bb-docs__heading">{CATEGORY_LABEL[category]}</h3>
              {findings.filter((f) => f.category === category).map((f) => (
                <FindingRow
                  key={f.id}
                  class="bb-docs__finding"
                  data-ignored={ignored.value.has(f.id) || undefined}
                  severity={f.severity}
                  title={ignored.value.has(f.id) ? `Ignored · ${f.title}` : f.title}
                  meta={f.meta}
                  fix={f.fix}
                  actions={ACTIONS}
                  onAction={act(f.id, f.nodeId)}
                />
              ))}
            </div>
          ))}
        </section>
      </div>
      <ActionBar
        summary={open ? `${plural(open, 'issue')} open · fixing is optional` : `${plural(findings.length, 'issue')} ignored · listed as known issues`}
        secondary={{ label: 'Back', onClick: () => { handoffPhase.value = 'audit' } }}
        primary={open
          ? { label: 'Ignore all', onClick: () => setIgnored(findings.map((f) => f.id), true) }
          : { label: 'Continue', onClick: () => { void openDetails(rpc) } }}
      />
    </>
  )
}

function TicketPicker() {
  const list = tickets.value
  if (list === null) return <p class="bb-docs__hint" role="status">Reading open tickets…</p>
  if (typeof list === 'string') {
    return <p class="bb-docs__hint">{list} <LinkButton onClick={requestSettings}>Open settings</LinkButton></p>
  }
  const label = (key: string) => { const t = list.find((x) => x.key === key)!; return `${t.key} · ${t.summary}` }
  const current = ticket.value
  return (
    <>
      {current && <TicketRow issueKey={current.key} title={current.summary} status={current.status.toUpperCase()} showAssignee={false} selected />}
      <Select
        label="Jira ticket"
        value={current ? label(current.key) : NO_TICKET}
        options={[NO_TICKET, ...list.map((t) => label(t.key))]}
        onChange={(value) => { ticket.value = list.find((t) => label(t.key) === value) ?? null }}
      />
    </>
  )
}

/** Figma "Docs · Hand-off · 4 Details": the ticket, what the hand-off is for, who reads it and what goes in. */
export function DetailsStep() {
  const rpc = useRpc()
  const hasFindings = (audit.value?.findings.length ?? 0) > 0
  return (
    <>
      <div class="bb-docs__scroll">
        <section class="bb-docs__card" aria-label="Hand-off details">
          <h3 class="bb-docs__heading">Jira ticket</h3>
          <TicketPicker />
          <h3 class="bb-docs__heading">About this hand-off</h3>
          <TextArea
            label="What is this for?"
            value={intent.value}
            placeholder="What the flow does and who it is for."
            helperText="Goes at the top of the hand-off. Edit it later on the canvas."
            maxLength={2000}
            onValueChange={(value) => { intent.value = value }}
          />
          <div class="bb-docs__pair">
            <Select label="Audience" value={`For: ${audience.value}`} options={AUDIENCES.map((a) => `For: ${a}`)} onChange={(value) => { audience.value = value.replace(/^For: /, '') }} />
            <Select label="Version" value={version.value} options={DRAFT_VERSIONS} onChange={(value) => { version.value = value }} />
          </div>
          <h3 class="bb-docs__heading">Include</h3>
          <div class="bb-docs__options">
            {INCLUDES.map(([id, label]) => <Checkbox key={id} checked={include.value.has(id)} label={id === 'issues' ? `${label} · ${ignored.value.size}` : label} onChange={(on) => toggleInclude(id, on)} />)}
          </div>
        </section>
      </div>
      <ActionBar
        summary={`Creates the page “${handoffTitle(pickedPages.value.map((p) => ({ ...p, links: 0, screens: [] })))}”`}
        secondary={{ label: 'Back', onClick: () => { handoffPhase.value = hasFindings ? 'review' : 'audit' } }}
        primary={{ label: 'Create hand-off', onClick: () => { void runHandoff(rpc) } }}
      />
    </>
  )
}

/** Figma "Docs · Hand-off · 6 Result": what the drafted hand-off page holds. */
export function ResultStep() {
  const rpc = useRpc()
  const result = handoff.value!
  const post = postState.value
  const summary = post === 'posted' ? `Posted to ${result.ticket}`
    : post === 'posting' ? `Posting to ${result.ticket}…`
      : typeof post === 'object' ? post.error
        : result.frameId ? 'Edit the draft on the canvas' : 'The page could not be drawn'
  return (
    <>
      <div class="bb-docs__scroll">
        <section class="bb-docs__card bb-docs__card--fill" aria-label="Hand-off result">
          <div class="bb-docs__row-head">
            <div class="bb-docs__title">
              <h2>{result.title}</h2>
              <p>{result.version} · created {new Date(result.createdAt).toLocaleString(undefined, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
            </div>
            <StatusPill status="issue">Draft</StatusPill>
          </div>
          <h3 class="bb-docs__heading">What’s in it</h3>
          <dl class="bb-docs__facts">
            {result.facts.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{label === 'Jira' && post === 'posted' ? `${result.ticket} · posted` : value}</dd></div>)}
          </dl>
          <h3 class="bb-docs__heading">Sections</h3>
          <div class="bb-docs__checks">
            {result.sections.map((s) => <CheckItem key={s.title} status={s.status} title={s.title} detail={s.detail} showAction={false} />)}
          </div>
          <LinkButton class="bb-docs__more" icon={null} onClick={restartHandoff}>Start another hand-off</LinkButton>
        </section>
      </div>
      <ActionBar
        summary={summary}
        secondary={result.ticket && post !== 'posted' ? { label: `Post to ${result.ticket}`, disabled: post === 'posting', onClick: () => { void postToJira(rpc) } } : undefined}
        primary={result.frameId ? { label: 'Open hand-off page', onClick: () => locate(rpc, result.frameId!) } : { label: 'New hand-off', onClick: restartHandoff }}
      />
    </>
  )
}
