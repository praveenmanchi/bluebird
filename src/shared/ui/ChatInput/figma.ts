const chip = 'Bound on the nested Context Chip instances (Selection / Sources); rendered by the composed <ContextChip>, whose ContextChip.css consumes it.'

/** Figma ↔ code contract for ChatInput ("Chat Input" 40000284:8166). */
export const figma = {
  setId: '40000284:8166',
  name: 'Chat Input',
  props: {
    State: 'state (Idle / Active / Generating / source expend → "sources")',
    'Show context': 'showContext',
    'Context (Context Chip × 2: Selection "Ticket Row · State=Selected", Source "5 sources")': 'context',
    'Text (placeholder in Idle / Active, the prompt in Generating)': 'placeholder + value + onInput',
    'Sources bar › Sources (Context Chip × 5: Brand UI variables, Components, Icons, Type styles, "+2")': 'sources',
    'Sources bar › Link Button "Manage sources"': 'onManageSources (drawn only with a handler)',
    'Toolbar › Hint': 'hint',
    'Toolbar › Add source / Use selection (Tab Icons file / component select)': 'onAddSource + onUseSelection',
    'Toolbar › Send (Tab Icon=arrow, rotated 180°)': 'onSend (Enter sends, Shift+Enter newline)',
    'Toolbar › Stop (Generating only)': 'onStop',
  },
  figmaGaps: {
    'uxai/bubble/user/bg': chip,
    'uxai/bubble/user/border': chip,
    'uxai/chip/bg': chip,
  },
  derivedGaps: {},
  notes: 'Created 2026-10-09 for the UX AI tab. Composes ContextChip (Context row, Show context) and Icon (file, component-select, arrow — the Tab Icons arrow is a down chevron that Figma rotates 180°). The Beam on Active / Generating is the angular gradient over uxai/beam/1-5, uxai/beam-width thick, with a uxai/beam/2 glow; the snapshot does not record gradient-stop or effect bindings, so those come from the Figma description and the dev-mode read of the variant. The rotation is code-only (6s while focused, 2s while generating; static under prefers-reduced-motion) and is driven by a registered custom property (@property). The 7 glow blur is a raw effect value not exported to derived tokens — written as 5 × uxai/beam-width. An idle field that receives focus shows the Active beam. Source expend (2026-10-12) is State "source expend", in code state="sources": an idle field (1 stroke, derived per state) whose Sources bar ("Sources" caption in uxai/font/weight-strong, the Source chips, Manage sources) replaces the Context row; it takes the Active beam on focus like Idle. The Sources bar adds an inline gap between the chips and the link so they never touch when narrow (Figma lays them out SPACE_BETWEEN with no gap). Figma includes strokes in layout (Active / Generating are 1.4, Idle 1 — derived per state). The 640 fixed width is used with max-width: 100%. Send only fires with non-empty text and never while generating; Generating swaps it for Stop.',
} as const
