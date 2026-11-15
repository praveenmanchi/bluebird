import { scaleGaps } from '../../../shared/brand/scaleGaps'
// Figma ↔ code contract for the Agent voice screen (frame, not a component set).
import { ROOT_HEIGHT, VOICE_BAR, composed, measured, ownedBy } from './figma-gaps'

export const figma = {
  setId: '40000299:6304',
  name: 'Agents body',
  props: {
    'Agent Header': 'AgentHeader, Status "Listening" (agent, phase)',
    Conversation: 'Message User/Assistant, Voice Wave notes, ThinkingStep list, PromptChip quick replies (onQuickReply), extra turns (turns)',
    'Voice Bar': 'VoiceBar Listening → Speaking → Idle (phase, onMic)',
  },
  figmaGaps: {
    ...scaleGaps('uxai/border-width', 'agents/face-stroke'),
    ...composed('PromptChip', ['uxai/chip/bg', 'uxai/chip/border', 'uxai/radius/pill', 'uxai/space/row-x', 'uxai/space/row-y']),
    ...composed('Message / ThinkingStep / PromptChip', ['uxai/space/inline']),
    ...composed('VoiceBar', [...VOICE_BAR, 'agents/space/row-x']),
  },
  derivedGaps: {
    '--bb-derived-agents-voice-root-height': ROOT_HEIGHT,
    ...measured([
      '--bb-derived-agents-voice-prompt-chip-yes-fix-the-width', '--bb-derived-agents-voice-prompt-chip-show-me-first-width', '--bb-derived-agents-voice-prompt-chip-create-jira-issues-width', '--bb-derived-agents-voice-prompt-chip-create-jira-issues-height',
      '--bb-derived-agents-voice-thinking-step-scope-checkout-flow-width', '--bb-derived-agents-voice-thinking-step-rules-1-4-width', '--bb-derived-agents-voice-thinking-step-found-6-issues-width', '--bb-derived-agents-voice-thinking-step-found-6-issues-height',
    ], 'Prompt Chip / Thinking Step label box'),
    ...ownedBy('PromptChip', ['--bb-derived-agents-voice-prompt-chip-stroke-width']),
    ...ownedBy('VoiceBar', ['--bb-derived-agents-voice-voice-bar-height', '--bb-derived-agents-voice-voice-bar-stroke-width']),
  },
  notes: 'Conversation is bottom-aligned (VERTICAL MAX) in Figma; code pushes the first turn down with margin-top: auto so older turns stay reachable when the thread scrolls. The spoken reply after "release to send" is fixture copy (not in Figma).',
} as const
