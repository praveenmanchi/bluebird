import { ArtifactHeader, BrandSwatch, ColorSwatch, ContextChip, LinkButton, MetaBadge } from '@shared/ui'
import { BRANDS, type BrandId } from '@shared/brand'
import { figmaUrl, type LibraryComponent, type LibraryStyle, type LibraryTextStyle, type LibraryVariable } from '@shared/libraries'
import { typeSpec, type GroundedAnswer, type Origin, type SelectionComponent, type SelectionVariable } from '../grounding'
import './LibraryAnswer.css'

export interface LibraryAnswerProps {
  answer: GroundedAnswer
  /** Open a library link in Figma. */
  onOpenUrl?: (url: string) => void
}

/** Swatches shown per colour variable before the rest are summarised in the text. */
const MAX_SWATCHES = 5
/** Brand modes the generated CSS knows; a mode named after one tints its swatch caption in that brand. */
const BRAND_IDS = new Set<string>(BRANDS)
const brandOf = (mode: string): BrandId | undefined => BRAND_IDS.has(mode.toLowerCase()) ? mode.toLowerCase() as BrandId : undefined
/** The Color Artifact's "Used by" badges read the variable's scopes; Figma's enum names become words. */
const scopeLabel = (scope: string) => scope.toLowerCase().replace(/_/g, ' ').replace('all ', 'all ')
/** Text specimens render at their real size, capped so a 96px display style still fits the panel. */
const MAX_SPECIMEN_PX = 40

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

/**
 * The Color Artifact template (Figma 40000285:8157) filled from a library variable: one Brand
 * Swatch per mode, the alias chain after "Resolves", the variable's scopes as "Used by".
 */
function ColorVariableArtifact({ variable, files, onOpenUrl }: { variable: LibraryVariable; files: Readonly<Record<string, string>>; onOpenUrl?: (url: string) => void }) {
  const chain = [variable.name, ...[...new Set(variable.values.map((m) => m.aliasOf).filter((a): a is string => Boolean(a)))]]
  return (
    <article class="bb-uxai-color-artifact" aria-label={`${variable.name} in every mode`}>
      <ArtifactHeader icon="colors" title={variable.name} subtitle={`Colour variable · ${variable.collection} · ${files[variable.fileKey] ?? variable.fileKey}`} actionLabel={OPEN_LIBRARY} onOpen={openFile(variable.fileKey, onOpenUrl)} class="bb-uxai-library__header" />
      <div class="bb-uxai-color-artifact__brands">
        {variable.values.map((m) => <BrandSwatch key={m.mode} brand={brandOf(m.mode)} label={m.mode} hex={m.value} color={m.value.startsWith('#') ? m.value : undefined} />)}
      </div>
      <div class="bb-uxai-color-artifact__row">
        <span class="bb-uxai-library__meta">Resolves</span>
        {chain.map((hop, i) => [
          i > 0 && <span key={`arrow-${hop}`} class="bb-uxai-library__meta" aria-hidden="true">→</span>,
          <ContextChip key={hop} type="citation">{hop}</ContextChip>,
        ])}
      </div>
      {variable.scopes.length > 0 && (
        <div class="bb-uxai-color-artifact__row">
          <span class="bb-uxai-library__meta">Used by</span>
          {variable.scopes.slice(0, 4).map((scope) => <MetaBadge key={scope} tone="accent">{scopeLabel(scope)}</MetaBadge>)}
        </div>
      )}
    </article>
  )
}

function TextStyleItem({ style }: { style: LibraryTextStyle }) {
  const size = Math.min(style.fontSize || 12, MAX_SPECIMEN_PX)
  const specimen = { fontFamily: style.fontFamily ? `"${style.fontFamily}", ui-sans-serif, system-ui, sans-serif` : undefined, fontSize: `${size}px`, fontWeight: style.fontWeight, lineHeight: 1.2, letterSpacing: style.letterSpacing ? `${style.letterSpacing}px` : undefined, textTransform: style.textCase === 'UPPER' ? 'uppercase' : style.textCase === 'LOWER' ? 'lowercase' : style.textCase === 'TITLE' ? 'capitalize' : undefined }
  return (
    <li class="bb-uxai-library__row bb-uxai-type__row">
      <span class="bb-uxai-type__specimen" style={specimen} aria-hidden="true">{style.name.split('/').pop() || 'Aa'}</span>
      <div class="bb-uxai-library__text">
        <span class="bb-uxai-library__name">{style.name}</span>
        <span class="bb-uxai-library__meta">{`${[style.fontFamily, typeSpec(style)].filter(Boolean).join(' · ')}${style.fontSize && style.fontSize > MAX_SPECIMEN_PX ? ' · shown smaller' : ''}`}</span>
        {style.description && <span class="bb-uxai-library__meta">{style.description}</span>}
      </div>
    </li>
  )
}

function ColorStyleItem({ style }: { style: Extract<LibraryStyle, { kind: 'color' }> }) {
  return (
    <li class="bb-uxai-library__row">
      {style.hex ? <ColorSwatch size="small" color={style.hex} label={style.hex} /> : <span class="bb-uxai-library__amount" aria-hidden="true">?</span>}
      <div class="bb-uxai-library__text">
        <span class="bb-uxai-library__name">{style.name}</span>
        <span class="bb-uxai-library__meta">{style.hex ?? 'Gradient or image style'}{style.description ? ` · ${style.description}` : ''}</span>
      </div>
    </li>
  )
}

/** What a grounded answer cites: matching variables, matching components, styles, or the selection checked against the libraries. */
export function LibraryAnswer({ answer, onOpenUrl }: LibraryAnswerProps) {
  const { variables, components, styles, selection, files } = answer
  const focus = variables?.items[0]
  const texts = (styles?.items ?? []).filter((s): s is LibraryTextStyle => s.kind === 'text').sort((a, b) => b.fontSize - a.fontSize)
  const colours = (styles?.items ?? []).filter((s): s is Extract<LibraryStyle, { kind: 'color' }> => s.kind === 'color')
  return (
    <div class="bb-uxai-library-answer">
      {focus?.type === 'COLOR' && <ColorVariableArtifact variable={focus} files={files} onOpenUrl={onOpenUrl} />}
      {texts.length > 0 && (
        <section class="bb-uxai-library" aria-label="Matching text styles">
          <ArtifactHeader icon="text" title={heading(texts.length, styles!.total, 'text style')} subtitle={`${[...new Set(texts.map((t) => t.fontFamily).filter(Boolean))].join(', ') || 'Published text styles'} · ${fileList(texts.map((t) => t.fileKey), files)}`} actionLabel={OPEN_LIBRARY} onOpen={openFile(texts[0]?.fileKey, onOpenUrl)} class="bb-uxai-library__header" />
          <ul class="bb-uxai-library__rows">{texts.map((t) => <TextStyleItem key={t.key} style={t} />)}</ul>
        </section>
      )}
      {colours.length > 0 && (
        <section class="bb-uxai-library" aria-label="Matching colour styles">
          <ArtifactHeader icon="colors" title={heading(colours.length, styles!.total, 'colour style')} subtitle={fileList(colours.map((c) => c.fileKey), files)} actionLabel={OPEN_LIBRARY} onOpen={openFile(colours[0]?.fileKey, onOpenUrl)} class="bb-uxai-library__header" />
          <ul class="bb-uxai-library__rows">{colours.map((c) => <ColorStyleItem key={c.key} style={c} />)}</ul>
        </section>
      )}
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
