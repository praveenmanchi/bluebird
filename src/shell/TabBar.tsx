import { Icon, ICONS, type IconName } from '@shared/ui'
import { activeTabId, selectTab, visibleTabs } from './state'

const isIconName = (name: string): name is IconName => name in ICONS

export function TabBar() {
  const tabs = visibleTabs.value
  const active = activeTabId.value
  return (
    <nav class="bb-tabbar" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={tab.id === active}
          onClick={() => selectTab(tab.id)}
          class="bb-tab"
        >
          {isIconName(tab.icon) && <span class="bb-tab__icon"><Icon name={tab.icon} /></span>}
          {tab.label}
        </button>
      ))}
    </nav>
  )
}
