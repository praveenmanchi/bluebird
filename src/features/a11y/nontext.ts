// WCAG 1.4.11 Non-text Contrast. Pure rules: no Figma, no DOM.
//
// The criterion asks for 3:1 on "user interface components and graphical
// objects". A Figma tree cannot tell you what is a component and what is
// decoration, so this checks the one case that is both unambiguous and the
// commonest real failure: a visible border that is too faint to see.

/** Every 1.4.11 threshold is 3:1, at any size. */
export const NON_TEXT_MIN = 3

/**
 * Names that mark a node as decoration rather than a control boundary.
 * Decorative separators are explicitly out of scope for 1.4.11, and dividers
 * are the single biggest source of false positives on a stroke check.
 */
const DECORATIVE = /(^|[^a-z])(divider|separator|rule|hairline|grid|guide|shadow|glow|decorative|background|bg)([^a-z]|$)/i

export function isDecorativeName(name: string): boolean {
  return DECORATIVE.test(name)
}

/** Does this stroke carry enough contrast to be seen against what it sits on? */
export function passesNonText(ratio: number): boolean {
  return ratio >= NON_TEXT_MIN
}
