import { useEffect } from 'preact/hooks'
import { useRpc } from '@shared/ui'
import { libraryState, loadLibraryState } from '@shared/libraries'
import { MSG, type AskResult, type SelectionContext } from '../messages'
import { draft, panelMode, reset, sources, turns, variables, view } from '../state'
import { applySwaps, discardSwaps, send, setPanelMode, showChat, showSources, stop, swapVariable, toggleSource, type Ground } from '../chat'
import { groundedAnswer, librarySources, selectIndex, selectionFailedAnswer, withClaude, withoutClaude, type GroundedAnswer } from '../grounding'
import { buildMessages, libraryContext } from '../prompt'
import { CLAUDE_TIMEOUT_MS } from '../claude'
import type { LibraryIndex } from '@shared/libraries'
import { UxaiSources } from './UxaiSources'
import { UxaiAnswer } from './UxaiAnswer'
import { UxaiComponent } from './UxaiComponent'
import { UxaiThinking } from './UxaiThinking'
import { UxaiSelection } from './UxaiSelection'
import { LibraryStatus } from './LibraryStatus'
import type { ChatScreenProps } from './types'

/** The prompt the Chat Input's "Use selection" tool drafts. */
const SELECTION_PROMPT = 'What variables are used in this?'

const SELECTION_TIMEOUT_MS = 30_000
/** The sandbox gives up on Claude at CLAUDE_TIMEOUT_MS; wait a little past it so its message arrives. */
const ASK_TIMEOUT_MS = CLAUDE_TIMEOUT_MS + 15_000

/**
 * UX AI tab: ask the design system questions, answered from the selected sources.
 *
 * Sources are the Dual File libraries (Settings › Dual File Mode) when they load: every answer
 * then searches their variables and components, and selection questions check what the
 * selection binds against them. Without them the tab shows sample sources and canned answers.
 *
 * Views: Sources (the welcome before the first question; the source list while "Manage sources" is
 * open) → a chat screen picked by the latest turn:
 * Thinking while an answer runs, Selection for a canned selection/swap question, Component for a
 * component question, Answer otherwise.
 */
export function Tab() {
  const rpc = useRpc()
  const lib = libraryState.value

  /** Loads through the shared state (the footer's Dual File pill follows it); a stale answer is dropped there. */
  const loadLibraries = (refresh = false) => {
    void loadLibraryState(rpc, refresh)
  }

  useEffect(() => {
    loadLibraries()
    return () => reset()
  }, [])

  // The sources follow the shared library state (this tab's Refresh, or a Settings save elsewhere).
  // A reload keeps the files the designer unticked unticked.
  useEffect(() => {
    // While a reload runs, keep what's shown (and which files are unticked) until the answer lands.
    if (lib.status === 'loading') return
    const unticked = new Set(sources.value.filter((s) => !s.selected).map((s) => s.id))
    sources.value = lib.status === 'ready'
      ? librarySources(lib.index).map((s) => (unticked.has(s.id) ? { ...s, selected: false } : s))
      : []
  }, [lib])

  const ground: Ground | undefined = lib.status === 'ready'
    ? async (prompt, kind) => {
      const ticked = new Set(sources.value.filter((s) => s.selected).map((s) => s.id))
      let selection: SelectionContext | null | undefined
      if (kind === 'selection') {
        try {
          selection = await rpc.call<SelectionContext | null>(MSG.selection, undefined, SELECTION_TIMEOUT_MS)
        } catch (error: unknown) {
          return selectionFailedAnswer(error instanceof Error ? error.message : 'Figma didn’t answer.')
        }
      }
      const index = selectIndex(lib.index, ticked)
      const answer = groundedAnswer(prompt, kind, index, selection)
      // Nothing selected: there is nothing for Claude to look at either.
      if (kind === 'selection' && !answer.selection) return answer
      return askClaude(prompt, kind, index, answer)
    }
    : undefined

  /** Claude writes the reply from the matching library context; when it isn't set up or fails, the library answer stands. */
  const askClaude = async (prompt: string, kind: Parameters<Ground>[1], index: LibraryIndex, answer: GroundedAnswer): Promise<GroundedAnswer> => {
    const history = turns.value
      .filter((t) => t.status === 'done' && t.grounded?.text)
      .map((t) => ({ prompt: t.prompt, answer: t.grounded!.text }))
    const messages = buildMessages(history, prompt, libraryContext(prompt, kind, index, answer.selection))
    try {
      const result = await rpc.call<AskResult>(MSG.ask, { messages }, ASK_TIMEOUT_MS)
      return result.status === 'answered' ? withClaude(answer, result.text, result.model) : answer
    } catch (error: unknown) {
      return withoutClaude(answer, error instanceof Error ? error.message : 'no reply')
    }
  }

  const onSend = (prompt: string) => send(prompt, ground)
  const focusNode = (nodeId: string) => { void rpc.call(MSG.focus, { nodeId }).catch(() => undefined) }
  const openUrl = (url: string) => { void rpc.call(MSG.open, { url }).catch(() => undefined) }
  const onDraft = (value: string) => { draft.value = value }
  const onUseSelection = () => { draft.value = SELECTION_PROMPT }

  const all = turns.value
  if (view.value === 'sources' || all.length === 0) {
    return (
      <UxaiSources
        sources={sources.value}
        managing={view.value === 'sources'}
        onToggleSource={toggleSource}
        draft={draft.value}
        onDraft={onDraft}
        onSend={onSend}
        onManageSources={showSources}
        onBack={showChat}
        hasConversation={all.length > 0}
        onUseSelection={onUseSelection}
        status={<LibraryStatus state={lib} onRefresh={() => loadLibraries(true)} />}
      />
    )
  }

  const props: ChatScreenProps = {
    turns: all,
    sources: sources.value,
    draft: draft.value,
    onDraft,
    onSend,
    onStop: stop,
    onManageSources: showSources,
    onUseSelection,
    onFocusNode: focusNode,
    onOpenUrl: openUrl,
  }
  const latest = all[all.length - 1]!
  if (latest.status === 'thinking') return <UxaiThinking {...props} />
  if (latest.kind === 'selection' && !latest.grounded) {
    return (
      <UxaiSelection
        {...props}
        variables={variables.value}
        panelMode={panelMode.value}
        onPanelMode={setPanelMode}
        onSwap={swapVariable}
        onDiscard={discardSwaps}
        onApply={applySwaps}
      />
    )
  }
  if (latest.kind === 'component' && !latest.grounded) return <UxaiComponent {...props} />
  return <UxaiAnswer {...props} />
}
