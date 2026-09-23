/** Figma ↔ code contract for WcagCard ("WCAG Card" set 40000141:9570 —
 *  Mode=colors 419:39993, Mode=Text 40000141:9571). */
export const figma = {
  setId: '40000141:9570',
  name: 'WCAG Card',
  props: {
    WCAG: 'code',
    Node: 'node',
    Actual: 'actual',
    Requried: 'required',
    'Check content': 'checks includes "content"',
    'check Design': 'checks includes "design"',
    'check code': 'checks includes "code"',
    'why it fails': 'whyItFails',
    'How ti fix': 'howToFix',
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
  },

  derivedGaps: {
    '--bb-derived-wcag-card-line-61-width': 'Figma pins the divider Lines to the card inner width (437px); code uses .bb-wcag-card__divider { width: 100% } so they stretch with the card instead of re-pinning on every resize.',
    '--bb-derived-wcag-card-line-62-width': 'as line-61 — full-bleed rule, stretched rather than pinned.',
    '--bb-derived-wcag-card-line-64-width': 'as line-61 — full-bleed rule, stretched rather than pinned.',
  },
  figmaGaps: {
    // The 2026-09-23 set binds the new sections to the semantic scale. Each of these is read by
    // the composed child that renders that section, not by WcagCard.css — verified by grepping
    // src/shared/ui for the CSS var.
    'border/accent': 'consumed by the composed FixRow and MetaBadge (the Change pill border)',
    'border/subtle': 'consumed by the composed CodeSnippet, FixRow, ManualReview, MetricsPanel and Thumbnail',
    'color/status/danger/500': 'consumed by the composed MetaBadge (Severity) and BrandModeChip',
    'color/status/warning/500': 'consumed by the composed IgnoreBanner and MetaBadge',
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
    Mode: 'mode ("colors" | "text")',
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
    // No boolean: the Fix row is always on in Mode=colors, absent from Mode=Text.
    Fix: 'fix',
    'Show ignored': 'ignored',
    Annotated: "annotation.state === 'placed'",
  },
  notes: '2026-09-23: Mode=Text was a byte-copy of Mode=Colors; it is now rebuilt from the finished Colors variant with the colour Preview row hidden and the Metrics panel shown. A later pass reordered Mode=Colors — Details → Metrics → divider → Brand modes → Thumbnails → Placeholder, with the Fix row moved below the colour Preview row — and dropped the "Show fix" and "Show manual review" booleans: Fix is now always on in Mode=Colors, and the manual-review list (manualChecks) stays code-only. Metrics is bound in Mode=Colors instead of being a Text-only section, so the panel rides along with the swatch pair. Both variants hug vertically so the optional sections can grow the card. The Principle tag is absolutely positioned at the card corner while Rating flows to the end of the header. The Occurrences roll-up and the "Understanding SC" link now share one right-hand column (40000163:15844) instead of sitting on the criterion row. The four visibility bindings are crossed in Figma (the Auditory indicator is toggled by "Cognitive" and vice versa); code maps each boolean to its own indicator kind. The last row is labelled "How to fix" twice in Figma; code labels the theme row "Themes" by default (themesLabel).',
} as const
