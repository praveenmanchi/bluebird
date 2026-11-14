import { scaleGaps } from '../../brand/scaleGaps'
/** Figma ↔ code contract for TokenRef ("Token Ref" 40000157:7199). */
export const figma = {
  setId: '40000157:7199',
  name: 'Token Ref',
  props: { Name: 'name', Mode: 'mode', 'Show mode': 'mode !== undefined' },
  figmaGaps: { ...scaleGaps('icon/size/lg', 'font/weight-regular'), 'icon/glyph/default': 'consumed by the composed Icon' },
  notes: 'Created 2026-09-23. The glyph is the "UI Icons / Variable › color" instance in Figma (was the Tab Icons "Variables" placeholder until 2026-10-27), Icon name="ui-variable-color" in code. Figma resizes it to an unbound 12x12 (the master is 24); no icon-size variable is 12 and the generator emits no derived size for instances inside a component, so code sizes it with Foundations dimension/space/12 until Figma binds a 12 icon size.',
} as const
