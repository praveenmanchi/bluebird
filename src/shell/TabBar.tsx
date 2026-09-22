import { Icon, ICONS, Tab, type IconName } from '@shared/ui'
import { activeTabId, selectTab, visibleTabs } from './state'

const isIconName = (name: string): name is IconName => name in ICONS

export interface TabBarProps {
  /** The settings glyph at the right end of the row (Figma "accessibity UI" → settings instance). */
  onSettings?: () => void
}

/** Tab row from the Figma screen: Tab instances (Active / Default) left, the settings icon right, `Boader` rule below. */
export function TabBar({ onSettings }: TabBarProps) {
  const tabs = visibleTabs.value
  const active = activeTabId.value
  return (
    <nav class="bb-tabbar" aria-label="Sections">
      <div class="bb-tabbar__tabs" role="tablist">
        {tabs.map((tab) => (
          <Tab
            key={tab.id}
            variant={tab.id === active ? 'active' : 'default'}
            icon={isIconName(tab.icon) ? tab.icon : 'variables'}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </Tab>
        ))}
      </div>
      <button type="button" class="bb-tabbar__settings" aria-label="Settings" onClick={onSettings}>
        <Icon name="settings" />
      </button>
    </nav>
  )
}
