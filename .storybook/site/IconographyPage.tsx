import { useMemo, useState } from 'preact/hooks'
import { Icon, ICONS, MARKS, Mark, type IconName, type IconSize, type MarkName } from '../../src/shared/ui/Icon/Icon'
import { Section, SitePage } from './Site'
import { PAGES } from './runtime'
import './iconography.css'

const SIZES: { id: IconSize; label: string }[] = [
  { id: 'sm', label: 'Small · 16' },
  { id: 'md', label: 'Medium · 18' },
  { id: 'lg', label: 'Large · 24' },
]

const NAMES = Object.keys(ICONS) as IconName[]
const prefixOf = (name: string) => name.split('-')[0] ?? name
const PREFIX_COUNTS = NAMES.reduce((counts, name) => counts.set(prefixOf(name), (counts.get(prefixOf(name)) ?? 0) + 1), new Map<string, number>())

/** Icons that share a prefix (ai-, disability-, theme-…) form a family; singletons go to "General". */
function families(names: IconName[]): [string, IconName[]][] {
  const groups = new Map<string, IconName[]>()
  for (const name of names) {
    const prefix = prefixOf(name)
    const key = (PREFIX_COUNTS.get(prefix) ?? 0) > 1 ? prefix : 'general'
    groups.set(key, [...(groups.get(key) ?? []), name])
  }
  return [...groups].sort(([a], [b]) => (a === 'general' ? -1 : b === 'general' ? 1 : a.localeCompare(b)))
}

function IconTile({ name, size, copied, onCopy }: { name: IconName; size: IconSize; copied: boolean; onCopy: (name: IconName) => void }) {
  return (
    <button type="button" class="bbs-icon-tile" onClick={() => onCopy(name)} title={`Copy <Icon name="${name}" />`}>
      <span class="bbs-icon-tile__glyph"><Icon name={name} size={size} /></span>
      <span class="bbs-icon-tile__name">{copied ? 'Copied' : name}</span>
    </button>
  )
}

function Browser() {
  const [query, setQuery] = useState('')
  const [size, setSize] = useState<IconSize>('lg')
  const [copied, setCopied] = useState<IconName | undefined>()
  const matches = useMemo(() => NAMES.filter((n) => n.includes(query.trim().toLowerCase())), [query])

  const copy = async (name: IconName) => {
    try {
      await navigator.clipboard.writeText(`<Icon name="${name}" />`)
      setCopied(name)
      window.setTimeout(() => setCopied(undefined), 1200)
    } catch {
      setCopied(undefined) // clipboard blocked; the name stays visible on the tile
    }
  }

  return (
    <div class="bbs-stack">
      <div class="bbs-row bbs-icon-toolbar">
        <input class="bbs-input" type="search" placeholder={`Search ${NAMES.length} icons`} value={query} onInput={(e) => setQuery(e.currentTarget.value)} aria-label="Search icons" />
        <div class="bbs-segmented" role="group" aria-label="Icon size">
          {SIZES.map((s) => <button key={s.id} type="button" aria-pressed={size === s.id} onClick={() => setSize(s.id)}>{s.label}</button>)}
        </div>
        <span class="bbs-small bbs-muted">{matches.length} shown · click to copy</span>
      </div>
      {matches.length === 0 && <p class="bbs-muted">No icon matches “{query}”. Icons are exported from the Figma Tab Icons set.</p>}
      {families(matches).map(([family, names]) => (
        <div key={family} class="bbs-stack bbs-icon-family">
          <h3 class="bbs-subhead">{family === 'general' ? 'General' : family.replace(/^\w/, (c) => c.toUpperCase())} <span class="bbs-muted bbs-small">{names.length}</span></h3>
          <div class="bbs-icon-grid">
            {names.map((name) => <IconTile key={name} name={name} size={size} copied={copied === name} onCopy={copy} />)}
          </div>
        </div>
      ))}
    </div>
  )
}

export function IconographyPage() {
  return (
    <SitePage
      current={PAGES.iconography}
      eyebrow="Style guide"
      title="Iconography"
      description="Glyphs are exported from Figma as vectors. Size and colour come from icon tokens, so an icon picks up the brand with no extra work."
    >
      {() => (
        <>
          <Section title="Icon library"><Browser /></Section>
          <Section title="Marks" description="Vector marks for control states, such as the checkbox check and dash. The control's CSS sizes them.">
            <div class="bbs-icon-grid">
              {(Object.keys(MARKS) as MarkName[]).map((name) => (
                <div key={name} class="bbs-icon-tile">
                  <span class="bbs-icon-tile__glyph"><Mark name={name} class="bbs-mark" /></span>
                  <span class="bbs-icon-tile__name">{name}</span>
                </div>
              ))}
            </div>
          </Section>
          <Section title="Usage">
            <div class="bbs-grid">
              <div class="bbs-card">
                <h3 class="bbs-card__title">In components</h3>
                <pre class="bbs-code"><code>{`import { Icon } from '@shared/ui/Icon/Icon'\n\n<Icon name="search" size="md" tone="muted" />`}</code></pre>
              </div>
              <div class="bbs-card">
                <h3 class="bbs-card__title">Guidelines</h3>
                <ul class="bbs-card__desc bbs-guidelines">
                  <li>Leave <code>size</code> unset inside a Button; the button sizes its own icons.</li>
                  <li>Give icon-only controls a <code>title</code> so they have an accessible name.</li>
                  <li>Add new glyphs in Figma, then run <code>npm run figma:pull</code>.</li>
                </ul>
              </div>
            </div>
          </Section>
        </>
      )}
    </SitePage>
  )
}
