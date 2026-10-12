import { useMemo, useState } from 'preact/hooks'
import { FIGMA_COMPONENTS } from '../../src/shared/brand/generated/tokens'
import { Badge, PageLink, Section, SitePage } from './Site'
import { COMPONENT_GROUPS, PAGES, summarise, useStoryIndex, type ComponentSummary } from './runtime'
import { Thumbnail } from './Thumbnail'
import './components.css'

const GROUP_COPY: Record<string, string> = {
  Atoms: 'The smallest building blocks: buttons, inputs, icons and badges.',
  Molecules: 'Atoms combined into a single purpose, such as rows, chips and cards.',
  Organisms: 'Composite sections that make up a tab, such as cards with actions and panels.',
  Screens: 'Full tab screens, assembled as they appear in the plugin.',
  Shell: 'The plugin frame: banner, tab bar, footer, login and settings.',
}

const FIGMA_NAMES = new Set(Object.keys(FIGMA_COMPONENTS).map((k) => k.toLowerCase()))
const isFigmaLinked = (name: string) => FIGMA_NAMES.has(name.replace(/\s+/g, '').toLowerCase())

function ComponentCard({ item }: { item: ComponentSummary }) {
  return (
    <article class="bbs-card bbs-component-card">
      {item.thumbnail
        ? <Thumbnail storyId={item.thumbnail} fallback={item.name.slice(0, 2)} />
        : <div class="bbs-thumb" aria-hidden="true"><span class="bbs-thumb__fallback">{item.name.slice(0, 2)}</span></div>}
      <h3 class="bbs-card__title"><PageLink to={item.target} class="bbs-stretched-link">{item.name}</PageLink></h3>
      <div class="bbs-row">
        <Badge>{item.stories} {item.stories === 1 ? 'story' : 'stories'}</Badge>
        {isFigmaLinked(item.name) && <Badge tone="accent">Figma</Badge>}
      </div>
    </article>
  )
}

function Catalogue() {
  const index = useStoryIndex()
  const [query, setQuery] = useState('')
  const summaries = useMemo(() => (index.status === 'ready' ? summarise(index.entries) : []), [index])
  const q = query.trim().toLowerCase()
  const visible = summaries.filter((s) => s.name.toLowerCase().includes(q))

  if (index.status === 'loading') return <p class="bbs-muted">Loading the component index…</p>
  if (index.status === 'error') return <p class="bbs-muted">Couldn't load the story index ({index.message}). Use the sidebar to browse components.</p>

  return (
    <div class="bbs-stack">
      <div class="bbs-row">
        <input class="bbs-input" type="search" placeholder={`Search ${summaries.length} components`} value={query} onInput={(e) => setQuery(e.currentTarget.value)} aria-label="Search components" />
        <span class="bbs-small bbs-muted">{visible.length} shown</span>
      </div>
      {COMPONENT_GROUPS.map((group) => {
        const items = visible.filter((s) => s.group === group).sort((a, b) => a.name.localeCompare(b.name))
        if (items.length === 0) return null
        return (
          <Section key={group} title={group} description={GROUP_COPY[group]}>
            <div class="bbs-grid bbs-grid--components">
              {items.map((item) => <ComponentCard key={item.title} item={item} />)}
            </div>
          </Section>
        )
      })}
      {visible.length === 0 && <p class="bbs-muted">No component matches “{query}”.</p>}
    </div>
  )
}

export function ComponentsPage() {
  return (
    <SitePage
      current={PAGES.components}
      eyebrow="Components"
      title="Component library"
      description="Every component mirrors a Figma component set and has a story for each variant. Open one to see its states, controls and docs. Switch brands from the Brand menu in its toolbar."
    >
      {() => <Catalogue />}
    </SitePage>
  )
}
