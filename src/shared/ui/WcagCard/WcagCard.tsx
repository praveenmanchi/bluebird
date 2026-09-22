import type { ComponentChildren, JSX } from 'preact'
import { DisabilityIndicator, type DisabilityKind } from '../DisabilityIndicator/DisabilityIndicator'
import { Icon } from '../Icon/Icon'
import { PrincipleTag, type Principle } from '../PrincipleTag/PrincipleTag'
import { Rating, type RatingLevel } from '../Rating/Rating'
import { ThemeChip, type ThemeChipTheme } from '../ThemeChip/ThemeChip'
import './WcagCard.css'

export interface WcagCardColors {
  /** Foreground swatch ("#8FB7E8" in Figma) — also paints the sample text. */
  fg: string
  /** Background swatch ("#0C8CE9" in Figma) — also paints the sample surface. */
  bg: string
}

export interface WcagCardLink {
  label: ComponentChildren
  href: string
}

/** The "Ratio" badge next to the colour sample. */
export interface WcagCardRatio {
  /** Measured ratio, e.g. "2.4:1". */
  value: string
  /** Threshold copy appended after the separator, e.g. "needs 4.5:1". */
  requirement?: ComponentChildren
  /** Passing pairs show a tick instead of the red cross. */
  pass?: boolean
}

/** Figma BOOLEAN name → DisabilityIndicator kind. */
export const WCAG_CARD_DISABILITIES: Record<'Cognitive' | 'Auditory' | 'Physical/Motor' | 'Visual', DisabilityKind> = {
  Cognitive: 'cognitive',
  Auditory: 'auditory',
  'Physical/Motor': 'physical',
  Visual: 'visual',
}

/** Figma BOOLEAN name → the "Check With :" indicator kind in the footer. */
export const WCAG_CARD_CHECKS: Record<'Check content' | 'check Design' | 'check code', DisabilityKind> = {
  'Check content': 'content',
  'check Design': 'design',
  'check code': 'code',
}

export interface WcagCardProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'title'> {
  /** Figma "WCAG" — the success-criterion number ("1.4.3"). */
  code: ComponentChildren
  /** Criterion title ("Contrast (Minimum)"). */
  title: ComponentChildren
  /** Criterion description (the 8px body text). */
  description?: ComponentChildren
  /** "Rating" instance: A / AA / AAA. */
  rating?: RatingLevel
  /** "Principle" instance, pinned to the top-left corner. */
  principle?: Principle
  /** Figma booleans Cognitive / Auditory / Physical/Motor / Visual → one DisabilityIndicator each. */
  disabilities?: readonly DisabilityKind[]
  /** "Understanding SC 1.4.3 ↗" link on the right of the summary row. */
  link?: WcagCardLink
  /** "Node" row value (mono). */
  node?: ComponentChildren
  /** "Colors" row: two swatches with their hex values. */
  colors?: WcagCardColors
  /** Figma "Actual" — the measured value row. */
  actual?: ComponentChildren
  /** Figma "Requried" — the required value row. */
  required?: ComponentChildren
  /** Figma "why it fails" row. */
  whyItFails?: ComponentChildren
  /** Figma "How ti fix" row. */
  howToFix?: ComponentChildren
  /** "Theme chips" — the Component 13/14/15 Theme instances. */
  themes?: readonly ThemeChipTheme[]
  /** Label of the themes row. */
  themesLabel?: ComponentChildren
  /** Fills the "Placeholder" rectangle above the preview row. */
  preview?: ComponentChildren
  /** Copy inside the colour sample ("Aa" + caption). */
  sampleText?: ComponentChildren
  sampleCaption?: ComponentChildren
  /** The white "Ratio" badge. Needs `colors` to render the sample beside it. */
  ratio?: WcagCardRatio
  /** Figma "Check content" / "check Design" / "check code" → the footer indicators. */
  checks?: readonly DisabilityKind[]
  /** Footer actions. Each button is omitted when its handler is missing. */
  onIgnore?: () => void
  onAnnotate?: () => void
  onSelect?: () => void
  ignoreLabel?: ComponentChildren
  annotateLabel?: ComponentChildren
  /** Accessible name of the icon-only "Select" button. */
  selectLabel?: string
  /** Label before the footer indicators. */
  checkLabel?: ComponentChildren
}

