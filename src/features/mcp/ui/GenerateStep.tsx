import { Checkbox, CodeSnippet, PublishEmptyState, SectionTitle, SegmentTab } from '@shared/ui'
import { FRAMEWORKS, GENERATION_LOG, INCLUDE_LABELS, PATHS, STYLINGS, type IncludeOption } from '../fixtures'
import { activeFile, checkResult, files, framework, generation, goTo, include, path, selection, styling } from '../state'
import { ActionBar } from './ActionBar'
import { Card } from './cards'
import { OptionSelect } from './OptionSelect'
import './GenerateStep.css'

export interface GenerateStepProps {
  onCopyPrompt: () => void
}

const INCLUDE_ORDER: readonly IncludeOption[] = ['codeConnect', 'story', 'test']

function Options() {
  return (
    <>
      <div class="bb-mcp-handoff__options">
        <OptionSelect label="Framework" value={framework.value} options={FRAMEWORKS} onChange={(v) => { framework.value = v }} />
        <OptionSelect label="Styling" value={styling.value} options={STYLINGS} onChange={(v) => { styling.value = v }} />
        <OptionSelect label="Output path" value={path.value} options={PATHS} onChange={(v) => { path.value = v }} />
      </div>
      <div class="bb-mcp-handoff__toggles">
        {INCLUDE_ORDER.map((id) => (
          <Checkbox
            key={id}
            label={INCLUDE_LABELS[id]}
            checked={include.value[id]}
            onChange={(checked) => { include.value = { ...include.value, [id]: checked } }}
          />
        ))}
      </div>
    </>
  )
}

/** What the checks counted, as the one-line summary under the preview and in the action bar. */
export function generationSummary(): string {
  const n = files.value.length
  const st = checkResult.value?.stats
  const filesPart = `${n} ${n === 1 ? 'file' : 'files'}`
  if (!st) return filesPart
  const raw = st.rawPaints + st.rawNumbers
  return `${filesPart} · reuses ${st.libraryInstances} ${st.libraryInstances === 1 ? 'component' : 'components'} · ${raw} hardcoded ${raw === 1 ? 'value' : 'values'}`
}

function Generated() {
  const list = files.value
  const shown = list.find((f) => f.name === activeFile.value) ?? list[0]!
  const raw = (checkResult.value?.stats.rawPaints ?? 0) + (checkResult.value?.stats.rawNumbers ?? 0)
  return (
    <>
      <div class="bb-mcp-handoff__files" role="tablist" aria-label="Generated files">
        {list.map((f) => (
          <SegmentTab key={f.name} icon="text" selected={f.name === shown.name} onClick={() => { activeFile.value = f.name }}>
            {f.name}
          </SegmentTab>
        ))}
      </div>
      <CodeSnippet role="tabpanel" aria-label={shown.name} language={shown.caption} code={shown.code} />
      <p class="bb-mcp-handoff__caption">
        {raw > 0 ? `${raw} hardcoded ${raw === 1 ? 'value ships' : 'values ship'} as --bb-derived-* tokens until ${raw === 1 ? 'it is' : 'they are'} bound in Figma. ` : ''}
        Preview of the output shape. The real files are generated in Claude Code or Cursor from {selection.value?.frame ?? 'the selection'} through the Figma MCP server — Copy prompt for Claude Code hands them the selection, your options and these checks.
      </p>
    </>
  )
}

/** Figma "MCP v2 · 3 Generate" and "Error · Generation failed" (the MCP call timed out). */
export function GenerateStep({ onCopyPrompt }: GenerateStepProps) {
  const failed = generation.value === 'failed'
  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Generate code">
          <SectionTitle title="Generate code" showCount={false} actionLabel="Copy prompt" onAction={onCopyPrompt} />
          <Options />
          {failed ? (
            <>
              <PublishEmptyState
                state="failed"
                icon="mcp"
                title="Code generation failed"
                body={`The MCP server timed out after 60 s while reading ${selection.value?.frame ?? 'the selection'}. Retry, or copy the prompt and run it in Claude Code.`}
                actions={[{ label: 'Copy prompt', variant: 'secondary', onClick: onCopyPrompt }, { label: 'Retry', variant: 'primary', onClick: () => { generation.value = 'done' } }]}
              />
              <SectionTitle title="MCP log" showCount={false} showAction={false} />
              <CodeSnippet language="Log" code={GENERATION_LOG} />
            </>
          ) : <Generated />}
        </Card>
      </div>
      <ActionBar
        summary={failed ? 'Nothing was generated.' : generationSummary()}
        secondary={[{ label: 'Copy prompt for Claude Code', onClick: onCopyPrompt }, { label: 'Back', onClick: () => goTo(1) }]}
        primary={{ label: 'Next: Ship', disabled: failed, onClick: () => goTo(3) }}
      />
    </>
  )
}
