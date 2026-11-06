import { BOT_AVATAR_DERIVED } from './figmaDerived'

// Every Figma variant exports its own vector bounding boxes. Those boxes are what the SVG path data in geometry.ts already draws:
// the paths were copied from the same Figma vectors inside the 40-unit frame, and the frame scales
// as one through agents/size/bot. A CSS width/height cannot reshape a path, so reading the boxes
// would double-specify the geometry rather than consume it.
const vector = 'Vector bounding box; the shape is drawn by the path data in geometry.ts (copied from this Figma vector, 40-unit frame scaled by agents/size/bot). A CSS box size cannot reshape an SVG path.'
const art = 'Opacity or stroke on a robot layer; geometry.ts draws the artwork, so the value lives in the SVG, not in CSS.'

/** Figma ↔ code contract for BotAvatar ("Bot Avatar" 40000295:8478). */
export const figma = {
  setId: '40000295:8478',
  name: 'Bot Avatar',
  props: {
    Agent: 'agent (Accessibility / Content / Writing / Spelling / Design System → design-system / Localization)',
    State: 'state (Default / Working / Sleeping)',
  },
  figmaGaps: Object.fromEntries(['border-width/default', 'dimension/opacity/20', 'dimension/opacity/35', 'dimension/opacity/70', 'dimension/opacity/72', 'dimension/opacity/85', 'dimension/stroke/0_83', 'dimension/stroke/1_47'].map((name) => [name, art])),
  derivedGaps: Object.fromEntries(BOT_AVATAR_DERIVED.map((token) => [token, vector])),
  notes: 'Created 2026-10-09 for the AI Agents tab; redrawn 2026-11-06 as the hover robot chosen on the Agent concepts page (40002575:6353). All agents share one body in geometry.ts; the chest Icon layer is a library icon per agent (EMBLEM). Colours: body + brackets = agents/bot/<agent> (via currentColor), eyes / scan / shield = persona/bird/eye, visor = persona/bird/pupil, thruster = persona/bird/beak, Zzz = icon/muted. The emblem takes the agent colour, or persona/bird/pupil on the pale Writing and Spelling. Motion is off under prefers-reduced-motion.',
}
