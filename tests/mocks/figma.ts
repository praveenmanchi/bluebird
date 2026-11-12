// Minimal `figma` global for sandbox-side unit tests.
import { vi } from 'vitest'

export function installFigmaMock(overrides: Partial<PluginAPI> = {}): PluginAPI {
  const pluginData = new Map<string, string>()
  const mock = {
    mixed: Symbol('mixed'),
    skipInvisibleInstanceChildren: false,
    // A document-level key/value store, as Figma gives one: features keep file-scoped
    // state (ignored a11y findings, publish releases) in it.
    root: { name: 'Test file', getPluginData: (key: string) => pluginData.get(key) ?? '', setPluginData: (key: string, value: string) => pluginData.set(key, value) },
    currentPage: { name: 'Test page', selection: [], children: [] },
    variables: {
      getLocalVariableCollectionsAsync: vi.fn(async () => []),
      getVariableByIdAsync: vi.fn(async () => null),
    },
    ui: { postMessage: vi.fn() },
    viewport: { scrollAndZoomIntoView: vi.fn() },
    getNodeByIdAsync: vi.fn(async () => null),
    ...overrides,
  } as unknown as PluginAPI
  ;(globalThis as { figma?: PluginAPI }).figma = mock
  return mock
}
