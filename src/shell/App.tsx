import { useEffect, useMemo, useRef, useState } from 'preact/hooks'
import { RpcProvider, EmptyState, Footer, ICONS, type IconName } from '@shared/ui'
import type { BrandId } from '@shared/brand'
import type { RpcClient, Transport } from '@shared/bridge'
import { features } from './registry.generated'
import { Banner } from './Banner'
import { TabBar } from './TabBar'
import { activePersonaId, activeTabId, brandPersonas, brandStatus, changingPersona, connection, screen, selectTab, session, visibleTabs, windowSize, minimized } from './state'
import { LoginScreen } from './LoginScreen'
import { SettingsScreen } from './SettingsScreen'
import { OnboardingScreen } from './OnboardingScreen'
import { TeamSetupScreen } from './TeamSetupScreen'
import { FigmaKeyScreen } from './FigmaKeyScreen'
import { IntroLayer } from './intro/IntroLayer'
import { introState, newTabsOf } from './intro/state'
import { SplashScreen } from './SplashScreen'
import { PersonaScreen } from './PersonaScreen'
import { PersonaHandOver } from './persona/HandOver'
import { MiniLauncher } from './minimize/MiniLauncher'
import { bootSession, canSignOut, cancelPersonaChange, changePersona, choosePersona, completeOnboarding, finishFigmaKey, finishTeamSetup, login, loginWithSso, logout, replayOnboarding, reset } from './session'
import { integrationsApi } from './integrations/client'
import { DEFAULT_INTEGRATIONS, INTEGRATIONS_MSG, refreshMs, type IntegrationSettings } from '@shared/integrations'
import { historyUnseen, watchHistory } from '@shared/history/watch'
import { WINDOW_PRESETS, clampWindow, presetFor, type WindowPreset, type WindowSize } from '@shared/config'
import { OPEN_SETTINGS_EVENT, OPEN_TAB_EVENT } from '@shared/navigation'
import { ensureLibraryState, libraryPill, libraryState, loadLibraryState } from '@shared/libraries/status'
import { inDevMode } from '@shared/editor'
import { gitPill, integrationSettings, mcpPill, uxaiPill } from './footerStatus'

export interface AppProps { client: RpcClient; transport: Transport }

const isIconName = (name: string): name is IconName => name in ICONS

