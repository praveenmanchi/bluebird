import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for PipelineNode ("Pipeline Node" 40000341:8511). */
export const figma = {
  setId: '40000341:8511',
  name: 'Pipeline Node',
  props: {
    Name: 'name',
    Meta: 'meta',
    Icon: 'icon (Tab Icons glyph) or logo (brands artwork, e.g. github)',
    Status: 'status (Done / Running / Error / Idle)',
    'Status icon (Status error icons / Spinner instance)': 'status → Icon status-good / Spinner accent / Icon status-error / none',
  },
  figmaGaps: { ...scaleGaps('icon/size/sm') },
  notes: 'Created 2026-10-11 for the Publish tab. The Icon instance swap defaults to Tab Icon "layers"; it also accepts the "brands" set (the Pipeline\'s Repository node swaps in githib), which code exposes as a separate `logo` prop rendered from the brand-logo artwork. The Status icon is a nested "Status error icons" instance (Done → Good, Error → error) coloured with the connection/icon/* tokens that set binds, a Tone=Accent Spinner in Running (login/spinner/size), and absent in Idle. Every status has an accessible name: the glyph title, the spinner label, or visually hidden "Idle" text; Running also sets aria-busy. Name and Meta wrap inside the FIXED 104 node instead of overflowing it.',
} as const
