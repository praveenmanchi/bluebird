// Shared reasons for the figma.ts contract of a tab screen: a Figma frame (not a component set) that
// a tab renders from state and that is checked against the tab's own stylesheet. Most of what such a
// frame binds sits on composed design-system instances, whose own CSS reads it.

/** figmaGaps for variables bound only on composed instances of `component` (Figma names, comma-separated when several). */
export function composedBy(component: string, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, `Bound on the composed ${component} instance(s) only; that component's own CSS reads it.`]))
}

/** derivedGaps for the box of a composed instance. */
export function instanceBox(component: string, names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, `Box or raw value of the composed ${component} instance; the component sizes and draws itself.`]))
}

export const SCREEN = {
  root: 'The 600 × 616 body frame; the shell sizes the tab inside the 360–760 plugin window.',
  fill: 'FIXED at the 600 frame width (or the frame height) in Figma; in code the element fills its container.',
} as const
