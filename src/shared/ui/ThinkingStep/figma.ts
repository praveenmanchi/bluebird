import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for ThinkingStep ("Thinking Step" 40000284:8201). */
export const figma = {
  setId: '40000284:8201',
  name: 'Thinking Step',
  props: {
    Status: 'status (Done / Running)',
    Label: 'children',
  },
  figmaGaps: { ...scaleGaps('icon/size/sm') },
  notes: 'Created 2026-10-09 for the UX AI tab. The glyph is the shared "Status error icons" set (Icon): Done → Status=Good (status-good, coloured by its own connection/icon/ok fill), Running → Status=Retry (status-retry, icon/glyph/default). The Running glyph spins in code (CSS keyframes, off under prefers-reduced-motion); Figma shows it static. The status icon instance carries no size binding in Figma (raw 16); the code sizes it with uxai/size/icon (16).',
} as const
