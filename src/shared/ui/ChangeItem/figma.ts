/** Figma ↔ code contract for ChangeItem ("Change Item" 40000483:9599). */
const composed = (component: string) => `Bound on the composed ${component} instance; ${component}'s own CSS consumes it.`

export const figma = {
  setId: '40000483:9599',
  name: 'Change Item',
  props: {
    Expanded: 'expanded (No / Yes) + onToggle',
    'Header › Change Row (instance, fill and stroke cleared)': 'row',
    'Header › Disclosure (Disclosure Toggle instance, Label hidden)': 'expanded + onToggle (aria-label Show details / Hide details, aria-controls detailsId)',
    'Details › Brand values (Brand Diff Row instances)': 'brandValues',
    'Details › Used in (Context Chip instances, Type=Source)': 'usedIn',
    'Details › Source (text)': 'source',
  },
  figmaGaps: {
    'a11y/surface/sunken': composed('DisclosureToggle'),
    'a11y/radius/control': composed('DisclosureToggle'),
    'a11y/space/tight': composed('DisclosureToggle'),
    'a11y/space/inline': composed('DisclosureToggle'),
    'a11y/space/hair': composed('DisclosureToggle'),
    'uxai/chip/bg': composed('ContextChip'),
    'uxai/chip/border': composed('ContextChip'),
    'uxai/radius/chip': composed('ContextChip'),
    'uxai/space/tight': composed('ContextChip'),
    'uxai/space/inline': composed('ContextChip'),
    'uxai/space/hair': composed('ContextChip'),
  },
  derivedGaps: {
    '--bb-derived-change-item-root-width': 'FIXED 600 on the Components page; the item fills its changes list, so it is width: 100%.',
    '--bb-derived-change-item-details-width': 'FIXED 598 (root inner width) in Expanded=No, FILL in Expanded=Yes; code stretches Details to the item (align-items: stretch).',
    '--bb-derived-change-item-context-chip-stroke-width': "Raw stroke on the Context Chip instances; ContextChip reads the same 1 through --bb-derived-context-chip-root-stroke-width.",
  },
  notes: 'Code-only: the Value by brand and Used in groups are left out when their list is empty (component changes have no brand values; unused variables have no users). Built 2026-10-11 for the Publish tab. The header exposes a Change Row (State omitted — the item, not the row, shows selection through its row-selected-border stroke when expanded) with its fill and stroke cleared, then the Disclosure Toggle as a header sibling exactly as in Figma (no gap; the header padding-right is publish/space/row-x). The toggle label is hidden, so the button carries aria-label "Show details" / "Hide details" plus aria-expanded and aria-controls. Details is always in the DOM (so aria-controls resolves) but `hidden` while collapsed. Expanded is uncontrolled unless `expanded` is passed. The Details stroke is drawn as a top rule (publish/border-width) — the only edge visible inside the item border.',
} as const
