const orb = 'Bound on the nested Thinking Orb in the last Figma snapshot. Figma now nests UX AI Bot, so this goes at the next figma:pull.'

/** Figma ↔ code contract for Message ("Message" 40000284:8190). */
export const figma = {
  setId: '40000284:8190',
  name: 'Message',
  props: {
    Role: 'role (User / Assistant)',
    Text: 'text',
    'Bot (UX AI Bot: State=Ready, 20)': 'botState (size fixed at 20)',
    'Rich content below the text (code only)': 'children',
  },
  figmaGaps: {
    'uxai/surface/sunken': orb,
    'uxai/radius/pill': orb,
    'uxai/size/orb-sm': orb,
  },
  notes: 'Created 2026-10-09 for the UX AI tab. Assistant composes UxaiBot (Ready, 20; `botState` lets a streaming answer switch it to Answering). `children` is the slot for artifacts below the text — Figma draws text only. The root is FIXED 640 × 40 in Figma (derived); the code reads them as max-width and min-height so long answers and artifacts grow the row. Text keeps line breaks (pre-wrap).',
} as const