const DEFAULT_DISABILITIES: readonly DisabilityKind[] = ['auditory', 'cognitive', 'physical', 'visual']
const DEFAULT_CHECKS: readonly DisabilityKind[] = ['content', 'design', 'code']

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
  node, colors, actual, required, whyItFails, howToFix, themes = [], themesLabel = 'Themes', preview,
  sampleText = 'Aa', sampleCaption = 'Sample of this exact pair', ratio,
  checks = DEFAULT_CHECKS, onIgnore, onAnnotate, onSelect,
  ignoreLabel = 'Ignore', annotateLabel = 'Annotation', selectLabel = 'Select in Figma', checkLabel = 'Check With :',
  class: cls, ...rest
}: WcagCardProps) {
  const hasFooter = checks.length > 0 || onIgnore !== undefined || onAnnotate !== undefined || onSelect !== undefined
  return (
    <article {...rest} class={`bb-wcag-card ${cls ?? ''}`} data-principle={principle} data-rating={rating}>
      <div class="bb-wcag-card__header">
        <PrincipleTag principle={principle} class="bb-wcag-card__principle" />
        <Rating rating={rating} class="bb-wcag-card__rating" />
      </div>
      <div class="bb-wcag-card__body">
        <div class="bb-wcag-card__summary">
          <div class="bb-wcag-card__criterion">
            <span class="bb-wcag-card__code">{code}</span>
            {disabilities.length > 0 && (
              <span class="bb-wcag-card__indicators">
                {disabilities.map((kind) => <DisabilityIndicator key={kind} kind={kind} class="bb-wcag-card__indicator" />)}
              </span>
            )}
          </div>
          {link && <a class="bb-wcag-card__link" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>}
        </div>
        <div class="bb-wcag-card__sections">
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
            {actual !== undefined && <Row label="Actual">{actual}</Row>}
            {required !== undefined && <Row label="Required">{required}</Row>}
            {whyItFails !== undefined && <Row label="Why it fails">{whyItFails}</Row>}
            {howToFix !== undefined && <Row label="How to fix" class="bb-wcag-card__row--fix">{howToFix}</Row>}
            {themes.length > 0 && (
              <Row label={themesLabel} class="bb-wcag-card__row--themes">
                {themes.map((theme) => <ThemeChip key={theme} theme={theme} class="bb-wcag-card__theme" />)}
              </Row>
            )}
          </div>
          {preview !== undefined && <div class="bb-wcag-card__placeholder">{preview}</div>}
        </div>
        {(colors || ratio) && (
          <div class="bb-wcag-card__preview">
            <div class="bb-wcag-card__preview-row">
              {colors && (
                <div class="bb-wcag-card__sample" style={{ background: colors.bg, color: colors.fg }}>
                  <span class="bb-wcag-card__sample-glyph">{sampleText}</span>
                  <span class="bb-wcag-card__sample-caption">{sampleCaption}</span>
                </div>
              )}
              {ratio && (
                <p class="bb-wcag-card__ratio" data-pass={ratio.pass || undefined}>
                  <span class="bb-wcag-card__ratio-mark" aria-hidden="true">{ratio.pass ? '✓' : '✕'}</span>
                  <span class="bb-wcag-card__ratio-value">
                    {ratio.value}
                    {ratio.requirement !== undefined && <> · {ratio.requirement}</>}
                  </span>
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      {hasFooter && (
        <footer class="bb-wcag-card__footer">
          {checks.length > 0 && (
            <>
              <span class="bb-wcag-card__check-label">{checkLabel}</span>
              <span class="bb-wcag-card__check-icons">
                {checks.map((kind) => <DisabilityIndicator key={kind} kind={kind} class="bb-wcag-card__check" />)}
              </span>
            </>
          )}
          <span class="bb-wcag-card__spacer" />
          {onIgnore && <button type="button" class="bb-wcag-card__action bb-wcag-card__action--ignore" onClick={onIgnore}>{ignoreLabel}</button>}
          {onAnnotate && <button type="button" class="bb-wcag-card__action bb-wcag-card__action--annotate" onClick={onAnnotate}>{annotateLabel}</button>}
          {onSelect && (
            <button type="button" class="bb-wcag-card__action bb-wcag-card__action--select" onClick={onSelect} aria-label={selectLabel}>
              <Icon name="component-select" />
            </button>
          )}
        </footer>
      )}
    </article>
  )
}
