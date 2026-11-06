// Shared reason for figma.ts contracts. Since the 2026-11-06 variable audit every Figma value is
// bound, so a layer can bind a scale variable (space/*, font/*, dimension/*, type/*, border-width)
// while the component reads a component-tier token of the same value, or leaves the layer to a
// composed child that reads it. Used by figma.ts contracts only.

const REASON = 'Figma binds this on a layer the component draws through a component-tier token of the same value, or through a composed child component that reads it.'

/** Scale variables a component does not read by name, each with the shared reason. */
export function scaleGaps(...names: readonly string[]): Record<string, string> {
  return Object.fromEntries(names.map((name) => [name, REASON]))
}
