import { ArtifactHeader, ColorSwatch, LinkButton, MetaBadge } from '@shared/ui'
import { figmaUrl, type LibraryComponent, type LibraryVariable } from '@shared/libraries'
import type { GroundedAnswer, Origin, SelectionComponent, SelectionVariable } from '../grounding'
import './LibraryAnswer.css'

export interface LibraryAnswerProps {
  answer: GroundedAnswer
  /** Open a library link in Figma. */
  onOpenUrl?: (url: string) => void
}

/** Swatches shown per colour variable before the rest are summarised in the text. */
const MAX_SWATCHES = 5

const fileList = (keys: readonly string[], files: Readonly<Record<string, string>>) => [...new Set(keys.map((k) => files[k] ?? k))].join(' · ')

/** The Artifact Header's link (always drawn) opens the first library file the panel cites. */
const openFile = (fileKey: string | undefined, onOpenUrl?: (url: string) => void) =>
  fileKey && onOpenUrl ? () => onOpenUrl(figmaUrl(fileKey)) : undefined
const OPEN_LIBRARY = 'Open library ↗'

/** "3 matching variables", or "Top 6 of 40 matching variables" when the list is cut. */
const heading = (shown: number, total: number, what: string) =>
  `${shown < total ? `Top ${shown} of ` : ''}${total} matching ${what}${total === 1 ? '' : 's'}`

function Preview({ variable }: { variable: LibraryVariable }) {
  if (variable.type === 'COLOR') {
    return (
      <span class="bb-uxai-library__swatches">
        {variable.values.slice(0, MAX_SWATCHES).map((m) => <ColorSwatch key={m.mode} size="small" color={m.value} label={`${m.mode} ${m.value}`} />)}
      </span>
    )
  }
  return <span class="bb-uxai-library__amount">{variable.values[0]?.value ?? '–'}</span>
}

const modeLine = (v: LibraryVariable) => v.values.map((m) => `${m.mode} ${m.value}${m.aliasOf ? ` (${m.aliasOf})` : ''}`).join(' · ')

function VariableItem({ variable }: { variable: LibraryVariable }) {
  return (
    <li class="bb-uxai-library__row">
      <Preview variable={variable} />
      <div class="bb-uxai-library__text">
        <span class="bb-uxai-library__name">{variable.name}</span>
        <span class="bb-uxai-library__meta">{`${variable.collection} · ${modeLine(variable)}`}</span>
        {variable.description && <span class="bb-uxai-library__meta">{variable.description}</span>}
      </div>
    </li>
  )
}

function ComponentItem({ component, onOpenUrl }: { component: LibraryComponent; onOpenUrl?: (url: string) => void }) {
  const kind = component.kind === 'set' ? `Set · ${component.variants} variants` : 'Component'
  return (
    <li class="bb-uxai-library__row">
      <div class="bb-uxai-library__text">
        <span class="bb-uxai-library__name">{component.name}</span>
        <span class="bb-uxai-library__meta">{[kind, component.location].filter(Boolean).join(' · ')}</span>
        {component.description && <span class="bb-uxai-library__meta">{component.description}</span>}
      </div>
      {onOpenUrl && <LinkButton class="bb-uxai-library__open" onClick={() => onOpenUrl(figmaUrl(component.fileKey, component.nodeId))}>Open in Figma ↗</LinkButton>}
    </li>
  )
}

function OriginBadge({ origin, file, byName }: { origin: Origin; file?: string; byName?: boolean }) {
  if (origin === 'library') return <MetaBadge tone="success" meta={byName ? 'matched by name' : undefined}>{file ?? 'Library'}</MetaBadge>
  if (origin === 'local') return <MetaBadge tone="neutral">Local</MetaBadge>
  return <MetaBadge tone="warning">Not connected</MetaBadge>
}

