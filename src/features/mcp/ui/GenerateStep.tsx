import { Checkbox, CodeSnippet, Input, SectionTitle, SegmentedControl, type IconName } from '@shared/ui'
import { INCLUDE_LABELS, INCLUDE_ORDER, STYLINGS, expectedOutputs, mcpSetup, outputPath, type HandoffMode } from '../prompt'
import { branch, branchError, branchOverride, components, goTo, include, kind, localMcp, mode, prompt, promptInput, selection, styling, target, view, type HandoffView } from '../state'
import { ActionBar } from './ActionBar'
import { Card } from './cards'
import { OptionSelect } from './OptionSelect'
import './GenerateStep.css'

export interface GenerateStepProps {
  /** Copies the prompt; when that works the flow moves on to Track. */
  onCopyPrompt: () => void
  /** On to Track without copying: the clipboard can be blocked, and the prompt can be selected by hand. */
  onSkip: () => void
}

const MODES: readonly { value: HandoffMode; label: string }[] = [{ value: 'build', label: 'New build' }, { value: 'update', label: 'Update existing' }]
const VIEW_ICON: Readonly<Record<HandoffView, IconName>> = { prompt: 'ui-toolbar-dev-brackets', setup: 'ui-sidebar-saving-syncing', outputs: 'ui-toolbar-component' }

function Options() {
  const m = mode.value
  return (
    <>
      <SegmentedControl class="bb-mcp-handoff__files" aria-label="Kind of hand-off" options={MODES} value={m} onChange={(v) => { mode.value = v }} />
      <div class="bb-mcp-handoff__fields">
        <div class="bb-mcp-handoff__field"><OptionSelect label="Styling" value={styling.value} options={STYLINGS} onChange={(v) => { styling.value = v }} /></div>
        <Input
          class="bb-mcp-handoff__field"
          label="Branch"
          value={branch.value}
          helperText={branchError.value ?? undefined}
          error={branchError.value !== null}
          maxLength={200}
          spellcheck={false}
          autoComplete="off"
          onValueChange={(v) => { branchOverride.value = v }}
        />
      </div>
      <div class="bb-mcp-handoff__toggles">
        {INCLUDE_ORDER.map((id) => (
          <Checkbox key={id} label={INCLUDE_LABELS[m][id]} checked={include.value[id]} onChange={(checked) => { include.value = { ...include.value, [id]: checked } }} />
        ))}
      </div>
    </>
  )
}

/** The snippet under the view switch: the prompt, the MCP registration, or the files the prompt asks for. */
function Snippet() {
  const input = promptInput.value
  const frame = selection.value?.frame ?? 'the selection'
  const v = view.value
  const outputs = mode.value === 'update' ? 'What gets updated' : 'What gets built'
  const text = v === 'setup' ? mcpSetup(localMcp.value) : v === 'outputs' ? (input ? expectedOutputs(input).join('\n') : '') : (prompt.value ?? '')
  const caption = v === 'setup' ? `MCP setup · ${localMcp.value ? 'desktop' : 'remote'} Figma MCP server` : v === 'outputs' ? `${outputs} · Claude Code decides the final file names` : `Prompt · built from ${frame} and its checks`
  return (
    <>
      <SegmentedControl
        class="bb-mcp-handoff__files"
        aria-label="Hand-off views"
        options={[{ value: 'prompt', label: 'Prompt', icon: VIEW_ICON.prompt }, { value: 'setup', label: 'MCP setup', icon: VIEW_ICON.setup }, { value: 'outputs', label: outputs, icon: VIEW_ICON.outputs }]}
        value={v}
        onChange={(next: HandoffView) => { view.value = next }}
      />
      <CodeSnippet role="tabpanel" aria-label={caption} language={caption} code={text} />
    </>
  )
}

/** One line under the actions: what the prompt will ask for. */
export function handoffSummary(): string {
  const n = components.value.length
  const t = target.value
  const what = mode.value === 'update' ? 'Update prompt ready' : 'Prompt ready'
  return `${what} · ${n} ${n === 1 ? 'component' : 'components'} to reuse · goes to ${t.repo}`
}

/** Figma "MCP v3 · 3 Hand off": the options, then the prompt Claude Code builds from. Nothing is generated here. */
export function GenerateStep({ onCopyPrompt, onSkip }: GenerateStepProps) {
  const input = promptInput.value
  const t = target.value
  const scenario = kind.value === 'screen' ? 'screen' : 'component'
  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Hand off">
          <SectionTitle title="Hand off to Claude Code" showCount={false} showAction={false} />
          <Options />
          <p class="bb-mcp-handoff__caption">
            {t.framework} · writes to {input ? outputPath(input) : t.folder} in {t.repo} (base {t.branch}){t.designPackage ? ` · imports from ${t.designPackage}` : ''}. Set in Settings › MCP + code sync.
          </p>
          <Snippet />
          <p class="bb-mcp-handoff__caption">
            {mode.value === 'update'
              ? `This prompt updates the existing ${scenario}. A variable whose value changed is left to the token push.`
              : `Claude Code reads the ${scenario} through the Figma MCP server and writes the files in ${t.repo}. Run it inside that repository.`}
          </p>
        </Card>
      </div>
      <ActionBar
        summary={handoffSummary()}
        secondary={[{ label: 'Back', onClick: () => goTo(1) }, { label: 'Next: Track', disabled: branchError.value !== null, onClick: onSkip }]}
        primary={{ label: 'Copy prompt', disabled: branchError.value !== null || prompt.value === null, onClick: onCopyPrompt }}
      />
    </>
  )
}
