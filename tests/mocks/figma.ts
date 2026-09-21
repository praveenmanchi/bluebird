// Minimal `figma` global for sandbox-side unit tests.
import { vi } from 'vitest'

export function installFigmaMock(overrides: Partial<PluginAPI> = {}): PluginAPI {
  const mock = {
    mixed: Symbol('mixed'),
    skipInvisibleInstanceChildren: false,
    currentPage: { selection: [], children: [] },
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
