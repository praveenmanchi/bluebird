/** Figma ↔ code contract for VoiceWave ("Voice Wave" 40000295:8509). */
export const figma = {
  setId: '40000295:8509',
  name: 'Voice Wave',
  props: {
    State: 'state (Idle / Listening / Speaking)',
  },
  figmaGaps: {},
  notes: 'Created 2026-10-09 for the AI Agents tab. Nine Bar rectangles (agents/radius/pill) in a FIXED 60 × 28 frame, MIN-aligned with agents/space/hair gaps. Bar heights per state are unbound Figma geometry, read from --bb-derived-voice-wave-bar-<n>-state-<state>-height. Fills: Idle agents/wave/idle, Listening agents/wave/active, Speaking agents/wave/speaking. Listening/Speaking pulse (reduced motion: still); `levels` (0–1 per bar) drives live heights from audio, floored at the idle dot height.',
} as const
