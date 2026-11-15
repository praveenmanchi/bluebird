import { useEffect, useMemo, useState } from 'preact/hooks'
import type { RpcClient } from '@shared/bridge'
import { CoachMarks } from './CoachMarks'
import { WhatsNew, type WhatsNewTab } from './WhatsNew'
import { LAYOUT_INTRO, tabIntroSteps, type IntroStep } from './steps'
import { firstRunPatch, introState, releasedTabs, loadIntro, markAnnounced, markLayoutDone, markOpened, markTabSeen, nextIntro, saveIntro, type IntroMode } from './state'

/** Lets the open tab paint its first state before the intro measures it. */
const SETTLE_MS = 300

export interface IntroLayerProps {
  client: RpcClient
  tabs: readonly WhatsNewTab[]
  activeTab: string | null
  /** Bumped by the footer's info button: replays the open tab's intro. */
  replay: number
  /** True while an intro or the What's new pop-up is open (the footer info button shows Active). */
  onOpenChange?: (open: boolean) => void
  /** Opens a tab (the new-tab pointer's last button). */
  onOpenTab: (id: string) => void
}

/**
 * Figma flow map (★ First-run flow, 40002981:43532): after the tour, team setup and Figma key the
 * app shows the layout intro once, then each tab's intro the first time it opens. After an update
 * that adds a tab: What's new → point to the tab → its intro. Rendered only on the app screen.
 */
export function IntroLayer({ client, tabs, activeTab, replay, onOpenChange, onOpenTab }: IntroLayerProps) {
  const [mode, setMode] = useState<IntroMode | null>(null)
  const [settled, setSettled] = useState(false)
  const state = introState.value
  const visible = useMemo(() => tabs.map((t) => t.id), [tabs])
  const label = (id: string) => tabs.find((t) => t.id === id)?.label ?? id

  useEffect(() => { if (!introState.value) void loadIntro(client) }, [client])

  // First run: every tab this build ships counts as known. Opening a new tab clears its badge.
  useEffect(() => {
    if (!state) return
    const first = firstRunPatch(state, releasedTabs())
    if (first) { saveIntro(client, first); return }
    if (activeTab) { const opened = markOpened(state, activeTab); if (opened) saveIntro(client, opened) }
  }, [client, state, visible, activeTab])

  // Wait for the tab to paint after it changes.
  useEffect(() => {
    setSettled(false)
    const t = setTimeout(() => setSettled(true), SETTLE_MS)
    return () => clearTimeout(t)
  }, [activeTab])

  useEffect(() => {
    if (mode || !state || !settled || state.knownTabs === null) return
    setMode(nextIntro(state, visible, activeTab))
  }, [mode, state, settled, visible, activeTab])

  useEffect(() => { if (replay > 0 && activeTab) setMode({ kind: 'tab', tabId: activeTab, replay: true }) }, [replay])

  useEffect(() => { onOpenChange?.(mode !== null) }, [mode, onOpenChange])

  if (!mode || !state) return null
  const current = introState.value ?? state

  if (mode.kind === 'layout') {
    return <CoachMarks key="layout" steps={LAYOUT_INTRO} label="Plugin layout intro" doneLabel="Got it" onClose={() => { saveIntro(client, markLayoutDone()); setMode(null) }} />
  }
  if (mode.kind === 'whatsnew') {
    const items = mode.tabs.map((id) => tabs.find((t) => t.id === id)).filter((t): t is WhatsNewTab => Boolean(t))
    return (
      <WhatsNew
        tabs={items}
        onLater={() => { saveIntro(client, markAnnounced(current, mode.tabs)); setMode(null) }}
        onShow={() => { saveIntro(client, markAnnounced(current, mode.tabs)); setMode({ kind: 'newtab', tabs: mode.tabs }) }}
      />
    )
  }
  if (mode.kind === 'newtab') {
    const steps: IntroStep[] = mode.tabs.map((id) => ({
      target: `.bb-tabbar__tabs [data-tab="${id}"]`,
      title: `Here is ${label(id)}`,
      body: 'Click the tab to open it. A short intro shows you around the first time.',
    }))
    return (
      <CoachMarks
        key="newtab"
        steps={steps}
        label="New tab"
        hideProgress={steps.length === 1}
        doneLabel="Open tab"
        skipLabel="Not now"
        onClose={(completed) => { setMode(null); if (completed && mode.tabs[0]) onOpenTab(mode.tabs[0]) }}
      />
    )
  }
  return (
    <CoachMarks
      key={`tab-${mode.tabId}-${replay}`}
      steps={tabIntroSteps(mode.tabId, label(mode.tabId))}
      label={`${label(mode.tabId)} intro`}
      onClose={() => { saveIntro(client, markTabSeen(introState.value ?? current, mode.tabId)); setMode(null) }}
    />
  )
}
