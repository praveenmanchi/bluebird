const dataDriven = 'Data-driven: the Fill width is `value`% of the track, set inline at runtime. Figma draws one variant per Value only because instance resizes are ignored by the plugin API, so each per-variant width is a sample of the same rule (width = Value% × 320).'

/** Figma ↔ code contract for ProgressBar ("Progress Bar" 40000275:8128). */
export const figma = {
  setId: '40000275:8128',
  name: 'Progress Bar',
  props: {
    Tone: 'tone (Success / Warning / Danger)',
    Value: 'value (0–100 number, clamped; the Figma options 92/70/58/25/50/64/75/100 are samples)',
  },
  figmaGaps: {},
  derivedGaps: {
    '--bb-derived-progress-bar-fill-tone-success-value-92-width': dataDriven,
    '--bb-derived-progress-bar-fill-tone-warning-value-70-width': dataDriven,
    '--bb-derived-progress-bar-fill-tone-danger-value-58-width': dataDriven,
    '--bb-derived-progress-bar-fill-tone-success-value-25-width': dataDriven,
    '--bb-derived-progress-bar-fill-tone-success-value-50-width': dataDriven,
    '--bb-derived-progress-bar-fill-tone-success-value-64-width': dataDriven,
    '--bb-derived-progress-bar-fill-tone-success-value-75-width': dataDriven,
    '--bb-derived-progress-bar-fill-tone-success-value-100-width': dataDriven,
  },
  notes: 'Created 2026-10-09 for the MCP tab. role="progressbar" with aria-valuenow/min/max; pass aria-label (or aria-labelledby) to name it. The track is FIXED 320 in the set and FILL inside Readiness Meter, which stretches it to its own width.',
} as const
