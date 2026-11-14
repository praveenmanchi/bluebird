// Messages whose handlers create, delete or edit layers. Dev Mode's document is
// read-only, so main.ts turns these away there (guardCanvasWrites) with one clear message.
// Plugin data, annotations, selection and exports still work in Dev Mode and are not listed.
import { MSG as A11Y } from '@features/a11y/messages'
import { MSG as AGENTS } from '@features/agents/messages'
import { MSG as VARMAPPER } from '@features/varmapper/messages'

export const CANVAS_WRITES: readonly string[] = [
  A11Y.applyFix,
  A11Y.createReport,
  A11Y.createSpec,
  AGENTS.apply,
  AGENTS.report,
  VARMAPPER.bind,
  VARMAPPER.undo,
]
