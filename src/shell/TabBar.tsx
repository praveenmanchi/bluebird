import { ICONS, Tab, type IconName } from '@shared/ui'
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

/** Tab row from the Figma screen: Tab instances (Active / Default) left, the settings icon right, `Boader` rule below. */
export function TabBar({ onSettings, settingsActive = false, onTab }: TabBarProps) {
  const tabs = visibleTabs.value
  const active = activeTabId.value
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
          </Tab>
        ))}
      </div>
      <SettingsButton class="bb-tabbar__settings" active={settingsActive} onClick={onSettings} />
    </nav>
  )
}
