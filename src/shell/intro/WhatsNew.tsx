import { useEffect, useRef } from 'preact/hooks'
import { Button, Icon, ICONS, type IconName } from '@shared/ui'
import { tabDescription } from './steps'
import './CoachMarks.css'
import './WhatsNew.css'

export interface WhatsNewTab { id: string; label: string; icon: string }

export interface WhatsNewProps {
  tabs: readonly WhatsNewTab[]
  /** Keeps the New badges; the pop-up doesn't come back for these tabs. */
  onLater: () => void
  /** Points to each new tab in turn. */
  onShow: () => void
}

const iconOf = (name: string): IconName => (name in ICONS ? name as IconName : 'variables')

/** Figma section 4 "New tab added after an update": shown once, the first open after a tab ships. */
export function WhatsNew({ tabs, onLater, onShow }: WhatsNewProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => { ref.current?.querySelector<HTMLButtonElement>('.bb-whats-new__show')?.focus() }, [])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onLater() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onLater])
  const single = tabs.length === 1 ? tabs[0] : null
  const title = single ? `New tab: ${single.label}` : `${tabs.length} new tabs`

  return (
    <div class="bb-intro" role="dialog" aria-modal="true" aria-labelledby="bb-whats-new-title">
      <svg class="bb-intro__scrim" width="100%" height="100%" aria-hidden="true"><rect width="100%" height="100%" class="bb-whats-new__scrim" /></svg>
      <div ref={ref} class="bb-whats-new">
        <div class="bb-whats-new__header">
          <span class="bb-whats-new__tile" aria-hidden="true"><Icon name={iconOf(single?.icon ?? 'variables')} /></span>
          <div class="bb-whats-new__titles">
            <span class="bb-whats-new__eyebrow">What’s new</span>
            <h2 id="bb-whats-new-title" class="bb-whats-new__title">{title}</h2>
          </div>
        </div>
        {single
          ? <p class="bb-whats-new__body">{tabDescription(single.id)} It is now in your tabs.</p>
          : (
            <>
              <p class="bb-whats-new__body">They are now in your tabs. We will point to each one in turn.</p>
              <ul class="bb-whats-new__list">
                {tabs.map((t) => (
                  <li key={t.id} class="bb-whats-new__row">
                    <Icon name={iconOf(t.icon)} />
                    <span class="bb-whats-new__name">{t.label}</span>
                    <span class="bb-whats-new__desc">{tabDescription(t.id)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        <div class="bb-whats-new__actions">
          <Button variant="secondary" onClick={onLater}>Later</Button>
          <Button class="bb-whats-new__show" onClick={onShow}>{single ? 'Show me' : 'Show me around'}</Button>
        </div>
      </div>
    </div>
  )
}
