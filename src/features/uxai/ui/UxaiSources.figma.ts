/** Figma ↔ code contract for the UX AI Sources screen (frame "UX AI body", not a component set; screen 40000288:8330). */
export const figma = {
  setId: '40000290:5841',
  name: 'UX AI body',
  props: {},
  figmaGaps: {
    'uxai/surface/field': 'Bound on the composed ChatInput instance; ChatInput.css consumes it.',
    'uxai/space/row-x': 'Bound on the composed PromptChip / ChatInput instances; PromptChip.css / ChatInput.css consume it.',
    'uxai/space/row-y': 'Bound on the composed PromptChip / ChatInput instances; PromptChip.css / ChatInput.css consume it.',
    'uxai/surface/sunken': 'Bound on the Thinking Orb in the last Figma snapshot. Figma now nests UX AI Bot, so this goes at the next figma:pull.',
    'uxai/radius/pill': 'Bound on the composed ThinkingOrb / PromptChip instances; ThinkingOrb.css / PromptChip.css consume it.',
    'uxai/size/orb-lg': 'Bound on the Thinking Orb in the last Figma snapshot. Figma now nests UX AI Bot, so this goes at the next figma:pull.',
    'uxai/chip/bg': 'Bound on the composed PromptChip instance; PromptChip.css consumes it.',
  },
  derivedGaps: {
    '--bb-derived-uxai-sources-ux-ai-bot-width': 'Box of the nested UX AI Bot instance (40 × 40, Welcome); UxaiBot.css sizes the bot from uxai/size/orb-lg, the same 40.',
    '--bb-derived-uxai-sources-ux-ai-bot-height': 'Box of the nested UX AI Bot instance (40 × 40, Welcome); UxaiBot.css sizes the bot from uxai/size/orb-lg, the same 40.',
    '--bb-derived-uxai-sources-chat-input-height': 'Hug height / state stroke of the Chat Input instance; ChatInput.css owns both (its width is read as the composer max-width).',
    '--bb-derived-uxai-sources-prompt-chip--1-width': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-sources-prompt-chip--2-width': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-sources-prompt-chip--3-width': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-sources-prompt-chip-height': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-sources-prompt-chip-ux-ai-body-width': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-sources-root-height': 'Desktop-mock height (724). The body fills the tab area of the 360–760 px plugin window instead, so its height is the window\'s.',
  },
  notes: 'Redrawn 2026-10-12: the frame is now the Welcome (orb, title, prompt chips) above the Chat Input, whose Selection chip is hidden. The sources moved into the Chat Input: its "N sources" chip expands the field into the Sources bar (Chat Input State "source expend"), and that bar\'s "Manage sources" opens the source list here. Figma no longer draws that list, so it keeps the earlier layout as a code-only mode (managing): the header ("Back to conversation" once a conversation exists, "Done" before), the Sources grid sized from the Source Card\'s own width (FILL cards, one column below half a card), and the Drop zone with Upload file / Add Figma library only when given handlers (the tab has none yet). The Dual File status line (load errors, Refresh) shows in both modes; it is not in Figma either.',
} as const
