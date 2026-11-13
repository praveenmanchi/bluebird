import { UXAI_BOT_DERIVED } from './figmaDerived'

/** Figma ↔ code contract for UxaiBot ("UX AI Bot" 40002611:72953). */
export const figma = {
  setId: '40002611:72953',
  name: 'UX AI Bot',
  props: {
    State: 'state (Ready / Searching / Answering)',
    'Size (instance size only in Figma)': "size ('20' beside an answer / '40' on its own)",
  },
  figmaGaps: { 'persona/bird/beak': "Painted by the shared Robot (BotAvatar), which this component composes: BotAvatar.css reads it.", 'persona/bird/pupil': "Painted by the shared Robot (BotAvatar), which this component composes: BotAvatar.css reads it.", 'icon/size/lg': "Bound on the chest or prop Icon instance's Size variant; the Icon component reads icon/size/* and the artwork scales the instance inside the frame." },
  derivedGaps: Object.fromEntries(UXAI_BOT_DERIVED.map((token) => [token, "Artwork box, fill or stroke; the component draws the scene as SVG through the shared Robot and scenes data, so the value lives in the SVG, not in CSS."])),
  notes: 'Created 2026-11-07, chosen on the UX AI concepts page (40002611:6395). Composes the BotAvatar robot through Robot.tsx, so the two cannot drift. Ready has no bubble and stands at full size; Searching and Answering step back to .82 and show the bubble. Colours: body + bubble outline + dots + lines = uxai/orb/core, bubble fill = persona/bird/eye. Motion is off under prefers-reduced-motion.',
} as const
