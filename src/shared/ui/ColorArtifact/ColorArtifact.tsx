import type { ComponentChildren, JSX } from 'preact'
import type { BrandId } from '../../brand/generated/tokens'
import { ArtifactHeader } from '../ArtifactHeader/ArtifactHeader'
import { BrandSwatch } from '../BrandSwatch/BrandSwatch'
import { ContextChip } from '../ContextChip/ContextChip'
import { MetaBadge, type MetaBadgeTone } from '../MetaBadge/MetaBadge'
import './ColorArtifact.css'

export interface ColorArtifactSwatch {
  brand: BrandId
  /** The value the variable resolves to in that brand, as text. */
  hex: string
}

export interface ColorArtifactUsage {
  label: ComponentChildren
  tone?: MetaBadgeTone
}

const SWATCHES: readonly ColorArtifactSwatch[] = [
  { brand: 'bridge', hex: '#0C8CE9' }, // allow-raw: sample content mirroring the Figma component, shown as data
  { brand: 'ikea', hex: '#161616' }, // allow-raw: sample content mirroring the Figma component, shown as data
  { brand: 'richemont', hex: '#004165' }, // allow-raw: sample content mirroring the Figma component, shown as data
  { brand: 'disney', hex: '#0063E5' }, // allow-raw: sample content mirroring the Figma component, shown as data
  { brand: 'fiskars', hex: '#FF8E00' }, // allow-raw: sample content mirroring the Figma component, shown as data
]
const CHAIN: readonly string[] = ['surface/accent', 'bridge/color/primary/400-brand', '#0C8CE9'] // allow-raw: sample content mirroring the Figma component, shown as data
const USAGE: readonly ColorArtifactUsage[] = [
  { label: 'Button · primary', tone: 'accent' },
  { label: 'Tab indicator', tone: 'accent' },
  { label: 'Avatar', tone: 'accent' },
  { label: 'AA 4.6:1 on canvas', tone: 'success' },
]

/** "surface/accent" → "var(--bb-surface-accent)", the generated CSS name of a Figma variable. */
const tokenColor = (variable: string) => `var(--bb-${variable.replace(/\//g, '-')})`

export interface ColorArtifactProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title'> {
  /** The colour variable on show (Figma variable name). Each brand swatch paints it in that brand's mode. */
  variable?: string
  /** Artifact Header "Title"; defaults to `variable`. */
  title?: ComponentChildren
  /** Artifact Header "Subtitle". */
  subtitle?: ComponentChildren
  /** One Brand Swatch per brand mode. */
  swatches?: readonly ColorArtifactSwatch[]
  /** The alias chain after "Resolves", one Citation chip per hop. */
  chain?: readonly string[]
  /** "Used by" Meta Badges. */
  usage?: readonly ColorArtifactUsage[]
  actionLabel?: ComponentChildren
  /** Fired by the header's "Open in Figma" link. */
  onOpen?: () => void
}

/** Figma "Color Artifact" (40000285:8157): the UX AI chat's answer card for a colour variable. */
export function ColorArtifact({
  variable = 'surface/accent',
  title,
  subtitle = 'Colour variable · Brand UI · used in 38 layers',
  swatches = SWATCHES,
  chain = CHAIN,
  usage = USAGE,
  actionLabel,
  onOpen,
  class: cls,
  ...rest
}: ColorArtifactProps) {
  return (
    <article {...rest} class={`bb-color-artifact ${cls ?? ''}`}>
      <ArtifactHeader icon="colors" title={title ?? variable} subtitle={subtitle} actionLabel={actionLabel} onOpen={onOpen} class="bb-color-artifact__header" />
      <div class="bb-color-artifact__brands">
        {swatches.map((s) => <BrandSwatch key={s.brand} brand={s.brand} hex={s.hex} color={tokenColor(variable)} />)}
      </div>
      <div class="bb-color-artifact__row">
        <span class="bb-color-artifact__caption">Resolves</span>
        {chain.map((hop, i) => [
          i > 0 && <span key={`arrow-${hop}`} class="bb-color-artifact__caption" aria-hidden="true">→</span>,
          <ContextChip key={hop} type="citation">{hop}</ContextChip>,
        ])}
      </div>
      <div class="bb-color-artifact__row">
        <span class="bb-color-artifact__caption">Used by</span>
        {usage.map((u, i) => <MetaBadge key={i} tone={u.tone ?? 'accent'}>{u.label}</MetaBadge>)}
      </div>
    </article>
  )
}
