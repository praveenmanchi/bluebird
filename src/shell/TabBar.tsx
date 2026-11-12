import { ICONS, Tab, type IconName } from '@shared/ui'
import { historyUnseen } from '@shared/history/watch'
import { SettingsButton } from './SettingsButton'
import { activeTabId, selectTab, visibleTabs } from './state'

const isIconName = (name: string): name is IconName => name in ICONS

export interface TabBarProps {
  /** The settings glyph at the right end of the row (Figma "accessibity UI" → settings instance). */
  onSettings?: () => void
  /** Figma "settings / Variant2": indicator stroke under the glyph while the settings screen is open. */
  settingsActive?: boolean
  /** Fired after a tab is selected (the shell uses it to leave the settings screen). */
  onTab?: (id: string) => void
}

/** Tab row from the Figma screen: Tab instances (Active / Default) left, the settings icon right, `Border` rule below. */
export function TabBar({ onSettings, settingsActive = false, onTab }: TabBarProps) {
  const tabs = visibleTabs.value
  const active = activeTabId.value
  const unseen = historyUnseen.value
  return (
    <nav class="bb-tabbar" aria-label="Sections">
      <div class="bb-tabbar__tabs" role="tablist">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            variant={tab.id === active && !settingsActive ? 'active' : 'default'}
            icon={isIconName(tab.icon) ? tab.icon : 'variables'}
            onClick={() => { selectTab(tab.id); onTab?.(tab.id) }}
          >
            {tab.label}
            {tab.id === 'history' && unseen > 0 && tab.id !== active && (
              <span class="bb-tabbar__badge" aria-label={`${unseen} new from teammates`}>{unseen > 99 ? '99+' : unseen}</span>
            )}
          </Tab>
        ))}
      </div>
      <SettingsButton class="bb-tabbar__settings" active={settingsActive} onClick={onSettings} />
    </nav>
  )
}
