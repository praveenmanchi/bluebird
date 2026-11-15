import { Checkbox, LinkButton, PublishEmptyState, SelectionPreview, Spinner, useRpc } from '@shared/ui'
import { cancelRun, copyMarkdown, locate, refreshSelection, runGenerate } from '../actions'
import { plural } from '../model'
import { changes, component, componentError, componentPhase, doc, drawFrame, notice, sections, toggleSection } from '../state'
import { SECTIONS } from '../types'
import { ComponentResult } from './ComponentResult'
import { ActionBar, ProgressView, stepSummary } from './parts'

function Configure() {
  const rpc = useRpc()
  const c = component.value!
  const all = sections.value.size === SECTIONS.length
  return (
    <section class="bb-docs__card" aria-label="Generate component docs">
      <SelectionPreview
        name={c.name}
        meta={`${c.kind} · ${plural(c.variants, 'variant')}${c.properties.length ? ` · ${c.properties.slice(0, 3).join(', ')}` : ''}`}
        stats={[{ label: plural(c.tokens, 'token'), tone: 'accent' }, { label: `${c.nested} nested` }, { label: plural(c.rawValues, 'raw value'), tone: c.rawValues ? 'warning' : 'success' }]}
        onSelectOnCanvas={() => locate(rpc, c.nodeId)}
      >
        {c.preview ? <img class="bb-docs__thumb" src={c.preview} alt="" /> : <span class="bb-docs__specimen-name">{c.name}</span>}
      </SelectionPreview>
      <div class="bb-docs__row-head">
        <h3 class="bb-docs__heading">Sections to include</h3>
        <LinkButton icon={null} onClick={() => { sections.value = new Set(all ? [] : SECTIONS.map(([id]) => id)) }}>{all ? 'Clear all' : 'Select all'}</LinkButton>
      </div>
      <div class="bb-docs__options">
        {SECTIONS.map(([id, label, detail]) => (
          <Checkbox key={id} checked={sections.value.has(id)} label={`${label} · ${detail}`} onChange={(on) => toggleSection(id, on)} />
        ))}
      </div>
      <h3 class="bb-docs__heading">Output</h3>
      <div class="bb-docs__options">
        <Checkbox checked={drawFrame.value} label="Doc frame on this file’s Documentation page" onChange={(on) => { drawFrame.value = on }} />
      </div>
      <p class="bb-docs__hint">The doc is also kept on the component, so Bluebird can tell you when it goes out of date. Markdown is copied from the result.</p>
    </section>
  )
}

/** Figma "Documentation · 600 · Components": Nothing selected → Configure → Generating → Result / Out of date / Error. */
export function ComponentsMode() {
  const rpc = useRpc()
  const phase = componentPhase.value
  const c = component.value
  const generate = () => { void runGenerate(rpc) }
  const d = doc.value

  if (phase === 'loading') {
    return <div class="bb-docs__scroll"><div class="bb-docs__loading" role="status"><Spinner tone="accent" size="lg" label="Reading the selection" /><span>Reading the selection…</span></div></div>
  }
  if (phase === 'generating') {
    return (
      <>
        <div class="bb-docs__scroll"><ProgressView subject={c ? `${c.name} · ${c.kind} · ${plural(c.variants, 'variant')}` : 'Component'} title="Generating" waiting="Reading variants and properties" /></div>
        <ActionBar summary={stepSummary()} secondary={{ label: 'Cancel', onClick: cancelRun }} primary={{ label: 'Generate docs', disabled: true, onClick: generate }} />
      </>
    )
  }
  if (phase === 'failed') {
    return (
      <>
        <div class="bb-docs__scroll">
          <section class="bb-docs__card bb-docs__card--fill">
            <PublishEmptyState
              state="failed"
              title={c ? `Couldn’t finish the ${c.name} doc` : 'Couldn’t read the selection'}
              body={componentError.value}
              actions={c
                ? [{ label: 'Change sections', variant: 'secondary', onClick: () => { componentPhase.value = 'configure' } }, { label: 'Try again', variant: 'primary', onClick: generate }]
                : [{ label: 'Try again', variant: 'primary', onClick: () => { void refreshSelection(rpc) } }]}
            />
          </section>
        </div>
        <ActionBar summary={c ? 'Nothing was drawn or saved' : 'Nothing selected'} primary={{ label: 'Generate docs', disabled: true, onClick: generate }} />
      </>
    )
  }
  if (phase === 'result' && d) {
    const stale = changes.value.length > 0
    return (
      <>
        <div class="bb-docs__scroll"><ComponentResult doc={d} /></div>
        <ActionBar
          summary={notice.value ?? (stale ? 'Regenerating replaces the doc frame' : d.frameId ? 'Doc frame placed on the Documentation page' : 'Kept on the component · no frame drawn')}
          secondary={{ label: 'Copy Markdown', onClick: () => { void copyMarkdown() } }}
          primary={stale ? { label: 'Regenerate', onClick: generate } : d.frameId ? { label: 'Open doc frame', onClick: () => locate(rpc, d.frameId!) } : { label: 'Generate again', onClick: () => { componentPhase.value = 'configure' } }}
        />
      </>
    )
  }
  if (!c) {
    return (
      <>
        <div class="bb-docs__scroll">
          <section class="bb-docs__card bb-docs__card--fill">
            <PublishEmptyState
              state="no-changes"
              icon="component-select"
              title="Select a component to document"
              body="Pick a component, a component set, one variant or an instance on the canvas. Bluebird reads its properties, tokens and values for every brand."
              actions={[]}
            />
          </section>
        </div>
        <ActionBar summary="Nothing selected" primary={{ label: 'Generate docs', disabled: true, onClick: generate }} />
      </>
    )
  }
  const count = sections.value.size
  return (
    <>
      <div class="bb-docs__scroll"><Configure /></div>
      <ActionBar
        summary={`${plural(count, 'section')}${c.brands.length ? ` · ${plural(c.brands.length, 'brand')}` : ''} · ${plural(c.variants, 'variant')}`}
        secondary={d ? { label: 'Back to doc', onClick: () => { componentPhase.value = 'result' } } : undefined}
        primary={{ label: 'Generate docs', disabled: count === 0, onClick: generate }}
      />
    </>
  )
}
