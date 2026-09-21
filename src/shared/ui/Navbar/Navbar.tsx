import type { ComponentChildren, JSX } from 'preact'
import type { IconName } from '../Icon/Icon'
import { Tab } from '../Tab/Tab'
import './Navbar.css'

export interface NavbarItem {
  id: string
  /** Figma Tab "Label". */
  label: ComponentChildren
  /** Figma Tab "Icon" (INSTANCE_SWAP). */
  icon?: IconName
}

/** The seven Tab instances of the Figma Navbar, in order. */
export const NAVBAR_DEFAULT_ITEMS: readonly NavbarItem[] = [
  { id: 'variables', label: 'Variables', icon: 'variables' },
  { id: 'inspect', label: 'Inspect', icon: 'inspect' },
  { id: 'documentation', label: 'Documentation', icon: 'documentation' },
  { id: 'ai-agent', label: 'AI Agent', icon: 'uxai' },
  { id: 'mcp', label: 'MCP', icon: 'component' },
  { id: 'extract-report', label: 'Extract Report', icon: 'file' },
  { id: 'change-log', label: 'Change Log', icon: 'change-log' },
]

export interface NavbarProps extends Omit<JSX.HTMLAttributes<HTMLElement>, 'onChange'> {
  /** The Tab instances (Property 1=Default / Active by `active`). */
  items?: readonly NavbarItem[]
  /** id of the item rendered as Tab Property 1=Active. */
  active?: string
  /** Figma Tab "Show Header Icons" on every item. */
  showIcons?: boolean
  /** Trailing compact tab (Tab Property 1=Variant3, navbar-tab-icon). Omit to hide it. */
  trailing?: NavbarItem
  /** Accessible name of the tablist. */
  label?: string
  onChange?: (id: string) => void
}

/** Figma "Navbar" (7:44400): a row of Tab instances plus a compact Variant3 tab. Renders <nav><div role="tablist">. */
export function Navbar({ items = NAVBAR_DEFAULT_ITEMS, active, showIcons = true, trailing, label = 'Sections', onChange, class: cls, ...rest }: NavbarProps) {
  const select = (id: string) => { if (id !== active) onChange?.(id) }
  const onKeyDown = (e: KeyboardEvent) => {
    const ids = [...items.map((i) => i.id), ...(trailing ? [trailing.id] : [])]
    const step = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0
    if (!step || ids.length === 0) return
    e.preventDefault()
    const index = ids.indexOf(active ?? '')
    const next = ids[(index + step + ids.length) % ids.length]!
    select(next)
    ;(e.currentTarget as HTMLElement).querySelector<HTMLElement>(`[data-item="${CSS.escape(next)}"]`)?.focus()
  }
  return (
    <nav {...rest} class={`bb-navbar ${cls ?? ''}`}>
      <div role="tablist" aria-label={label} aria-orientation="horizontal" class="bb-navbar__list" onKeyDown={onKeyDown}>
        {items.map((item) => (
          <Tab
            key={item.id}
            class="bb-navbar__tab"
            data-item={item.id}
            variant={item.id === active ? 'active' : 'default'}
            icon={item.icon}
            showIcon={showIcons}
            tabIndex={item.id === active ? 0 : -1}
            onClick={() => select(item.id)}
          >
            {item.label}
          </Tab>
        ))}
        {trailing && (
          <Tab
            class="bb-navbar__tab bb-navbar__tab--compact"
            data-item={trailing.id}
            variant="variant3"
            icon={trailing.icon ?? 'navbar-tab-icon'}
            tabIndex={trailing.id === active ? 0 : -1}
            onClick={() => select(trailing.id)}
          >
            {trailing.label}
          </Tab>
        )}
      </div>
    </nav>
  )
}
