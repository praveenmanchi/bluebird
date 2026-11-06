import { scaleGaps } from '../../brand/scaleGaps'
const checkbox = 'Bound on the nested Checkbox ("Enabled") instance; the composed <Checkbox> consumes it in Checkbox.css.'
const rating = 'Bound on the nested Rating ("Level") instance; the composed <Rating> consumes it in Rating.css.'

/** Figma ↔ code contract for RuleRow ("Rule Row" 40000296:8401). */
export const figma = {
  setId: '40000296:8401',
  name: 'Rule Row',
  props: {
    Name: 'name',
    Description: 'description',
    'Enabled (Checkbox instance, Selected=Checked, Show label=false)': 'enabled + onToggle (+ toggleLabel as its accessible name)',
    'Level (Rating instance, Rating=AA)': 'level',
  },
  propGaps: {
    'Check Box': 'Open: Figma hides the Enabled checkbox on all 7 rows of the Agent setup screen, but the checkbox is how a rule is switched on or off, so code always shows it.',
  },
  figmaGaps: {
    ...scaleGaps('dimension/space/6'),
    'checkbox/gap': checkbox,
    'rating/bg/default': rating,
    'rating/radius': rating,
  },
  derivedGaps: {},
  notes: 'Created 2026-10-09 for the AI Agents tab (agent setup rule pack). Reuses Checkbox and Rating. The root is FIXED 400 × 32 in Figma, but Text alone is 32 high and the root pads agents/space/hair top and bottom, so the content overflows the frame by 4; code uses the 32 as min-height.',
} as const
