// Every Figma variant exports its own vector bounding boxes (Body, Face per Agent × State; Pupil,
// Sheen, Motion, Zzz shared). Those boxes are what the SVG path data in geometry.ts already draws:
// the paths were copied from the same Figma vectors inside the 40-unit frame, and the frame scales
// as one through agents/size/bot. A CSS width/height cannot reshape a path, so reading the boxes
// would double-specify the geometry rather than consume it.
const AGENTS = ['accessibility', 'content', 'design-system', 'localization', 'spelling', 'writing'] as const
const STATES = ['default', 'sleeping', 'working'] as const
const vector = 'Vector bounding box; the shape is drawn by the path data in geometry.ts (copied from this Figma vector, 40-unit frame scaled by agents/size/bot). A CSS box size cannot reshape an SVG path.'

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
  figmaGaps: {},
  derivedGaps: { ...perVariant, ...shared },
  notes: 'Created 2026-10-09 for the AI Agents tab. Paths copied from the Figma vector exports of all 18 variants: the Working body is the resting body tilted ~6° (baked into the path, as in Figma); Writing/Working overhangs the frame by 1.0992 on the left, kept via a translate. Colours: body + pupils + Motion = agents/bot/<agent> (via currentColor), eyes / face lines / sheen = agents/bot/face, Zzz = agents/text/meta, every stroke = agents/face-stroke. Animation follows the set description (Default glances, Working hops, Sleeping dozes) and is off under prefers-reduced-motion.',
}