function SelectionVariableItem({ item, files }: { item: SelectionVariable; files: Readonly<Record<string, string>> }) {
  return (
    <li class="bb-uxai-library__row" data-origin={item.origin}>
      {item.match ? <Preview variable={item.match} /> : <span class="bb-uxai-library__amount" aria-hidden="true">?</span>}
      <div class="bb-uxai-library__text">
        <span class="bb-uxai-library__name">{item.name}</span>
        <span class="bb-uxai-library__meta">{`${item.properties.join(', ')} · ${item.layers} ${item.layers === 1 ? 'layer' : 'layers'}`}</span>
      </div>
      <OriginBadge origin={item.origin} file={item.match ? files[item.match.fileKey] : undefined} byName={item.byName} />
    </li>
  )
}

function SelectionComponentItem({ item, files, onOpenUrl }: { item: SelectionComponent; files: Readonly<Record<string, string>>; onOpenUrl?: (url: string) => void }) {
  const match = item.match
  return (
    <li class="bb-uxai-library__row" data-origin={item.origin}>
      <div class="bb-uxai-library__text">
        <span class="bb-uxai-library__name">{item.name}</span>
        <span class="bb-uxai-library__meta">{`${item.count} ${item.count === 1 ? 'instance' : 'instances'}${match?.location ? ` · ${match.location}` : ''}`}</span>
      </div>
      <OriginBadge origin={item.origin} file={match ? files[match.fileKey] : undefined} byName={item.byName} />
      {match && onOpenUrl && <LinkButton class="bb-uxai-library__open" onClick={() => onOpenUrl(figmaUrl(match.fileKey, match.nodeId))}>Open ↗</LinkButton>}
    </li>
  )
}

/** What a grounded answer cites: matching variables, matching components, or the selection checked against the libraries. */
export function LibraryAnswer({ answer, onOpenUrl }: LibraryAnswerProps) {
  const { variables, components, selection, files } = answer
  return (
    <div class="bb-uxai-library-answer">
      {variables && variables.items.length > 0 && (
        <section class="bb-uxai-library" aria-label="Matching variables">
          <ArtifactHeader icon="variables" title={heading(variables.items.length, variables.total, 'variable')} subtitle={fileList(variables.items.map((v) => v.fileKey), files)} actionLabel={OPEN_LIBRARY} onOpen={openFile(variables.items[0]?.fileKey, onOpenUrl)} class="bb-uxai-library__header" />
          <ul class="bb-uxai-library__rows">{variables.items.map((v) => <VariableItem key={v.id} variable={v} />)}</ul>
        </section>
      )}
      {components && components.items.length > 0 && (
        <section class="bb-uxai-library" aria-label="Matching components">
          <ArtifactHeader icon="component" title={heading(components.items.length, components.total, 'component')} subtitle={fileList(components.items.map((c) => c.fileKey), files)} actionLabel={OPEN_LIBRARY} onOpen={openFile(components.items[0]?.fileKey, onOpenUrl)} class="bb-uxai-library__header" />
          <ul class="bb-uxai-library__rows">{components.items.map((c) => <ComponentItem key={c.key} component={c} onOpenUrl={onOpenUrl} />)}</ul>
        </section>
      )}
      {selection && (
        <section class="bb-uxai-library" aria-label="Selection checked against your libraries">
          <ArtifactHeader icon="component-select" title={selection.layer} subtitle="Checked against your Dual File libraries" actionLabel={OPEN_LIBRARY} onOpen={openFile([...selection.variables, ...selection.components].find((i) => i.match)?.match?.fileKey, onOpenUrl)} class="bb-uxai-library__header" />
          {selection.variables.length > 0 && (
            <>
              <span class="bb-uxai-library__group">Variables</span>
              <ul class="bb-uxai-library__rows" aria-label="Bound variables">{selection.variables.map((v) => <SelectionVariableItem key={v.name} item={v} files={files} />)}</ul>
            </>
          )}
          {selection.components.length > 0 && (
            <>
              <span class="bb-uxai-library__group">Components</span>
              <ul class="bb-uxai-library__rows" aria-label="Component instances">{selection.components.map((c) => <SelectionComponentItem key={c.name} item={c} files={files} onOpenUrl={onOpenUrl} />)}</ul>
            </>
          )}
        </section>
      )}
    </div>
  )
}
