import type { ComponentChildren, JSX } from 'preact'
import { DisabilityIndicator, type DisabilityKind } from '../DisabilityIndicator/DisabilityIndicator'
import { Icon } from '../Icon/Icon'
import { PrincipleTag, type Principle } from '../PrincipleTag/PrincipleTag'
import { Rating, type RatingLevel } from '../Rating/Rating'
import { ThemeChip, type ThemeChipTheme } from '../ThemeChip/ThemeChip'
import { BrandModes } from '../BrandModes/BrandModes'
import { CodeSnippet } from '../CodeSnippet/CodeSnippet'
import { FixRow } from '../FixRow/FixRow'
import { IgnoreBanner } from '../IgnoreBanner/IgnoreBanner'
import { ManualReview } from '../ManualReview/ManualReview'
import { MetaBadge } from '../MetaBadge/MetaBadge'
import { MetricsPanel, type MetricsPanelMetric } from '../MetricsPanel/MetricsPanel'
import { Occurrences } from '../Occurrences/Occurrences'
import { ThumbnailPair } from '../ThumbnailPair/ThumbnailPair'
import { TokenRef } from '../TokenRef/TokenRef'
import {
  CHANGE_LABEL, CHANGE_TONE, IGNORE_SCOPE_LABEL, SEVERITY_LABEL, SEVERITY_TONE,
  type WcagCardAnnotation, type WcagCardBrandVerdict, type WcagCardChange, type WcagCardFix,
  type WcagCardIgnore, type WcagCardManualCheck, type WcagCardMode, type WcagCardOccurrences,
  type WcagCardSeverity, type WcagCardSnippet, type WcagCardTextMetrics, type WcagCardThumbnail,
  type WcagCardToken,
} from './types'
import './WcagCard.css'

export * from './types'

