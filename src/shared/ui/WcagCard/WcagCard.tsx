import type { ComponentChildren, JSX } from 'preact'
import { DisabilityIndicator, type DisabilityKind } from '../DisabilityIndicator/DisabilityIndicator'
import { PrincipleTag, type Principle } from '../PrincipleTag/PrincipleTag'
import { Rating, type RatingLevel } from '../Rating/Rating'
import { ThemeChip, type ThemeChipTheme } from '../ThemeChip/ThemeChip'
import './WcagCard.css'

export interface WcagCardColors {
  /** Foreground swatch ("#8FB7E8" in Figma). */
  fg: string
  /** Background swatch ("#0C8CE9" in Figma). */
  bg: string
}

export interface WcagCardLink {
  label: ComponentChildren
  href: string
}

/** Figma BOOLEAN name → DisabilityIndicator kind. */
export const WCAG_CARD_DISABILITIES: Record<'Cognitive' | 'Auditory' | 'Physical/Motor' | 'Visual', DisabilityKind> = {
  Cognitive: 'cognitive',
  Auditory: 'auditory',
  'Physical/Motor': 'physical',
  Visual: 'visual',
}

export interface WcagCardProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title'> {
  /** Success-criterion number ("1.4.3" text layer). */
  code: ComponentChildren
  /** Criterion title ("Contrast (Minimum)"). */
  title: ComponentChildren
  /** Criterion description (the 8px body text). */
  description?: ComponentChildren
  /** "Rating" instance: A / AA / AAA. */
  rating?: RatingLevel
  /** "Principle" instance. */
  principle?: Principle
  /** Figma booleans Cognitive / Auditory / Physical/Motor / Visual → one DisabilityIndicator each. */
  disabilities?: readonly DisabilityKind[]
  /** "Understanding SC 1.4.3 ↗" link in the title row. */
  link?: WcagCardLink
  /** "Node" row value (mono). */
  node?: ComponentChildren
  /** "Colors" row: two swatches with their hex values. */
  colors?: WcagCardColors
  /** "Why it fails" row. */
  whyItFails?: ComponentChildren
  /** "How to fix" row. */
  howToFix?: ComponentChildren
  /** "Component 13/14/15" Theme instances. */
  themes?: readonly ThemeChipTheme[]
  /** Label of the themes row (Figma repeats "How to fix"; defaults to "Themes"). */
  themesLabel?: ComponentChildren
  /** Replaces the placeholder "Rectangle 3475057" preview area. */
  preview?: ComponentChildren
}

const DEFAULT_DISABILITIES: readonly DisabilityKind[] = ['auditory', 'cognitive', 'physical', 'visual']

function Row({ label, children, class: cls }: { label: ComponentChildren; children: ComponentChildren; class?: string }) {
  return (
    <div class={`bb-wcag-card__row ${cls ?? ''}`}>
      <span class="bb-wcag-card__row-label">{label}</span>
      <span class="bb-wcag-card__row-value">{children}</span>
    </div>
  )
}

function Swatch({ value }: { value: string }) {
  return (
    <span class="bb-wcag-card__swatch-item">
      <span class="bb-wcag-card__swatch" style={{ background: value }} aria-hidden="true" />
      <span class="bb-wcag-card__mono">{value.toUpperCase()}</span>
    </span>
  )
}

/** Figma "WCAG Card" (419:39993): a success-criterion card composing Rating, PrincipleTag, DisabilityIndicator and ThemeChip. */
export function WcagCard({
  code, title, description, rating = 'A', principle = 'perceivable', disabilities = DEFAULT_DISABILITIES, link,
  node, colors, whyItFails, howToFix, themes = [], themesLabel = 'Themes', preview, class: cls, ...rest
}: WcagCardProps) {
  return (
    <article {...rest} class={`bb-wcag-card ${cls ?? ''}`} data-principle={principle} data-rating={rating}>
      <div class="bb-wcag-card__header">
        <Rating rating={rating} class="bb-wcag-card__rating" />
        <PrincipleTag principle={principle} class="bb-wcag-card__principle" />
      </div>
      <div class="bb-wcag-card__body">
        <div class="bb-wcag-card__title-row">
          <span class="bb-wcag-card__code">{code}</span>
          {disabilities.length > 0 && (
            <span class="bb-wcag-card__indicators">
              {disabilities.map((kind) => <DisabilityIndicator key={kind} kind={kind} class="bb-wcag-card__indicator" />)}
            </span>
          )}
          {link && <a class="bb-wcag-card__link" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>}
        </div>
        <div class="bb-wcag-card__content">
          <div class="bb-wcag-card__heading">
            <h3 class="bb-wcag-card__title">{title}</h3>
            {description !== undefined && <p class="bb-wcag-card__description">{description}</p>}
          </div>
          <hr class="bb-wcag-card__divider" />
          <div class="bb-wcag-card__details">
            {node !== undefined && <Row label="Node"><span class="bb-wcag-card__mono">{node}</span></Row>}
            {colors && (
              <Row label="Colors" class="bb-wcag-card__row--colors">
                <Swatch value={colors.fg} />
                <span class="bb-wcag-card__on">on</span>
                <Swatch value={colors.bg} />
              </Row>
            )}
            {whyItFails !== undefined && <Row label="Why it fails">{whyItFails}</Row>}
            {howToFix !== undefined && <Row label="How to fix" class="bb-wcag-card__row--fix">{howToFix}</Row>}
            {themes.length > 0 && (
              <Row label={themesLabel} class="bb-wcag-card__row--themes">
                {themes.map((theme) => <ThemeChip key={theme} theme={theme} class="bb-wcag-card__theme" />)}
              </Row>
            )}
          </div>
          <div class="bb-wcag-card__preview" data-placeholder={preview === undefined || undefined}>{preview}</div>
        </div>
      </div>
    </article>
  )
}
