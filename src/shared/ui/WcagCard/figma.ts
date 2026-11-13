import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for WcagCard ("WCAG Card" set 40000141:9570 —
 *  Mode=colors 419:39993, Mode=Text 40000141:9571). */
export const figma = {
  setId: '40000141:9570',
  name: 'WCAG Card',
  props: {
    WCAG: 'code',
    Node: 'node',
    Actual: 'actual',
    Required: 'required',
    'Check content': 'checks includes "content"',
    'check Design': 'checks includes "design"',
    'check code': 'checks includes "code"',
    'why it fails': 'whyItFails',
    'How to fix': 'howToFix',
    Cognitive: 'disabilities includes "cognitive"',
    Auditory: 'disabilities includes "auditory"',
    'Physical/Motor': 'disabilities includes "physical"',
    Visual: 'disabilities includes "visual"',
    'Rating (instance)': 'rating',
    'Principle (instance)': 'principle',
    'Contrast (Minimum) (text)': 'title',
    'Understanding SC 1.4.3 ↗ (text)': 'link',
    'Details rows': 'node / colors / actual / required / whyItFails / howToFix / themes',
    'Sample (preview row)': 'colors + sampleText / sampleCaption',
    'Ratio (preview row)': 'ratio',
    'Ignore / Annotation / Select buttons': 'onIgnore / onAnnotate / onSelect',
    'Component 13/14/15 (Theme instances)': 'themes',
    Placeholder: 'preview',
    'Check preview (Type Compare / Target Preview / Vision Sim Grid)': 'typeCompare (text) / target (touch) / vision (vision)',
  },

  derivedGaps: {
    '--bb-derived-wcag-card-frame-1430102700-width': 'The frame that wraps the "Understanding SC 1.4.3" label in the Mode=colors link row; the link label hugs its own text in code.',
    '--bb-derived-wcag-card-frame-1430102700-height': 'The frame that wraps the "Understanding SC 1.4.3" label in the Mode=colors link row; its height is the label line (font/line-caption), which the link already reads.',
    '--bb-derived-wcag-card-root-width': 'Desktop-mock width (465). The card is fluid: it fills its column at every plugin window size, and stacks row labels over values below 400 px (container query).',
    '--bb-derived-wcag-card-row-label-mode-touch-target-height': 'Rows size from the text line-height and values fill the row, as for the Mode=colors row-label / row-value tokens.',
    '--bb-derived-wcag-card-row-value-mode-touch-target-height': 'Rows size from the text line-height and values fill the row, as for the Mode=colors row-label / row-value tokens.',
    '--bb-derived-wcag-card-row-value-mode-touch-target-width': 'Rows size from the text line-height and values fill the row, as for the Mode=colors row-label / row-value tokens.',
    '--bb-derived-wcag-card-row-label-mode-vision-height': 'Rows size from the text line-height and values fill the row, as for the Mode=colors row-label / row-value tokens.',
    '--bb-derived-wcag-card-row-value-mode-vision-height': 'Rows size from the text line-height and values fill the row, as for the Mode=colors row-label / row-value tokens.',
    '--bb-derived-wcag-card-row-value-mode-vision-width': 'Rows size from the text line-height and values fill the row, as for the Mode=colors row-label / row-value tokens.',
    '--bb-derived-wcag-card-spacer-width': 'The 108px Spacer pushes the Occurrences / "Understanding SC" column to the right of the criterion row; code does that with flex (margin-inline-start: auto), so the pinned width is not read.',
    '--bb-derived-wcag-card-line-61-width': 'Figma pins the divider Lines to the card inner width (437px); code uses .bb-wcag-card__divider { width: 100% } so they stretch with the card instead of re-pinning on every resize.',
    '--bb-derived-wcag-card-line-62-width': 'as line-61 — full-bleed rule, stretched rather than pinned.',
    '--bb-derived-wcag-card-line-64-width': 'as line-61 — .bb-wcag-card__divider--fix (the Body rule under the Fix row) stretches to the body width rather than pinning 437px.',
    '--bb-derived-wcag-card-row-label--1-height': 'Row Node\'s label box (419:44972, 80x15; seven layers are named "Row label"). Rows size from the text line-height rather than a pinned height, like the baselined row-label heights.',
    '--bb-derived-wcag-card-row-value--1-width': 'Row Colors\' value box (419:45060, 166x12.6; five layers are named "Row value"). Values fill the row (flex) and size from the text line-height, like the baselined row-value sizes.',
    '--bb-derived-wcag-card-row-value--1-height': 'Row Colors\' value box (419:45060, 166x12.6; five layers are named "Row value"). Values fill the row (flex) and size from the text line-height, like the baselined row-value sizes.',
  },
  figmaGaps: {
    ...scaleGaps('icon/size/sm'),
    'icon/size/lg': 'Bound on the go-to-main-component icon after the Mode=colors "Understanding SC" link (24 × 24). Open mismatch: code draws the open-link glyph at the label line height (font/line-caption) through .bb-wcag-card__link-icon.',
    ...scaleGaps('type/size/24', 'type/line/32', 'space/inset-lg-alt', 'font/weight-regular', 'font/weight-strong', 'type/line/15', 'font/weight-medium', 'dimension/stroke/0_7', 'dimension/radius/2_79', 'dimension/space/2_79', 'dimension/space/5_57', 'dimension/space/28', 'dimension/space/20', 'type/size/20', 'type/line/20', 'font/line-body', 'dimension/space/3'),
    'a11y/space/section': 'consumed by the composed TypeCompare / TargetPreview / VisionSimGrid "Check preview"',
    'a11y/space/inline': 'consumed by the composed TypeCompare / TargetPreview / VisionSimGrid "Check preview"',
    'principle/operable/bg': 'consumed by the composed PrincipleTag (Mode=Touch target shows the Operable tag)',
    'font/size-caption': 'the theme-chip labels (Theme › String, overridden to 10px Noto Sans on 2026-10-11) — rendered by the composed ThemeChip, not WcagCard.css',
    // The 2026-09-23 set binds the new sections to the semantic scale. Each of these is read by
    // the composed child that renders that section, not by WcagCard.css — verified by grepping
    // src/shared/ui for the CSS var.
    'border/accent': 'consumed by the composed MetaBadge (the Change pill border)',
    'border/subtle': 'consumed by the composed CodeSnippet, FixRow, ManualReview, MetaBadge and Thumbnail',
    'feedback/danger': 'consumed by the composed MetaBadge (Severity) and BrandModeChip (--bb-feedback-danger)',
    'feedback/warning': 'consumed by the composed IgnoreBanner and MetaBadge (--bb-feedback-warning)',
    'radius/lg': 'consumed by the composed CodeSnippet, FixRow, IgnoreBanner, ManualReview and MetricsPanel',
    'radius/pill': 'consumed by the composed MetaBadge (Severity / Change pills) and BrandModeChip',
    'space/inline-sm': 'consumed by every composed section that lays out inline content (MetaBadge, FixRow, ThumbnailPair, …)',
    'space/inset-md': 'consumed by the composed CodeSnippet, FixRow, IgnoreBanner, ManualReview and MetricsPanel',
    'space/inset-sm': 'consumed by the composed BrandModes, CodeSnippet and ManualReview',
    'dimension/space/4': 'the Brand modes frame carries this as vertical padding in Mode=colors; code renders <BrandModes> straight into __sections, which already spaces its children with --bb-wcag-card-gap. Add a wrapper element if the 4px inset has to be exact.',
    'principle/perceivable/bg': 'consumed by the composed PrincipleTag',
    'icon/glyph/default': 'glyph fills/strokes inside the composed PrincipleTag and DisabilityIndicator instances; the composed components colour their glyphs through their own icon tokens',
    'rating/bg/default': 'the three theme-chip labels are overridden to the rating background colour in Figma (a mis-binding: text painted in the chip-background blue); the composed ThemeChip keeps theme-card/label/fg. Rebind in Figma to close.',
    'disability-indicator/border/default': 'consumed by the composed DisabilityIndicator',
    'disability-indicator/icon/color': 'Figma overrides the Rating instance fill with the disability glyph colour; code keeps rating/bg/default from the composed Rating so the level chip stays brand-coloured.',
    'theme-card/border/default': 'consumed by the composed ThemeChip',
    // 2026-09-23 (brand switch moved into Brand UI): the Occurrences, Metrics, Fix, Snippet,
    // Ignored, Token and Brand-modes layers bind the tier 1 app tokens. Each is read by the
    // composed child that renders that section.
    'text/primary': 'consumed by the composed Occurrences (Count), MetricCell (Value), FixRow (Label), CodeSnippet (Code) and IgnoreBanner (Reason)',
    'text/secondary': 'consumed by the composed Occurrences (Label), TokenRef (Name), FixRow (Hex), CodeSnippet (Language) and MetaBadge',
    'text/accent': 'consumed by the composed MetaBadge (Change label), Occurrences (Select all), FixRow and CodeSnippet links, plus the Restore LinkButton in IgnoreBanner',
    'surface/sunken': 'consumed by the composed TokenRef (Mode chip), BrandModeChip, CodeSnippet, IgnoreBanner, ManualReview and Thumbnail',
    'surface/accent-strong': 'the Fix row Sample chip in Figma is a placeholder swatch; FixRow paints the chip with the real suggested pair at runtime (style={{ background: on, color: hex }})',
    'text/on-accent': 'as surface/accent-strong — the "Aa" inside the Sample chip takes the suggested foreground colour at runtime, not a token',
  },
  /**
   * The eleven card-level gaps from the 2026-09-23 market analysis, drawn into
   * the Figma set on the same day as BOOLEAN properties that all default to
   * false — so every existing instance is unchanged. Layer visibility is bound
   * to the property; `Mode=Text` additionally leaves `Metrics` unbound and
   * always visible, which is what `mode="text"` does in code.
   *
   * These sections style themselves from the semantic scale only, so no new
   * --bb-derived-* tokens appear until `npm run figma:pull` re-snapshots the
   * set. Run that (relay backend) before trusting figma/components.json again.
   */
  gapProps: {
    /** Figma 2026-09-23: the set is now Mode=colors / Mode=Text, and the two booleans the
     *  earlier notes said were dropped are in fact still there. */
    Mode: 'mode — Figma "colors" | "Text" | "Touch target" | "Vision" → code "colors" | "text" | "touch" | "vision"',
    'Show fix': 'fix',
    'Show manual review': 'manualChecks',
    'Show severity': 'severity',
    'Show change': 'change (its "Last seen" text layer → lastSeen)',
    'Show occurrences': 'occurrences',
    'Show tokens': 'nodeToken + colors.fgToken + colors.bgToken',
    'Show brand modes': 'brandModes',
    'Show metrics': 'metrics — bound in Mode=Colors, unbound and always on in Mode=Text',
    'Show thumbnails': 'thumbnail + thumbnailAfter',
    'Show snippet': 'snippet',
    // 2026-10-11: the Fix row is bound to "Show fix" in both modes (it was unbound before). Code
    // still keeps text mode fix-free, which matches every Mode=Text instance in the file (Show fix off).
    Fix: 'fix (mode === "colors" only)',
    // No boolean either: Figma always draws this Body rule under the Fix row in Mode=colors (absent
    // from Mode=Text). `fix` is optional in code, so the rule rides with the rendered Fix row instead
    // of sitting alone on the footer border.
    'Line 64': 'mode === "colors" && fix',
    'Show ignored': 'ignored',
    Annotated: "annotation.state === 'placed'",
  },
  notes: '2026-09-23: Mode=Text was a byte-copy of Mode=Colors; it is now rebuilt from the finished Colors variant with the colour Preview row hidden and the Metrics panel shown. A later pass reordered Mode=Colors — Details → Metrics → divider → Brand modes → Thumbnails → Placeholder, with the Fix row moved below the colour Preview row — and dropped the "Show fix" and "Show manual review" booleans: Fix is now always on in Mode=Colors, and the manual-review list (manualChecks) stays code-only. Metrics is bound in Mode=Colors instead of being a Text-only section, so the panel rides along with the swatch pair. Both variants hug vertically so the optional sections can grow the card. The Principle tag is absolutely positioned at the card corner while Rating flows to the end of the header. The Occurrences roll-up and the "Understanding SC" link now share one right-hand column (40000163:15844) instead of sitting on the criterion row. The last row is labelled "How to fix" twice in Figma; code labels the theme row "Themes" by default (themesLabel). 2026-10-11 audit: every property is now bound in both modes (Mode=Text had none), "Show fix" and "Show manual review" are bound again (Manual review layer added to Mode=colors, default false), the Cognitive/Auditory indicator bindings are no longer crossed, "Requried"/"How ti fix" are renamed "Required"/"How to fix", and all text is Noto Sans (wcag-card/font/family) at 10px minimum — the Code Snippet body stays mono.',
} as const