export interface WcagCardColors {
  /** Foreground swatch ("#8FB7E8" in Figma) — also paints the sample text. */
  fg: string
  /** Background swatch ("#0C8CE9" in Figma) — also paints the sample surface. */
  bg: string
  /** Variable the foreground is bound to, shown under the hex (gap 3). */
  fgToken?: WcagCardToken
  /** Variable the background is bound to (gap 3). */
  bgToken?: WcagCardToken
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

const ANNOTATE_LABEL: Record<NonNullable<WcagCardAnnotation['state']>, string> = {
  none: 'Annotation',
  queued: 'Annotating…',
  placed: 'Annotated',
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
  /** Variable the offending layer reads, shown under the node name (gap 3). */
  nodeToken?: WcagCardToken
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

  /** Gap 1 — `colors` adds the swatch sample, ratio badge and fix row; `text` drops them. */
  mode?: WcagCardMode
  /** Gap 1 — the Metrics panel, which Figma now renders in both modes. */
  metrics?: WcagCardTextMetrics
  /** Gap 2 — the suggested token/value and its Apply action. */
  fix?: WcagCardFix
  /** Gap 4 — pass/fail for the same pair in every brand mode. */
  brandModes?: readonly WcagCardBrandVerdict[]
  brandModesLabel?: ComponentChildren
  /** Gap 5 — impact ranking shown in the header. */
  severity?: WcagCardSeverity
  /** Gap 5 — how many layers share this exact finding. */
  occurrences?: WcagCardOccurrences
  /** Gap 6 — when set the card renders as ignored, with the reason and a Restore action. */
  ignored?: WcagCardIgnore
  /** Gap 7 — annotation lifecycle; drives the footer button's label and state. */
  annotation?: WcagCardAnnotation
  /** Gap 8 — the real manual-review list behind the "Check With" icons. */
  manualChecks?: readonly WcagCardManualCheck[]
  manualChecksLabel?: ComponentChildren
  onToggleManualCheck?: (index: number, done: boolean) => void
  /** Gap 9 — node thumbnails; `previewAfter` renders a before/after pair. */
  thumbnail?: WcagCardThumbnail
  thumbnailAfter?: WcagCardThumbnail
  /** Gap 10 — how this finding compares with the previous scan. */
  change?: WcagCardChange
  /** Gap 10 — free text beside the change badge, e.g. "first seen 22 Sep". */
  lastSeen?: ComponentChildren
  /** Gap 11 — the implementation snippet for the developer. */
  snippet?: WcagCardSnippet

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

const METRIC_ROWS = [
  ['size', 'Size'], ['weight', 'Weight'], ['lineHeight', 'Line height'],
  ['letterSpacing', 'Letter spacing'], ['measure', 'Measure'],
] as const

/** WcagCardTextMetrics → the MetricsPanel's cell list, skipping anything not measured. */
function metricRows(metrics: WcagCardTextMetrics): MetricsPanelMetric[] {
  const rows: MetricsPanelMetric[] = METRIC_ROWS
    .filter(([key]) => metrics[key] !== undefined)
    .map(([key, label]) => ({ label, value: metrics[key] }))
  if (metrics.largeText !== undefined) {
    rows.push({ label: 'Threshold', value: metrics.largeText ? 'Large text (3:1)' : 'Body text (4.5:1)' })
  }
  return rows
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

function Swatch({ value, token, prefix }: { value: string; token?: WcagCardToken; prefix?: string }) {
  return (
    <span class="bb-wcag-card__swatch-item">
      {prefix && <span class="bb-wcag-card__on">{prefix}</span>}
      <span class="bb-wcag-card__swatch" style={{ background: value }} aria-hidden="true" />
      <span class="bb-wcag-card__swatch-labels">
        <span class="bb-wcag-card__mono">{value.toUpperCase()}</span>
        {token && <TokenRef name={token.name} mode={token.mode} />}
      </span>
    </span>
  )
}

/**
 * Figma "WCAG Card" set (40000141:9570 — Mode=colors 419:39993, Mode=Text
 * 40000141:9571): a success-criterion card composing Rating,
 * PrincipleTag, DisabilityIndicator and ThemeChip.
 *
 * Everything above `mode` mirrors the Figma set one-to-one. The props from
 * `mode` down are code-only and close the eleven card-level gaps of the
 * 2026-09-23 market analysis; each renders nothing until it is passed, so a
 * card built from the Figma contract alone looks exactly as it did before.
 */
export function WcagCard({
  code, title, description, rating = 'A', principle = 'perceivable', disabilities = DEFAULT_DISABILITIES, link,
  node, nodeToken, colors, actual, required, whyItFails, howToFix, themes = [], themesLabel = 'Themes', preview,
  mode = 'colors', metrics, fix, brandModes, brandModesLabel, severity, occurrences, ignored, annotation,
  manualChecks, manualChecksLabel, onToggleManualCheck, thumbnail, thumbnailAfter, change, lastSeen, snippet,
  sampleText = 'Aa', sampleCaption = 'Sample of this exact pair', ratio,
  checks = DEFAULT_CHECKS, onIgnore, onAnnotate, onSelect,
  ignoreLabel = 'Ignore', annotateLabel, selectLabel = 'Select in Figma', checkLabel = 'Check With :',
  class: cls, ...rest
}: WcagCardProps) {
  const hasFooter = checks.length > 0 || onIgnore !== undefined || onAnnotate !== undefined || onSelect !== undefined
  const annotationState = annotation?.state ?? 'none'
  const annotateText = annotateLabel ?? ANNOTATE_LABEL[annotationState]
  const showSample = mode === 'colors' && (colors !== undefined || ratio !== undefined)
  const showMetrics = metrics !== undefined
  const showBrandModes = brandModes !== undefined && brandModes.length > 0
  return (
    <article
      {...rest}
      class={`bb-wcag-card ${cls ?? ''}`}
      data-principle={principle}
      data-rating={rating}
      data-mode={mode}
      data-severity={severity}
      data-change={change}
      data-ignored={ignored !== undefined || undefined}
    >
      <div class="bb-wcag-card__header">
        <PrincipleTag principle={principle} class="bb-wcag-card__principle" />
        <span class="bb-wcag-card__header-meta">
          {change !== undefined && (
            <MetaBadge tone={CHANGE_TONE[change]} meta={lastSeen}>{CHANGE_LABEL[change]}</MetaBadge>
          )}
          {severity !== undefined && (
            <MetaBadge tone={SEVERITY_TONE[severity]} title={`${SEVERITY_LABEL[severity]} impact`}>
              {SEVERITY_LABEL[severity]}
            </MetaBadge>
          )}
        </span>
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
          {(occurrences || link) && (
            <div class="bb-wcag-card__reference">
              {occurrences && (
                <Occurrences
                  count={occurrences.count}
                  label={occurrences.label}
                  selectAllLabel={occurrences.selectAllLabel}
                  onSelectAll={occurrences.onSelectAll}
                />
              )}
              {link && <a class="bb-wcag-card__link" href={link.href} target="_blank" rel="noreferrer">{link.label}</a>}
            </div>
          )}
        </div>
        <div class="bb-wcag-card__sections">
          <div class="bb-wcag-card__heading">
            <h3 class="bb-wcag-card__title">{title}</h3>
            {description !== undefined && <p class="bb-wcag-card__description">{description}</p>}
          </div>
          <hr class="bb-wcag-card__divider" />
          <div class="bb-wcag-card__details">
            {node !== undefined && (
              <Row label="Node">
                <span class="bb-wcag-card__mono">{node}</span>
                {nodeToken && <TokenRef name={nodeToken.name} mode={nodeToken.mode} />}
              </Row>
            )}
            {colors && (
              <Row label="Colors" class="bb-wcag-card__row--colors">
                <Swatch value={colors.fg} token={colors.fgToken} />
                <Swatch value={colors.bg} token={colors.bgToken} prefix="on" />
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
          {showMetrics && <MetricsPanel metrics={metricRows(metrics)} />}
          {showBrandModes && <hr class="bb-wcag-card__divider" />}
          {showBrandModes && <BrandModes modes={brandModes} label={brandModesLabel} />}
          {(thumbnail || thumbnailAfter) && <ThumbnailPair before={thumbnail} after={thumbnailAfter} />}
          {preview !== undefined && <div class="bb-wcag-card__placeholder">{preview}</div>}
        </div>
        {showSample && (
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
        {/* FixRow keeps its own short "Aa" swatch — forwarding the card's
            sampleText would stretch the row with a whole sentence. */}
        {fix && (
          <FixRow
            label={fix.label ?? (fix.token ? <>Rebind to <strong>{fix.token.name}</strong></> : undefined)}
            hex={fix.value}
            on={fix.on ?? colors?.bg}
            ratio={fix.ratio}
            applyLabel={fix.applyLabel}
            onApply={fix.onApply}
          />
        )}
        {manualChecks && manualChecks.length > 0 && (
          <ManualReview checks={manualChecks} label={manualChecksLabel} onToggle={onToggleManualCheck} />
        )}
        {snippet && (
          <CodeSnippet
            code={snippet.code}
            language={snippet.language}
            copyLabel={snippet.copyLabel}
            onCopy={snippet.onCopy}
          />
        )}
        {ignored && (
          <IgnoreBanner
            reason={ignored.reason}
            scope={ignored.scope !== undefined ? `Applies to ${IGNORE_SCOPE_LABEL[ignored.scope]}` : undefined}
            author={ignored.author !== undefined ? <>by {ignored.author}</> : undefined}
            expires={ignored.expires}
            undoLabel={ignored.undoLabel}
            onUndo={ignored.onUndo}
          />
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
          {onAnnotate && (
            <button
              type="button"
              class="bb-wcag-card__action bb-wcag-card__action--annotate"
              data-state={annotationState}
              aria-busy={annotationState === 'queued' || undefined}
              disabled={annotationState === 'queued'}
              title={annotation?.target !== undefined ? `Annotate in ${String(annotation.target)}` : undefined}
              onClick={onAnnotate}
            >
              {annotationState === 'placed' && <Icon name="status-good" class="bb-wcag-card__action-icon" />}
              {annotateText}
            </button>
          )}
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
