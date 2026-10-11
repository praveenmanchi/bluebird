/** Figma ↔ code contract for Stepper ("Stepper" 40000275:8142). */
export const figma = {
  setId: '40000275:8142',
  name: 'Stepper',
  props: {
    'Step 1–4 (Step instances)': 'steps[] (label, number) + current (State: before = Done, at = Current, after = Upcoming)',
  },
  figmaGaps: {
    'mcp/space/inline': 'Bound on the nested Step instances (their Index ↔ Label gap); rendered by the composed <Step>, whose Step.css consumes it.',
  },
  derivedGaps: {
    '--bb-derived-stepper-connector-width': 'Canvas artefact of FILL sizing: each Connector takes an even share of the free width (221 = (1000 − four hugging steps − six gaps) ÷ 3). The code reproduces the rule with flex-grow, so the number would only be right at exactly 1000 wide with these labels.',
  },
  notes: 'Created 2026-10-09 for the MCP tab. The set has no component properties; the four Step instances override Label/Number/State, which `steps` + `current` reproduce (default current = 2 → Select ✓, Check ✓, Generate, Ship). Rendered as an <ol>; each connector sits in the <li> of the step it leads to. Figma oddity: Step 2 overrides Number to "1" — invisible because Done draws the check mark.',
} as const
