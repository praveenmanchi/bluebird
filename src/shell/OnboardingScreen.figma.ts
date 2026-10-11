const composed = (what: string) => `Bound on the nested ${what} instance; the composed component consumes it.`
const button = composed('Button (Button.css)')
const sceneLayer = 'A layer of the Accessibility demo scene. Its resting value in Figma is the frame where the animation starts; code draws the scene from components and plays it with CSS keyframes (OnboardingScreen.css, onboarding/stage.tsx).'
const animatedOpacity = 'Resting opacity of an animated layer (0 so the static frame shows the end state). Code animates it with CSS keyframes instead of reading a resting value.'
const hug = 'Hug / fill size of a composed instance; code lets the component size itself in the flex row.'
const stroke = 'The composed component draws its own border width; the tour frame chrome uses onboarding/border-width.'

/** Figma ↔ code contract for the product tour (frames, not a component set). */
export const figma = {
  setId: '40000423:5240',
  name: 'Onboarding · 2 · Accessibility',
  props: {
    'Header › Logo': 'BrandLogo of the signed-in brand (Figma shows Brand=bridge)',
    'Tab list': 'The persona’s tabs that have a demo + Settings; the explained tab is active (label, fill, Indicator). Clicking a tab jumps to its step.',
    'Video · <step>': 'The step’s demo scene (onboarding/scenes/*) — real components on a CSS timeline, cursor path measured from the targets',
    'Step counter': 'stepCounter(index, total) — “02 / 07”',
    'Title / Description': 'Step copy (onboarding/steps.ts)',
    'Progress': 'One dot per step; the active dot widens to onboarding/dot/width-active. Dots are buttons.',
    'Skip / Back / Next': 'Skip finishes as skipped; Back is disabled on the first step; Next → “Get started” on the last step',
  },
  figmaGaps: {
    'button/primary/bg/default': button, 'button/primary/border/default': button, 'button/primary/radius': button, 'button/primary/gap': button,
    'button/primary/padding-x': button, 'button/primary/width-md': button, 'button/primary/height': button,
    'button/secondary/bg/default': button, 'button/secondary/border/default': button, 'button/secondary/radius': button, 'button/secondary/gap': button,
    'button/secondary/padding-x': button, 'button/secondary/height': button,
    'rating/bg/default': composed('Rating (Rating.css)'), 'rating/radius': composed('Rating (Rating.css)'),
    'feedback/success': composed('Brand Mode Chip / Check Item'), 'feedback/danger': composed('Brand Mode Chip / Check Item'),
    'radius/pill': composed('Brand Mode Chip (BrandModeChip.css)'), 'space/inline-xs': composed('Brand Mode Chip (BrandModeChip.css)'),
    'space/inline-sm': composed('Brand Mode Chip (BrandModeChip.css)'), 'space/inset-xs': composed('Brand Mode Chip (BrandModeChip.css)'),
    'surface/sunken': composed('Brand Mode Chip (BrandModeChip.css)'), 'mcp/space/inline': composed('Check Item (CheckItem.css)'),
  },
  derivedGaps: {
    '--bb-derived-onboarding-screen-root-width': 'The frame is a 500×994 plugin mock; the tour fills the plugin window (S/M/L) and the demo scales to fit.',
    '--bb-derived-onboarding-screen-root-height': 'The frame is a 500×994 plugin mock; the tour fills the plugin window (S/M/L) and the demo scales to fit.',
    '--bb-derived-onboarding-screen-icon-width': 'Tab icon instances are rescaled 24 → 16 in Figma; code sizes them with onboarding/icon/size-sm (16).',
    '--bb-derived-onboarding-screen-icon-height': 'Tab icon instances are rescaled 24 → 16 in Figma; code sizes them with onboarding/icon/size-sm (16).',
    '--bb-derived-onboarding-screen-indicator-width': 'Absolute layer sized to the active tab in Figma; code insets it by onboarding/gap/xs on both sides so it follows any label.',
    '--bb-derived-onboarding-screen-dot-2-accessibility-width': 'The active dot’s width; code reads onboarding/dot/width-active (the same 18) for whichever dot is active.',
    '--bb-derived-onboarding-screen-back-width': hug, '--bb-derived-onboarding-screen-skip-width': hug, '--bb-derived-onboarding-screen-next-width': 'Next fills the nav row in Figma; code gives it flex 1.',
    '--bb-derived-onboarding-screen-back-stroke-width': stroke, '--bb-derived-onboarding-screen-skip-stroke-width': stroke, '--bb-derived-onboarding-screen-next-stroke-width': stroke,
    '--bb-derived-onboarding-screen-tab-list-stroke-width': 'Same 1 as onboarding/border-width, which the tab list reads.',
    '--bb-derived-onboarding-screen-video-accessibility-stroke-width': 'Same 1 as onboarding/border-width, which the media frame reads.',
    '--bb-derived-onboarding-screen-selected-frame-stroke-width': sceneLayer,
    '--bb-derived-onboarding-screen-scan-button-stroke-width': sceneLayer, '--bb-derived-onboarding-screen-mock-button-stroke-width': sceneLayer,
    '--bb-derived-onboarding-screen-rating-width': sceneLayer, '--bb-derived-onboarding-screen-rating-height': sceneLayer,
    '--bb-derived-onboarding-screen-rating-padding-left': sceneLayer, '--bb-derived-onboarding-screen-rating-padding-right': sceneLayer,
    '--bb-derived-onboarding-screen-scanner-width': sceneLayer, '--bb-derived-onboarding-screen-scan-line-width': sceneLayer,
    '--bb-derived-onboarding-screen-finding-fail-width': sceneLayer, '--bb-derived-onboarding-screen-finding-fail-height': sceneLayer,
    '--bb-derived-onboarding-screen-finding-fixed-width': sceneLayer, '--bb-derived-onboarding-screen-finding-fixed-height': sceneLayer,
    '--bb-derived-onboarding-screen-finding-pass-width': sceneLayer, '--bb-derived-onboarding-screen-finding-pass-height': sceneLayer,
    '--bb-derived-onboarding-screen-finding-warning-width': sceneLayer, '--bb-derived-onboarding-screen-finding-warning-height': sceneLayer,
    '--bb-derived-onboarding-screen-finding-fail-opacity': animatedOpacity, '--bb-derived-onboarding-screen-ripple-opacity': animatedOpacity,
    '--bb-derived-onboarding-screen-scanner-opacity': animatedOpacity, '--bb-derived-onboarding-screen-scan-line-opacity': animatedOpacity,
    ...Object.fromEntries(['bridge', 'ikea', 'richemont', 'disney', 'fiskars'].flatMap((b) => [
      [`--bb-derived-onboarding-screen-chip-${b}-width`, hug], [`--bb-derived-onboarding-screen-chip-${b}-height`, hug], [`--bb-derived-onboarding-screen-chip-${b}-stroke-width`, stroke],
    ])),
  },
  codeOnly: {
    steps: 'Figma draws all 9 steps (Welcome, 7 tabs incl. Publish, Setup). Code builds the tour from the persona’s tabs: Welcome → each tab with a demo → Setup, so the counter reads “02 / 07” for Product Designer. Publish has no tab in any persona and is left out.',
    persistence: 'onboarding:status / onboarding:complete (src/sandbox/onboarding.ts, clientStorage `bluebird:onboarding`). Shown once after sign-in; Reset all Settings brings it back; Settings › Product tour › Replay tour reopens it.',
    keyboard: '← / → move between steps, Esc skips.',
    motion: 'Demos loop every 6 s + 1.5 s rest. prefers-reduced-motion freezes them on their end state.',
    fit: 'At window size S the demo scales down to fit the media frame (Stage measures and scales).',
  },
  notes: 'Contract frame is the Accessibility step; the other eight Onboarding frames share its chrome and tokens. The Tokens demo draws its fix rows from TokenRef instead of Figma’s Change Row (a Publish component not built in code).',
} as const
