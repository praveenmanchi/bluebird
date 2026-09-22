// Figma sandbox entry. Has access to the `figma` global, no DOM.
import { config, brand, clampWindow, type WindowSize } from '@shared/config'
import { createRouter, type HandlerMap } from '@shared/bridge'
import { resolveBrandTokens } from '@shared/brand/resolve'
import { extractAll, type ExtractManifest } from '@shared/brand/extract'
import { handlers as featureHandlers } from './registry.generated'

const TOKEN_KEY = 'bluebird:relay-token'

const coreHandlers: HandlerMap = {
  'brand:tokens': () => resolveBrandTokens({ id: brand.id, ...brand.source, fallbackTokens: brand.fallbackTokens }),
  'shell:close': () => { figma.closePlugin() },
  'shell:resize': (size: WindowSize) => { const { width, height } = clampWindow(size); figma.ui.resize(width, height) },
  // Design-token snapshot for scripts/figma-pull.ts (plugin backend). Read-only.
  'figma:snapshot': (manifest: ExtractManifest) => extractAll(manifest),
}

const router = createRouter({ ...coreHandlers, ...featureHandlers }, (message) => figma.ui.postMessage(message))

if (figma.command === 'bridge') {
  figma.showUI(uiFile('bridge'), { width: 320, height: 260, title: 'Bluebird · live bridge' })
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
