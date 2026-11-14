import { scaleGaps } from '../../brand/scaleGaps'
const badge = 'Bound on the nested "Change" Meta Badge instance (Tone=Accent, Label "Modified"); the composed <MetaBadge> (MetaBadge.css) consumes it.'

/** Figma ↔ code contract for ChangelogNote ("Changelog Note" 40000345:8607). */
export const figma = {
  setId: '40000345:8607',
  name: 'Changelog Note',
  props: {
    Title: 'title',
    Note: 'note (+ editing / onNoteInput for the in-place TextArea)',
    State: 'state (Auto → auto / Edited → edited)',
    'Change (Meta Badge instance) › Label + Tone': 'change (added → Added/Success, modified → Modified/Accent, removed → Removed/Danger, deprecated → Deprecated/Warning)',
    'Action (Link Button instance) › Label': 'actionLabel + onAction (Edit for Auto, Done for Edited or while editing)',
    'Source text (not a Figma prop)': 'source override (defaults to the per-State copy)',
  },
  figmaGaps: {
    ...scaleGaps('dimension/space/2', 'border-width/default'),
    'border/accent': badge,
    'radius/pill': badge,
    'space/inline-xs': badge,
    'space/inline-sm': badge,
    'space/inset-xs': badge,
  },
  derivedGaps: {},
  notes: 'Created 2026-10-11 for the Publish tab. Both variants draw the same Modified / Accent Change badge; `change` maps the four Publish change kinds to Meta Badge Label + Tone (ChangeKind is a local copy of the shared Publish type). The Action Link Button reads "Edit" in State=Auto and "Done" in State=Edited, as drawn. Figma has no editing variant: `editing` swaps the Note text for a <TextArea> (aria-label "Changelog note for <title>"), forces the action to "Done" and reuses the Edited selected border. The Source line is fixed copy per State (meta colour for Auto, accent for Edited). The Header Title is assumed to fill (it is a text node without recorded sizing), which pushes the Action link to the trailing edge and lets long paths ellipsise. The 1 root stroke and FIXED 600 width are raw in Figma and read through --bb-derived-changelog-note-root-*; the width caps at 100% of narrower panels.',
} as const
