// Figma sandbox entry. Has access to the `figma` global, no DOM.
import { config, brand, clampWindow, WINDOW_MINI, type WindowSize } from '@shared/config'
import { createSessionHandlers, clientStorageStore, SESSION_KEY } from './session'
import { createIntegrationsHandlers } from './integrations'
import { readIntegrations } from '@shared/integrations/effective'
import { createLibrariesHandlers } from '@shared/libraries/handlers'
import { createOnboardingHandlers } from './onboarding'
import { createPersonaHandlers } from './persona'
import { createIntroHandlers } from './intro'
import { createFigmaKeyHandlers } from './figmaKey'
import type { Session } from '@shared/session'
import { createRouter, type HandlerMap } from '@shared/bridge'
import { resolveBrandTokens } from '@shared/brand/resolve'
import { extractAll, type ExtractManifest } from '@shared/brand/extract'
import { handlers as featureHandlers } from './registry.generated'
import { EDITOR_MSG, editorModeOf, guardCanvasWrites } from '@shared/editor/mode'
import { CANVAS_WRITES } from './canvas-writes'

const TOKEN_KEY = 'bluebird:relay-token'

/** True only in `npm run dev:live` builds (scripts/build-sandbox.ts defines it). Production builds
 *  drop the bridge branch, and manifest.json has no menu, so published users always get the plugin. */
declare const __LIVE_BRIDGE__: boolean

const store = clientStorageStore()
/** Dev Mode runs the plugin in the Inspect panel with a read-only file. */
const editorMode = editorModeOf(figma.editorType)

/** Brand tokens for the requested brand, else the session's brand, else the config default. */
async function brandTokens(payload?: { brandId?: string }) {
  const session = (await store.get(SESSION_KEY)) as Session | undefined
  const id = payload?.brandId ?? session?.brandId ?? brand.id
  const b = config.brand.brands[id] ?? brand
  return resolveBrandTokens({ id, ...b.source, fallbackTokens: b.fallbackTokens })
}

const coreHandlers: HandlerMap = {
  'brand:tokens': brandTokens,
  // currentUser throws where the permission is missing; the id only feeds a one-way analytics key.
  ...createSessionHandlers(config, store, () => { try { return figma.currentUser?.id ?? null } catch { return null } }),
  ...createIntegrationsHandlers(store),
  ...createOnboardingHandlers(store),
  ...createPersonaHandlers(config, store),
  ...createIntroHandlers(store),
  // Figma API key screen: GET /v1/me with the pasted token, before it is saved.
  ...createFigmaKeyHandlers({ fetch: (url, init) => fetch(url, init) }),
  // Dual File Mode: library files read over the Figma REST API, shared by the tabs that ask.
  ...createLibrariesHandlers({
    readSettings: async () => (await readIntegrations((k) => store.get(k))).dualFile,
    fetch: (url, init) => fetch(url, init),
  }),
  [EDITOR_MSG.mode]: () => editorMode,
  'shell:close': () => { figma.closePlugin() },
  // In Dev Mode the iframe fills the Inspect panel, so there is no window to size.
  'shell:resize': (size: WindowSize) => {
    if (editorMode === 'dev') return
    const { width, height } = clampWindow(size)
    figma.ui.resize(width, height)
  },
  // Minimize: the window shrinks to the 64 × 64 launcher; shell:resize brings it back.
  'shell:minimize': () => {
    if (editorMode === 'dev') return
    figma.ui.resize(WINDOW_MINI.width, WINDOW_MINI.height)
  },
  // Design-token snapshot for scripts/figma-pull.ts (plugin backend). Read-only.
  'figma:snapshot': (manifest: ExtractManifest) => extractAll(manifest),
  // The current page's top-level frames with every descendant id, for
  // scripts/ground-truth.ts to map scan findings back to labelled cases. Read-only.
  // A plain stack walk: the find* methods are advised against under dynamic
  // page loading, and the case frames are small.
  // Which file and page the plugin is actually in. The ground-truth runner reads
  // case expectations from layer names, so a window on a branch or an unsynced
  // copy silently judges against the wrong text; this says so out loud.
  'dev:where': () => ({
    file: figma.root.name,
    // Only private plugins get a file key, and only on some hosts.
    fileKey: (figma as unknown as { fileKey?: string }).fileKey ?? null,
    page: figma.currentPage.name,
    cases: figma.currentPage.children.filter((n) => n.name.startsWith('GT-')).length,
  }),
  'dev:cases': () => figma.currentPage.children.map((frame) => {
    const ids: string[] = []
    const stack: SceneNode[] = [frame]
    while (stack.length) {
      const node = stack.pop()!
      ids.push(node.id)
      if ('children' in node) stack.push(...node.children)
    }
    return { id: frame.id, name: frame.name, ids }
  }),
}

const router = createRouter(
  guardCanvasWrites({ ...coreHandlers, ...featureHandlers }, CANVAS_WRITES, editorMode),
  (message) => figma.ui.postMessage(message),
)

if (__LIVE_BRIDGE__) {
  figma.showUI(uiFile('bridge'), { width: 320, height: 260, title: 'Bluebird · live bridge (dev build)' })
} else {
  figma.showUI(uiFile('main'), { width: config.window.width, height: config.window.height, themeColors: false })
}

figma.ui.onmessage = async (raw: unknown) => {
  // Bridge-page housekeeping (token persistence) is not routed to features.
  if (isEvent(raw, 'bridge:load-token')) {
    const token = (await figma.clientStorage.getAsync(TOKEN_KEY)) ?? ''
    figma.ui.postMessage({ kind: 'event', type: 'bridge:token', payload: token })
    return
  }
  if (isEvent(raw, 'bridge:save-token')) {
    await figma.clientStorage.setAsync(TOKEN_KEY, typeof raw.payload === 'string' ? raw.payload : '')
    return
  }
  await router.handle(raw)
}

figma.on('selectionchange', () => {
  figma.ui.postMessage({ kind: 'event', type: 'shell:selection', payload: { count: figma.currentPage.selection.length } })
})

function uiFile(name: 'main' | 'bridge'): string {
  const html = __uiFiles__[name]
  if (!html) throw new Error(`manifest.json ui.${name} is missing — run npm run build`)
  return html
}

function isEvent(raw: unknown, type: string): raw is { kind: 'event'; type: string; payload: unknown } {
  return typeof raw === 'object' && raw !== null && (raw as { kind?: string }).kind === 'event' && (raw as { type?: string }).type === type
}
