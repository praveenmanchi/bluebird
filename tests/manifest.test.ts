// @vitest-environment node
// The published plugin uses this same manifest.json, so nothing dev-only may surface in it.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (path: string) => readFileSync(resolve(root, path), 'utf8')
const manifest = JSON.parse(read('manifest.json')) as { menu?: unknown; ui: Record<string, string> }

describe('manifest.json', () => {
  it('has no menu, so running the plugin opens Bluebird and no dev command is listed', () => {
    expect(manifest.menu).toBeUndefined()
  })

  it('keeps the bridge UI declared for dev:live builds', () => {
    expect(manifest.ui).toEqual({ main: 'dist/index.html', bridge: 'dist/bridge.html' })
  })
})

describe('live bridge', () => {
  it('opens only in BB_LIVE builds, never from a menu command', () => {
    const main = read('src/sandbox/main.ts')
    expect(main).toContain('if (__LIVE_BRIDGE__) {')
    expect(main).not.toMatch(/figma\.command\s*===\s*'bridge'/)
    expect(read('scripts/build-sandbox.ts')).toContain("define: { __LIVE_BRIDGE__: JSON.stringify(live) }")
    expect(JSON.parse(read('package.json')).scripts['dev:live']).toContain('BB_LIVE=1')
  })
})
