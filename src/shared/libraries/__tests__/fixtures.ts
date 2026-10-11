// REST payloads shaped like api.figma.com's, small enough to read.
import type { RestComponentSetsResponse, RestComponentsResponse, RestVariablesResponse } from '../normalize'
import type { HttpFetch } from '../rest'

export const VARIABLES: RestVariablesResponse = {
  meta: {
    variableCollections: {
      'c:prim': { id: 'c:prim', name: 'Primitives', modes: [{ modeId: 'p1', name: 'Value' }], defaultModeId: 'p1' },
      'c:brand': { id: 'c:brand', name: 'Brand UI', modes: [{ modeId: 'b1', name: 'Bridge' }, { modeId: 'b2', name: 'Ikea' }], defaultModeId: 'b1' },
      'c:remote': { id: 'c:remote', name: 'Elsewhere', modes: [{ modeId: 'r1', name: 'Default' }], defaultModeId: 'r1', remote: true },
    },
    variables: {
      'v:blue': { id: 'v:blue', key: 'kblue', name: 'blue/600', variableCollectionId: 'c:prim', resolvedType: 'COLOR', valuesByMode: { p1: { r: 0, g: 0.4, b: 1, a: 1 } } },
      'v:yellow': { id: 'v:yellow', key: 'kyellow', name: 'yellow/400', variableCollectionId: 'c:prim', resolvedType: 'COLOR', valuesByMode: { p1: { r: 1, g: 0.8, b: 0, a: 0.5 } } },
      'v:accent': {
        id: 'v:accent', key: 'kaccent', name: 'surface/accent', variableCollectionId: 'c:brand', resolvedType: 'COLOR', description: 'Primary actions',
        valuesByMode: { b1: { type: 'VARIABLE_ALIAS', id: 'v:blue' }, b2: { type: 'VARIABLE_ALIAS', id: 'v:yellow' } }, scopes: ['ALL_FILLS'],
      },
      'v:gap': { id: 'v:gap', key: 'kgap', name: 'space/inset-md', variableCollectionId: 'c:brand', resolvedType: 'FLOAT', valuesByMode: { b1: 12, b2: 12.5 } },
      'v:ext': { id: 'v:ext', key: 'kext', name: 'text/link', variableCollectionId: 'c:brand', resolvedType: 'COLOR', valuesByMode: { b1: { type: 'VARIABLE_ALIAS', id: 'v:missing' }, b2: { type: 'VARIABLE_ALIAS', id: 'v:missing' } } },
      'v:remote': { id: 'v:remote', key: 'kremote', name: 'remote/thing', variableCollectionId: 'c:remote', resolvedType: 'COLOR', valuesByMode: { r1: { r: 0, g: 0, b: 0 } }, remote: true },
    },
  },
}

const frame = (pageName: string, name: string, set?: { nodeId: string; name: string }) => ({ pageName, name, nodeId: '0:1', ...(set ? { containingComponentSet: set } : {}) })

export const COMPONENTS: RestComponentsResponse = {
  meta: {
    components: [
      { key: 'kbtn-primary', node_id: '10:2', name: 'Variant=Primary', containing_frame: frame('Components', 'Button', { nodeId: '10:1', name: 'Button' }) },
      { key: 'kbtn-secondary', node_id: '10:3', name: 'Variant=Secondary', containing_frame: frame('Components', 'Button', { nodeId: '10:1', name: 'Button' }) },
      { key: 'kdivider', node_id: '20:1', name: 'Divider', description: 'Hairline separator', containing_frame: frame('Components', 'Atoms') },
    ],
  },
}

export const COMPONENT_SETS: RestComponentSetsResponse = {
  meta: { component_sets: [{ key: 'kbtn', node_id: '10:1', name: 'Button', description: 'Primary call to action', containing_frame: frame('Components', 'Atoms') }] },
}

export interface Call { url: string; token: string }

/** A fake api.figma.com: routes by path suffix, records every call. `fail` maps a suffix to [status, body]. */
export function fakeFigma(fail: Record<string, [number, string]> = {}, names: Record<string, string> = {}) {
  const calls: Call[] = []
  const fetch: HttpFetch = async (url, init) => {
    calls.push({ url, token: init.headers['X-Figma-Token']! })
    const reply = (status: number, body: unknown) => ({ status, text: async () => (typeof body === 'string' ? body : JSON.stringify(body)) })
    const failure = Object.entries(fail).find(([suffix]) => url.endsWith(suffix))
    if (failure) return reply(failure[1][0], failure[1][1])
    const key = /\/files\/([^/]+)\//.exec(url)?.[1] ?? ''
    if (url.endsWith('/meta')) return reply(200, { file: { name: names[key] ?? `Name of ${key}` } })
    if (url.endsWith('/variables/local')) return reply(200, VARIABLES)
    if (url.endsWith('/component_sets')) return reply(200, COMPONENT_SETS)
    if (url.endsWith('/components')) return reply(200, COMPONENTS)
    return reply(404, { status: 404, err: 'Not found' })
  }
  return { fetch, calls }
}
