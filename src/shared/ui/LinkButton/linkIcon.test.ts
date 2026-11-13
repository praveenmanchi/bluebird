import { describe, it, expect } from 'vitest'
import { EXTERNAL_LINK_ICON, labelText, linkIcon } from './linkIcon'

describe('linkIcon', () => {
  it.each([
    ['Open in Jira', EXTERNAL_LINK_ICON],
    ['Open BB-210 in Jira', EXTERNAL_LINK_ICON],
    ['BB-342', EXTERNAL_LINK_ICON],
    ['Open in Figma', EXTERNAL_LINK_ICON],
    ['Open on GitHub', EXTERNAL_LINK_ICON],
    ['Open library', EXTERNAL_LINK_ICON],
    ['Open', 'ui-prototype-navigate-to'],
    ['Open report', 'ui-prototype-navigate-to'],
    ['View run #484', 'ui-prototype-navigate-to'],
    ['Synced 2m ago · Refresh', 'ui-prototype-change-to'],
    ['Try again', 'ui-prototype-change-to'],
    ['Re-run extract', 'ui-prototype-change-to'],
    ['Change repository', 'ui-shape-instance-swap'],
    ['Switch', 'ui-shape-instance-swap'],
    ['Edit prompt', 'ui-sidebar-edit'],
    ['Ignore', 'ui-general-hide'],
    ['Restore', 'ui-general-show'],
    ['Apply fix', 'ui-ai-feature-wand'],
    ['Locate', 'ui-general-search'],
    ['Select all', 'ui-toolbar-select-matching'],
    ['Select on canvas', 'ui-toolbar-move'],
    ['Done', 'ui-general-check'],
    ['Copied', 'ui-general-check'],
    ['Delete', 'ui-general-trash'],
    ['Remove File 2', 'ui-general-trash'],
    ['Reply', 'ui-toolbar-comment'],
    ['Manage sources', 'ui-general-setting'],
    ['Add subtask', 'ui-general-add'],
    ['Attach Figma link', 'ui-toolbar-linkedobject'],
    ['Copy diff as JSON', 'ui-misc-clipboard'],
    ['Show all 16', 'ui-misc-down-arrow-small'],
    ['Show 3 more changes', 'ui-misc-down-arrow-small'],
  ])('%s → %s', (label, icon) => {
    expect(linkIcon(label)).toBe(icon)
  })

  it('gives back links no glyph: they already lead with an arrow', () => {
    expect(linkIcon('← Back to history')).toBeUndefined()
    expect(linkIcon('‹ All agents')).toBeUndefined()
    expect(linkIcon('Back to conversation')).toBeUndefined()
  })

  it('leaves unknown labels without a glyph', () => {
    expect(linkIcon('Something new')).toBeUndefined()
  })
})

describe('labelText', () => {
  it('joins plain children and gives up on markup', () => {
    expect(labelText('Copy')).toBe('Copy')
    expect(labelText(['Show ', 3, ' more'])).toBe('Show 3 more')
    expect(labelText({ type: 'b' })).toBeNull()
    expect(labelText(['Show ', { type: 'b' }])).toBeNull()
  })
})
