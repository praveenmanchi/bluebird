import { scaleGaps } from '../../../shared/brand/scaleGaps'
/** Figma ↔ code contract for the UX AI Answer screen (frame "UX AI body", not a component set; screen 40000277:16690). */
export const figma = {
  setId: '40000288:8351',
  name: 'UX AI body',
  props: {},
  figmaGaps: {
    ...scaleGaps('uxai/border-width'),
    'uxai/chip/bg': 'Bound on the composed ContextChip / PromptChip instances; ContextChip.css / PromptChip.css consume it.',
    'uxai/chip/border': 'Bound on the composed ContextChip / PromptChip / ChatInput instances; ContextChip.css / PromptChip.css / ChatInput.css consume it.',
    'uxai/surface/panel': 'Bound on the composed ColorArtifact instance; ColorArtifact.css consumes it.',
    'uxai/surface/panel-border': 'Bound on the composed ColorArtifact instance; ColorArtifact.css consumes it.',
    'uxai/radius/panel': 'Bound on the composed ColorArtifact instance; ColorArtifact.css consumes it.',
    'uxai/space/row-x': 'Bound on the composed ColorArtifact / PromptChip / ChatInput instances; ColorArtifact.css / PromptChip.css / ChatInput.css consume it.',
    'uxai/radius/pill': 'Bound on the composed PromptChip instance; PromptChip.css consumes it.',
    'uxai/space/row-y': 'Bound on the composed PromptChip / ChatInput instances; PromptChip.css / ChatInput.css consume it.',
    'uxai/surface/field': 'Bound on the composed ChatInput instance; ChatInput.css consumes it.',
    'uxai/radius/control': 'Bound on the composed ChatInput instance; ChatInput.css consumes it.',
  },
  derivedGaps: {
    '--bb-derived-uxai-answer-chat-input-height': 'Hug height / state stroke of the Chat Input instance; ChatInput.css owns both (its width is read as the composer max-width).',
    '--bb-derived-uxai-answer-color-artifact-height': 'Hug height / stroke of the Color Artifact instance; ColorArtifact.css owns both (its width is read as the artifact max-width).',
    '--bb-derived-uxai-answer-gutter-height': 'The Gutter is a spacer: only its width (uxai/size/orb-sm) matters; its height follows the row.',
    '--bb-derived-uxai-answer-prompt-chip--1-width': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-answer-prompt-chip--2-width': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-answer-prompt-chip-height': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-answer-prompt-chip-ux-ai-body-width': 'Hug size / stroke of a Prompt Chip instance; the chip sizes itself from its label (PromptChip.css).',
    '--bb-derived-uxai-answer-root-height': 'Desktop-mock height (724). The body fills the tab area of the 360–760 px plugin window instead, so its height is the window\'s.',
    '--bb-derived-uxai-answer-thinking-step--1-width': 'Hug size of a Thinking Step instance; the step sizes itself from its label (ThinkingStep.css).',
    '--bb-derived-uxai-answer-thinking-step-height': 'Hug size of a Thinking Step instance; the step sizes itself from its label (ThinkingStep.css).',
    '--bb-derived-uxai-answer-thinking-step-ux-ai-body-width': 'Hug size of a Thinking Step instance; the step sizes itself from its label (ThinkingStep.css).',
  },
  notes: '859×724 desktop mock rendered in the 360–760 px window: the root and its FILL children read their Figma widths as max-widths. The Thread is bottom-aligned (Figma MAX) and scrolls. Since 2026-10-12 the frame has no Sources bar above the Thread (ChatBody sourcesBar={false}): the Chat Input shows only its "N sources" chip (Selection hidden, as in Figma), which expands the field into the Sources bar (Chat Input State "source expend"), the "+N" chip counting selected sources beyond the four shown.',
} as const
