// Every Figma variant exports its own vector bounding boxes. Those boxes are what the SVG path data in geometry.ts already draws:
// the paths were copied from the same Figma vectors inside the 40-unit frame, and the frame scales
// as one through agents/size/bot. A CSS width/height cannot reshape a path, so reading the boxes
// would double-specify the geometry rather than consume it.
const AGENTS = ['accessibility', 'content', 'design-system', 'localization', 'spelling', 'writing'] as const
const STATES = ['default', 'sleeping', 'working'] as const
const vector = 'Vector bounding box; the shape is drawn by the path data in geometry.ts (copied from this Figma vector, 40-unit frame scaled by agents/size/bot). A CSS box size cannot reshape an SVG path.'
const oldBot = 'Layer of the old flat mascot. Figma now holds the hover robot, so this binding or token goes at the next figma:pull; update this file then.'

const perVariant = Object.fromEntries(
  AGENTS.flatMap((agent) => STATES.flatMap((state) => ['body', 'face'].flatMap((layer) => ['width', 'height'].map((prop) =>
    [`--bb-derived-bot-avatar-${layer}-agent-${agent}-state-${state}-${prop}`, vector] as const)))),
)
const shared = Object.fromEntries(
  ['motion', 'pupil', 'sheen', 'zzz'].flatMap((layer) => ['width', 'height'].map((prop) => [`--bb-derived-bot-avatar-${layer}-${prop}`, vector] as const)),
)

/** Figma ↔ code contract for BotAvatar ("Bot Avatar" 40000295:8478). */
export const figma = {
  setId: '40000295:8478',
  name: 'Bot Avatar',
  props: {
    Agent: 'agent (Accessibility / Content / Writing / Spelling / Design System → design-system / Localization)',
    State: 'state (Default / Working / Sleeping)',
  },
  figmaGaps: {
    'agents/bot/face': oldBot,
    'agents/text/meta': oldBot,
  },
  derivedGaps: { ...perVariant, ...shared, '--bb-derived-bot-avatar-sheen-opacity': oldBot },
  notes: 'Created 2026-10-09 for the AI Agents tab; redrawn 2026-11-06 as the hover robot chosen on the Agent concepts page (40002575:6353). All agents share one body in geometry.ts; the chest Icon layer is a library icon per agent (EMBLEM). Colours: body + brackets = agents/bot/<agent> (via currentColor), eyes / scan / shield = persona/bird/eye, visor = persona/bird/pupil, thruster = persona/bird/beak, Zzz = icon/muted. The emblem takes the agent colour, or persona/bird/pupil on the pale Writing and Spelling. Motion is off under prefers-reduced-motion.',
}
