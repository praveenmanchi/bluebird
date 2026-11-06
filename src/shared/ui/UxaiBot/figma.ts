/** Figma ↔ code contract for UxaiBot ("UX AI Bot" 40002611:72953). */
export const figma = {
  setId: '40002611:72953',
  name: 'UX AI Bot',
  props: {
    State: 'state (Ready / Searching / Answering)',
    'Size (instance size only in Figma)': "size ('20' beside an answer / '40' on its own)",
  },
  figmaGaps: {},
  notes: 'Created 2026-11-07, chosen on the UX AI concepts page (40002611:6395). Composes the BotAvatar robot through Robot.tsx, so the two cannot drift. Ready has no bubble and stands at full size; Searching and Answering step back to .82 and show the bubble. Colours: body + bubble outline + dots + lines = uxai/orb/core, bubble fill = persona/bird/eye. Motion is off under prefers-reduced-motion.',
} as const
