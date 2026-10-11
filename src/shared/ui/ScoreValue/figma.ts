/** Figma ↔ code contract for ScoreValue ("Score Value" 40000446:8644). */
export const figma = {
  setId: '40000446:8644',
  name: 'Score Value',
  props: { Tone: 'tone (scoreTone(value) when omitted)', Score: 'score (defaults to value%)', Label: 'label' },
  notes: 'Created 2026-10-11. Thresholds from the Figma description: ≥80 Success, ≥60 Warning, else Danger; Empty before a scan.',
} as const