export function App({ client, transport }: AppProps) {
  useEffect(() => {
    const offStatus = transport.onStatus?.((s) => { connection.value = s })
    void bootSession(client)
    return () => offStatus?.()
  }, [client, transport])

  // A tab asked for Settings (e.g. Jira's "Connect Jira"); only once signed in.
  useEffect(() => {
    const open = () => { if (screen.value === 'app') screen.value = 'settings' }
    window.addEventListener(OPEN_SETTINGS_EVENT, open)
    return () => window.removeEventListener(OPEN_SETTINGS_EVENT, open)
  }, [])

  // A tab sent the person to another tab (e.g. Audit's "Fix these in Variable mapper").
  useEffect(() => {
    const open = (e: Event) => { selectTab((e as CustomEvent<string>).detail) }
    window.addEventListener(OPEN_TAB_EVENT, open)
    return () => window.removeEventListener(OPEN_TAB_EVENT, open)
  }, [])

  // The footer's Dual File pill reports the library connection: read once signed in, again after a Dual File save.
  const signedIn = screen.value === 'app' || screen.value === 'settings'
  useEffect(() => { if (signedIn) ensureLibraryState(client) }, [client, signedIn])

  const integrations = useMemo(() => {
    const api = integrationsApi(client)
    return {
      ...api,
      // A save updates the footer pills that read Settings (UX AI, MCP) and reconnects Dual File.
      save: async (...args: Parameters<typeof api.save>) => {
        const saved = await api.save(...args)
        const [section] = args
        if (integrationSettings.value) integrationSettings.value = { ...integrationSettings.value, [section]: saved }
        if (section === 'dualFile') void loadLibraryState(client)
        return saved
      },
      // A team setup file can change every section at once.
      importFile: async (file: unknown, keepExisting: boolean) => {
        const settings = await client.call<IntegrationSettings>(INTEGRATIONS_MSG.import, { file, keepExisting })
        integrationSettings.value = settings
        void loadLibraryState(client)
        return settings
      },
    }
  }, [client])

  // The UX AI and MCP pills read their Settings sections; read them once signed in.
  // Signing out (or Reset, which wipes Settings) forgets them, so the next sign-in reads them afresh.
  useEffect(() => {
    if (!signedIn) { integrationSettings.value = null; return }
    if (integrationSettings.value) return
    // Unreadable Settings read as the defaults: the pills then say what to set up instead of loading forever.
    integrations.load().then((s) => { integrationSettings.value = s }, () => { integrationSettings.value = DEFAULT_INTEGRATIONS })
  }, [integrations, signedIn])

  // Teammates' History entries: checked when the plugin opens and then on the Settings › Storage
  // interval while it stays open. The count badges the History tab until History is opened.
  const historyShown = signedIn && visibleTabs.value.some((t) => t.id === 'history')
  const settingsLoaded = integrationSettings.value !== null
  const historyEvery = refreshMs(integrationSettings.value?.storage?.refresh ?? '')
  useEffect(() => {
    if (!historyShown || !settingsLoaded) { historyUnseen.value = 0; return undefined }
    return watchHistory(client, historyEvery)
  }, [client, historyShown, settingsLoaded, historyEvery])
  const pillSettings = integrationSettings.value
  const entry = features.find((f) => f.manifest.id === activeTabId.value)

  /** The persona just confirmed: its bird flies on over the screen that opens next. */
  const [departed, setDeparted] = useState<string | null>(null)
  /** Footer info button presses: each one replays the open tab's intro. */
  const [introReplay, setIntroReplay] = useState(0)
  const [introOpen, setIntroOpen] = useState(false)
  const introTabs = useMemo(() => visibleTabs.value.map((t) => ({ id: t.id, label: t.label, icon: t.icon })), [visibleTabs.value])
  const newTabs = useMemo(() => new Set(newTabsOf(introState.value, introTabs.map((t) => t.id))), [introState.value, introTabs])
  const dragStart = useRef<WindowSize | null>(null)
  const size = windowSize.value

  function resize(next: WindowSize) {
    const clamped = clampWindow(next)
    if (clamped.width === windowSize.value.width && clamped.height === windowSize.value.height) return
    windowSize.value = clamped
    void client.call('shell:resize', clamped).catch(() => undefined)
  }
  const onPreset = (preset: WindowPreset) => { resize(WINDOW_PRESETS[preset]) }
  /** Minimize: the window shrinks to the Mini Launcher; windowSize keeps the size to come back to. */
  const onMinimize = () => {
    minimized.value = true
    void client.call('shell:minimize').catch(() => undefined)
  }
  /** Restore always resizes, even to the size windowSize already holds: the window itself is still 64 × 64. */
  const onRestore = () => {
    minimized.value = false
    void client.call('shell:resize', windowSize.value).catch(() => undefined)
  }
  const onResizeDrag = (delta: { dx: number; dy: number }, phase: 'move' | 'end') => {
    dragStart.current ??= size
    resize({ width: dragStart.current.width + delta.dx, height: dragStart.current.height + delta.dy })
    if (phase === 'end') dragStart.current = null
  }

  const current = screen.value
  const handOver = departed !== null && current !== 'persona'
    ? <PersonaHandOver personas={brandPersonas.value} brand={session.value?.brandId as BrandId | undefined} personaId={departed} onDone={() => { setDeparted(null) }} />
    : null
  if (current === 'boot') return <div class="h-full bb-canvas" aria-busy="true" />
  if (current === 'login') {
    return (
      <RpcProvider client={client}>
        <div class="h-full flex flex-col bb-canvas">
          <LoginScreen onSubmit={(code, accepted) => login(client, code, accepted)} onSso={loginWithSso} />
        </div>
      </RpcProvider>
    )
  }
  if (current === 'splash' || current === 'persona') {
    const brand = session.value?.brandId as BrandId | undefined
    const fromSettings = changingPersona.value
    return (
      <div class="h-full flex flex-col bb-canvas">
        {current === 'splash'
          ? <SplashScreen brand={brand} onDone={() => { screen.value = 'persona' }} />
          : <PersonaScreen personas={brandPersonas.value} brand={brand} intro={!fromSettings} initialId={fromSettings ? activePersonaId.value : null} onCancel={fromSettings ? cancelPersonaChange : undefined} onConfirm={(id) => { setDeparted(id); void choosePersona(client, id) }} />}
      </div>
    )
  }
  if (current === 'onboarding') {
    const tabs = visibleTabs.value.map((t) => ({ id: t.id, label: t.label, icon: isIconName(t.icon) ? t.icon : 'variables' as const }))
    return (
      <RpcProvider client={client}>
        <div class="h-full flex flex-col bb-canvas">
          <OnboardingScreen tabs={tabs} brand={session.value?.brandId as BrandId | undefined} onFinish={(skipped) => { void completeOnboarding(client, skipped) }} />
          {handOver}
        </div>
      </RpcProvider>
    )
  }
  if (current === 'team-setup') {
    return (
      <RpcProvider client={client}>
        <div class="h-full flex flex-col bb-canvas">
          <TeamSetupScreen brand={session.value?.brandId as BrandId | undefined} load={integrations.load} importFile={integrations.importFile} onFinish={finishTeamSetup} />
        </div>
      </RpcProvider>
    )
  }
  if (current === 'figma-key') {
    return (
      <RpcProvider client={client}>
        <div class="h-full flex flex-col bb-canvas">
          <FigmaKeyScreen client={client} brand={session.value?.brandId as BrandId | undefined} load={integrations.load} save={integrations.save} onFinish={finishFigmaKey} />
        </div>
      </RpcProvider>
    )
  }
  const inSettings = current === 'settings'
  return (
    <RpcProvider client={client}>
      {minimized.value && <MiniLauncher personaId={activePersonaId.value ?? ''} onRestore={onRestore} />}
      {/* Kept mounted while minimized, so every tab keeps its state. */}
      <div class="h-full flex flex-col bb-canvas" style={minimized.value ? { display: 'none' } : undefined}>
        <Banner />
        <TabBar settingsActive={inSettings} newTabs={newTabs} onSettings={() => { screen.value = inSettings ? 'app' : 'settings' }} onTab={() => { if (inSettings) screen.value = 'app' }} />
        <main class="flex-1 min-h-0 overflow-y-auto">
          {inSettings
            ? <SettingsScreen session={session.value} brand={brandStatus.value} onLogout={canSignOut() ? () => logout(client) : undefined} onReset={() => reset(client)} personas={brandPersonas.value} personaId={activePersonaId.value} onChangePersona={changePersona} integrations={integrations} onReplayTour={replayOnboarding} />
            : entry
              ? <entry.Tab key={entry.manifest.id} />
              : <EmptyState icon="inspect" title="No tabs enabled" description="Turn a tab on for this brand in dev.html › Plugin configuration (or plugin.config.json) and rebuild." />}
        </main>
        {handOver}
        {!inSettings && !minimized.value && <IntroLayer client={client} tabs={introTabs} activeTab={activeTabId.value} replay={introReplay} onOpenChange={setIntroOpen} onOpenTab={selectTab} />}
        <Footer onHelp={inSettings ? undefined : () => { setIntroReplay((n) => n + 1) }} helpActive={introOpen} resizable={!inDevMode.value} size={presetFor(size)} onSizeChange={onPreset} onMinimize={onMinimize} onResizeDrag={onResizeDrag} git={!inSettings} uxai={!inSettings} mcp={!inSettings} dualFile={!inSettings} statuses={{ git: gitPill(pillSettings?.github), uxai: uxaiPill(pillSettings?.ai), mcp: mcpPill(pillSettings?.mcp), dualFile: libraryPill(libraryState.value) }} />
      </div>
    </RpcProvider>
  )
}
