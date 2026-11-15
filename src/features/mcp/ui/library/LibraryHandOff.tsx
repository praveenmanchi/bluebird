import { CodeSnippet, Input, SectionTitle, SegmentedControl, type IconName } from '@shared/ui'
import { MAX_PROMPT_SCREENS, libraryOutputs, perScreen } from '../../library'
import { mcpSetup } from '../../prompt'
import { branch, branchError, branchOverride, chosenScreens, goTo, libraryInput, localMcp, prompt, release, target, view, type HandoffView } from '../../state'
import { ActionBar } from '../ActionBar'
import { Card } from '../cards'

export interface LibraryHandOffProps {
  onCopyPrompt: () => void
  /** On to Track without copying (the clipboard can be blocked). */
  onSkip: () => void
}

const VIEW_ICON: Readonly<Record<HandoffView, IconName>> = { prompt: 'ui-toolbar-dev-brackets', setup: 'ui-sidebar-saving-syncing', outputs: 'ui-toolbar-frame' }

/** Figma "MCP v3 · Library update · 3 Hand off": the update prompt for the screens the release affects. */
export function LibraryHandOff({ onCopyPrompt, onSkip }: LibraryHandOffProps) {
  const t = target.value
  const split = perScreen(t)
  const input = libraryInput.value
  const v = view.value
  const n = chosenScreens.value.length
  const text = v === 'setup' ? mcpSetup(localMcp.value) : v === 'outputs' ? (input ? libraryOutputs(input).join('\n') : '') : (prompt.value ?? '')
  const caption = v === 'setup' ? `MCP setup · ${localMcp.value ? 'desktop' : 'remote'} Figma MCP server` : v === 'outputs' ? 'What gets updated · Claude Code finds the files' : `Prompt · built from ${release.value?.title ?? 'the release'} and ${n} ${n === 1 ? 'screen' : 'screens'}`
  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Hand off">
          <SectionTitle title="Hand off to Claude Code" showCount={false} showAction={false} />
          <Input
            label={split ? 'Branch prefix' : 'Branch'}
            value={branch.value}
            helperText={branchError.value ?? (split ? 'Each screen gets its own branch under this prefix.' : undefined)}
            error={branchError.value !== null}
            maxLength={160}
            spellcheck={false}
            autoComplete="off"
            onValueChange={(value) => { branchOverride.value = value }}
          />
          <p class="bb-mcp-handoff__caption">
            {split ? `One pull request per screen` : 'One pull request for all screens'} into {t.branch} of {t.repo}. Set in Settings › MCP + code sync.
          </p>
          <SegmentedControl
            class="bb-mcp-handoff__files"
            aria-label="Hand-off views"
            options={[{ value: 'prompt', label: 'Prompt', icon: VIEW_ICON.prompt }, { value: 'setup', label: 'MCP setup', icon: VIEW_ICON.setup }, { value: 'outputs', label: 'What gets updated', icon: VIEW_ICON.outputs }]}
            value={v}
            onChange={(next: HandoffView) => { view.value = next }}
          />
          <CodeSnippet role="tabpanel" aria-label={caption} language={caption} code={text} />
          <p class="bb-mcp-handoff__caption">
            This prompt updates the existing screens. It does not rebuild them. Run it in Claude Code inside {t.repo}.
            {n > MAX_PROMPT_SCREENS ? ` Only the first ${MAX_PROMPT_SCREENS} of ${n} screens go in one hand-off: leave some out on Impact, or hand off the rest after this one.` : ''}
          </p>
        </Card>
      </div>
      <ActionBar
        summary={`Update prompt ready · ${n} ${n === 1 ? 'screen' : 'screens'} · goes to ${t.repo}`}
        secondary={[{ label: 'Back', onClick: () => goTo(1) }, { label: 'Next: Track', disabled: branchError.value !== null, onClick: onSkip }]}
        primary={{ label: 'Copy prompt', disabled: branchError.value !== null || prompt.value === null, onClick: onCopyPrompt }}
      />
    </>
  )
}
