// Glue between the style-guide pages and the Storybook manager: page navigation,
// the brand global, and the story index. Docs pages have no decorators, so the
// pages talk to the manager over the channel instead.
import { useEffect, useState } from 'preact/hooks'
import { addons } from 'storybook/preview-api'
import { GLOBALS_UPDATED, SELECT_STORY, SET_GLOBALS, UPDATE_GLOBALS } from 'storybook/internal/core-events'
import { BRANDS, type BrandId } from '../../src/shared/brand/generated/tokens'

/** Docs ids of the site pages (derived from each MDX `<Meta title>`). */
export const PAGES = {
  home: 'home--docs',
  colour: 'style-guide-colour--docs',
  typography: 'style-guide-typography--docs',
  iconography: 'style-guide-iconography--docs',
  spacing: 'style-guide-spacing-shape--docs',
  brands: 'style-guide-brands--docs',
  tokens: 'style-guide-token-reference--all-tokens',
  components: 'components-overview--docs',
} as const

export type PageId = (typeof PAGES)[keyof typeof PAGES]

function managerUrl(): URL {
  try {
    return new URL(window.top?.location.href ?? window.location.href)
  } catch {
    return new URL(window.location.href) // embedded cross-origin: fall back to the preview
  }
}

/** Real URL for a page so links can be opened in a new tab or copied. */
export function hrefFor(id: string): string {
  const url = managerUrl()
  const kind = id.endsWith('--docs') ? 'docs' : 'story'
  url.search = `?path=/${kind}/${id}`
  return url.toString()
}

/** In-app navigation through the manager; no full reload. */
export function go(id: string, event?: MouseEvent): void {
  if (event && (event.metaKey || event.ctrlKey || event.shiftKey || event.button !== 0)) return
  event?.preventDefault()
  addons.getChannel().emit(SELECT_STORY, { storyId: id })
}

const isBrand = (value: unknown): value is BrandId => BRANDS.includes(value as BrandId)

/** Brand from the manager URL (`&globals=brand:ikea`), else what the last story set. */
function initialBrand(): BrandId {
  const globals = managerUrl().searchParams.get('globals') ?? ''
  const fromUrl = /(?:^|;)brand:([a-z]+)/.exec(globals)?.[1]
  if (isBrand(fromUrl)) return fromUrl
  const fromDom = document.documentElement.dataset.brand
  return isBrand(fromDom) ? fromDom : 'bridge'
}

interface GlobalsEvent { globals?: { brand?: unknown } }

/** The toolbar's Brand global, two-way: the page can change it and follows the toolbar. */
export function useBrand(): [BrandId, (brand: BrandId) => void] {
  const [brand, setLocal] = useState<BrandId>(initialBrand)

  useEffect(() => {
    const channel = addons.getChannel()
    const onGlobals = ({ globals }: GlobalsEvent) => {
      if (isBrand(globals?.brand)) setLocal(globals.brand)
    }
    channel.on(GLOBALS_UPDATED, onGlobals)
    channel.on(SET_GLOBALS, onGlobals)
    return () => {
      channel.off(GLOBALS_UPDATED, onGlobals)
      channel.off(SET_GLOBALS, onGlobals)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.brand = brand
  }, [brand])

  const setBrand = (next: BrandId) => {
    setLocal(next)
    addons.getChannel().emit(UPDATE_GLOBALS, { globals: { brand: next } })
  }
  return [brand, setBrand]
}

// ── Story index ────────────────────────────────────────────────────────────
export interface IndexEntry { id: string; title: string; name: string; type: 'story' | 'docs'; tags?: string[] }

let indexPromise: Promise<IndexEntry[]> | undefined

function loadIndex(): Promise<IndexEntry[]> {
  indexPromise ??= fetch('./index.json')
    .then((res) => {
      if (!res.ok) throw new Error(`index.json responded ${res.status}`)
      return res.json() as Promise<{ entries: Record<string, IndexEntry> }>
    })
    .then((json) => Object.values(json.entries))
  return indexPromise
}

export type IndexState = { status: 'loading' } | { status: 'ready'; entries: IndexEntry[] } | { status: 'error'; message: string }

/** Every story and docs entry Storybook knows about, so the site lists components without a manual registry. */
export function useStoryIndex(): IndexState {
  const [state, setState] = useState<IndexState>({ status: 'loading' })
  useEffect(() => {
    let live = true
    loadIndex().then(
      (entries) => live && setState({ status: 'ready', entries }),
      (error: unknown) => {
        indexPromise = undefined
        if (live) setState({ status: 'error', message: error instanceof Error ? error.message : 'Could not load the story index' })
      },
    )
    return () => { live = false }
  }, [])
  return state
}

/** Sidebar roots that hold components, in the order the site shows them. */
export const COMPONENT_GROUPS = ['Atoms', 'Molecules', 'Organisms', 'Screens', 'Shell'] as const

export interface ComponentSummary { title: string; name: string; group: string; stories: number; target: string; thumbnail?: string }

const PREFERRED_THUMBNAIL = /^(default|primary|playground|basic)$/i
/** Showcase stories (grids of every brand or variant) make poor thumbnails. */
const SHOWCASE = /across|all |gallery|grid|matrix|variants|states/i

/** Story that best represents a component in a small card: a "Default"-like story, else the first single-instance one. */
export function pickThumbnail(stories: IndexEntry[]): string | undefined {
  const preferred = stories.find((s) => PREFERRED_THUMBNAIL.test(s.name))
  const single = stories.find((s) => !SHOWCASE.test(s.name))
  return (preferred ?? single ?? stories[0])?.id
}

/** One summary per component title: its group, story count and the entry to open. */
export function summarise(entries: IndexEntry[]): ComponentSummary[] {
  const byTitle = new Map<string, IndexEntry[]>()
  for (const entry of entries) {
    const group = entry.title.split('/')[0] ?? ''
    if (!(COMPONENT_GROUPS as readonly string[]).includes(group)) continue
    byTitle.set(entry.title, [...(byTitle.get(entry.title) ?? []), entry])
  }
  return [...byTitle].map(([title, list]) => {
    const docs = list.find((e) => e.type === 'docs')
    const stories = list.filter((e) => e.type === 'story')
    return {
      title,
      name: title.split('/').at(-1) ?? title,
      group: title.split('/')[0] ?? '',
      stories: stories.length,
      target: (docs ?? stories[0] ?? list[0])?.id ?? PAGES.components,
      thumbnail: pickThumbnail(stories),
    }
  })
}
