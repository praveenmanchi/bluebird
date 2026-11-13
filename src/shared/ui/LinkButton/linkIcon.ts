import type { IconName } from '../Icon/Icon'

/** The glyph on every link that opens Jira, Figma, GitHub, a docs page or any other place outside the plugin. */
export const EXTERNAL_LINK_ICON: IconName = 'ui-toolbar-link-open'

/**
 * Label → trailing glyph, the same rules the Figma Link Button instances follow (2026-11-13).
 * First match wins, so the external-link rule sits above the generic "Open" rule.
 * `null` means no glyph: back links already lead with an arrow.
 */
const RULES: ReadonlyArray<readonly [RegExp, IconName | null]> = [
  [/^(←|‹)|^Back to /, null],
  [/Jira|^BB-\d+$|^Open (in|on) (Figma|Bluebird|GitHub)$|^Open (site|preview|library|the run|release page)$/, EXTERNAL_LINK_ICON],
  [/^Add\b/, 'ui-general-add'],
  [/^Attach\b|^Link issue$|^Connect$/, 'ui-toolbar-linkedobject'],
  [/Refresh|Retry$|^Try again$|^Run again$|^Re-(run|check)|^Regenerate$|^Check rules$|^Start a new scan$/, 'ui-prototype-change-to'],
  [/^(Open|Open report|Open page|View all|View matrix|View run #\d+)$/, 'ui-prototype-navigate-to'],
  [/^Show (all|\d+ more)\b/, 'ui-misc-down-arrow-small'],
  [/^Select (exact matches|all)$/, 'ui-toolbar-select-matching'],
  [/^Select on canvas$/, 'ui-toolbar-move'],
  [/^Locate$/, 'ui-general-search'],
  [/^Go to component$/, 'ui-toolbar-go-to-main-component'],
  [/^Reattach$/, 'ui-toolbar-instance'],
  [/^Use local$/, 'ui-library-this-file'],
  [/^Map$/, 'ui-misc-variable-mapping'],
  [/^Copied$/, 'ui-general-check'],
  [/^Copy\b/, 'ui-misc-clipboard'],
  [/^(Edit\b.*|Override|Revise)$/, 'ui-sidebar-edit'],
  [/^(Change\b.*|Switch)$/, 'ui-shape-instance-swap'],
  [/^Ignore$/, 'ui-general-hide'],
  [/^(Restore( all)?|Undo)$/, 'ui-general-show'],
  [/^(Apply fix|Fix|Fix all)$/, 'ui-ai-feature-wand'],
  [/^Done$/, 'ui-general-check'],
  [/^(Delete|Remove\b.*)$/, 'ui-general-trash'],
  [/^Clear( all)?$/, 'ui-general-x'],
  [/^Reply$/, 'ui-toolbar-comment'],
  [/^(Manage( sources| in Settings)?|(Open )?Settings)$/, 'ui-general-setting'],
]

/** The glyph a link with this label gets, or undefined when no rule matches (or the label says to show none). */
export function linkIcon(label: string): IconName | undefined {
  const text = label.trim()
  return RULES.find(([pattern]) => pattern.test(text))?.[1] ?? undefined
}

/** Plain text of simple children (strings, numbers and arrays of them); null when the label has markup. */
export function labelText(children: unknown): string | null {
  if (typeof children === 'string' || typeof children === 'number') return String(children)
  if (Array.isArray(children)) {
    const parts = children.map(labelText)
    return parts.every((p) => p !== null) ? parts.join('') : null
  }
  return null
}
