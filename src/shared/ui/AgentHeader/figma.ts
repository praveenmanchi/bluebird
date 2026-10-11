const chip = 'Bound on the nested Context Chip instances (Chips row); the composed <ContextChip> consumes it in ContextChip.css.'
const badge = 'Bound on the nested Meta Badge ("Status") instance; the composed <MetaBadge> consumes it in MetaBadge.css.'

/** Figma ↔ code contract for AgentHeader ("Agent Header" 40000296:8380). */
export const figma = {
  setId: '40000296:8380',
  name: 'Agent Header',
  props: {
    Name: 'name',
    Purpose: 'purpose',
    'Bot (Bot Avatar instance, Agent=Accessibility, State=Working)': 'agent + botState',
    'Chips (2 × Context Chip, Type=Citation)': 'chips',
    'Status (Meta Badge instance, Tone=Accent, Label=Running)': 'status + statusTone',
  },
  figmaGaps: {
    'uxai/chip/bg': chip,
    'uxai/chip/border': chip,
    'uxai/radius/chip': chip,
    'uxai/space/tight': chip,
    'uxai/space/inline': chip,
    'uxai/space/hair': chip,
    'border/accent': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
  },
  derivedGaps: {
    '--bb-derived-agent-header-context-chip-stroke-width': 'Stroke of the nested Context Chip instances; ContextChip.css reads its own --bb-derived-context-chip-root-stroke-width.',
    '--bb-derived-agent-header-status-stroke-width': 'Stroke of the nested Meta Badge instance; MetaBadge.css draws it with --bb-border-width-default (same 1).',
  },
  notes: 'Created 2026-10-09 for the AI Agents tab. Composes BotAvatar, ContextChip and MetaBadge. The root is FIXED 640 × 60 in Figma but its Text frame is 83 high, so code uses 60 as min-height. The Bot instance binds agents/size/bot (40) on width/height yet renders 56 × 56 in Figma — code follows the render (1.4 × agents/size/bot); design should add an agents/size/bot-lg token or drop the resize. Name has no line-height binding (auto). The avatar is decorative here (the Name heading names the agent).',
} as const
