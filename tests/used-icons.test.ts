// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { usedIconNames } from '../scripts/gen-tokens'

describe('usedIconNames', () => {
  it('reads plugin code and plugin.config.json, but not the browser-only dev pages', () => {
    const root = mkdtempSync(join(tmpdir(), 'bb-icons-'))
    mkdirSync(join(root, 'src/shell'), { recursive: true })
    mkdirSync(join(root, 'src/dev/analytics'), { recursive: true })
    writeFileSync(join(root, 'src/shell/App.tsx'), `<Icon name="settings" />`)
    writeFileSync(join(root, 'src/shell/App.test.tsx'), `<Icon name="search" />`)
    writeFileSync(join(root, 'src/dev/analytics/Page.tsx'), `<Icon name="tool-export" />`)
    writeFileSync(join(root, 'plugin.config.json'), JSON.stringify({ tabs: { a11y: { icon: 'accessibility' } } }))
    const used = usedIconNames(root, ['settings', 'search', 'tool-export', 'accessibility', 'jira'])
    expect(used).toEqual(expect.arrayContaining(['settings', 'accessibility']))
    expect(used).not.toContain('tool-export')
    expect(used).not.toContain('search')
    expect(used).not.toContain('jira')
  })
})
