const orb = 'Bound on the nested Thinking Orb ("Orb") instance; rendered by the composed <ThinkingOrb>, whose ThinkingOrb.css consumes it.'

/** Figma ↔ code contract for Message ("Message" 40000284:8190). */
export const figma = {
  setId: '40000284:8190',
  name: 'Message',
  props: {
    Role: 'role (User / Assistant)',
    Text: 'text',
    'Orb (Thinking Orb: State=Breathing, Size=20)': 'orbState (size fixed at 20)',
    'Rich content below the text (code only)': 'children',
  },
  figmaGaps: {
    'uxai/surface/sunken': orb,
    'uxai/radius/pill': orb,
    'uxai/size/orb-sm': orb,
  },
  notes: 'Created 2026-10-09 for the UX AI tab. Assistant composes ThinkingOrb (Breathing, 20; `orbState` lets a streaming answer switch it to Composing). `children` is the slot for artifacts below the text — Figma draws text only. The root is FIXED 640 × 40 in Figma (derived); the code reads them as max-width and min-height so long answers and artifacts grow the row. Text keeps line breaks (pre-wrap).',
} as const
