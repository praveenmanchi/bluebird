// Figma ↔ code contract for the Agents gallery screen (frame, not a component set).
import { BUTTON_PRIMARY, ROOT_HEIGHT, VOICE_BAR, composed, measured, ownedBy, segmentTabs } from './figma-gaps'

export const figma = {
  setId: '40000297:8491',
  name: 'Agents body',
  props: {
    Header: 'heading "UX AI agents" + subtitle, Button primary "Run all on scope" (onRunAll)',
    Scope: 'SelecterRow of SegmentTab "Tab selecters" (scope, onScope) + selection meta (scopeMeta)',
    Agents: 'six AgentCard instances (agents) in a wrapping grid; card or Run → onOpen, Stop → onStop',
    'Recent runs': 'BotAvatar + text + LinkButton "Open report" rows (recentRuns, onOpenReport)',
    'Voice Bar': 'VoiceBar Idle (onMic)',
  },
  figmaGaps: {
    ...composed('Button', BUTTON_PRIMARY),
    ...composed('AgentCard', ['agents/surface/panel', 'agents/surface/panel-border', 'agents/radius/panel', 'agents/space/row-x', 'agents/surface/running', 'agents/border/running']),
    ...composed('VoiceBar', VOICE_BAR),
  },
  derivedGaps: {
    '--bb-derived-agents-gallery-root-height': ROOT_HEIGHT,
    ...segmentTabs('gallery', ['selection', 'current-frame', 'section', 'whole-page'], ['selection']),
    ...measured(['--bb-derived-agents-gallery-button-width', '--bb-derived-agents-gallery-link-button-width', '--bb-derived-agents-gallery-link-button-height'], 'Button / Link Button label box'),
    ...ownedBy('Button', ['--bb-derived-agents-gallery-button-stroke-width']),
    ...ownedBy('AgentCard', ['--bb-derived-agents-gallery-agent-card-stroke-width']),
    ...ownedBy('VoiceBar', ['--bb-derived-agents-gallery-voice-bar-height', '--bb-derived-agents-gallery-voice-bar-stroke-width']),
  },
  notes: 'Tab label in Figma reads "UX UI agents" while the heading says "UX AI agents" — code uses "UX AI agents". The two Rows of three FILL cards become a grid whose column minimum is the card\'s Figma width (267.7), so three across at the design width and fewer in the 360–760 window. The Recent runs Bot Avatars bind agents/size/bot (40) yet are drawn at 20; code draws half of agents/size/bot.',
} as const
