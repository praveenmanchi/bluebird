const glyph = 'Bounding box of the Mic glyph vector; the shape is the path in MicGlyph (copied from the Figma vector inside its 20 × 20 frame, which the CSS sizes from --bb-derived-voice-bar-mic-glyph-*). A CSS box size cannot reshape an SVG path.'

/** Figma ↔ code contract for VoiceBar ("Voice Bar" 40000296:8535). */
export const figma = {
  setId: '40000296:8535',
  name: 'Voice Bar',
  props: {
    State: 'state (Idle / Listening / Speaking) — also drives the nested Voice Wave state',
  },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-voice-bar-vector-width': glyph,
    '--bb-derived-voice-bar-vector-height': glyph,
  },
  notes: 'Created 2026-10-09 for the AI Agents tab. Composes VoiceWave (the Wave instance, State follows the bar). Transcript / Caption are not Figma properties; the per-state Figma copy is the default and `transcript` / `caption` override it. The Mic frame is a real <button> (onToggle, aria-pressed while listening). Listening has no bound stroke colour in the snapshot: Figma paints a gradient stroke whose stops are the uxai/beam/1–5 variables (the UX AI Beam), at the raw stroke weight 1.4 (= agents/face-stroke = uxai/beam-width) read from --bb-derived-voice-bar-root-state-listening-stroke-width; the gradient is a conic beam that slowly turns (still under reduced motion).',
} as const
