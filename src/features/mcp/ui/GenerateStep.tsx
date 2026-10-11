import { Checkbox, CodeSnippet, PublishEmptyState, SectionTitle, SegmentTab } from '@shared/ui'
import { FRAMEWORKS, GENERATION_LOG, INCLUDE_LABELS, PATHS, STYLINGS, type IncludeOption } from '../fixtures'
import { activeFile, files, framework, generation, goTo, include, path, scenario, styling } from '../state'
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

function Generated() {
  const list = files.value
  const shown = list.find((f) => f.name === activeFile.value) ?? list[0]!
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
      <p class="bb-mcp-handoff__caption">{scenario.value.summary}</p>
    </>
  )
}

/** Figma "MCP v2 · 3 Generate" and "Error · Generation failed" (the MCP call timed out). */
export function GenerateStep({ onCopyPrompt }: GenerateStepProps) {
  const failed = generation.value === 'failed'
  const n = files.value.length
  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Generate code">
          <SectionTitle title="Generate code" showCount={false} actionLabel="Edit prompt" />
          <Options />
          {failed ? (
            <>
              <PublishEmptyState
                state="failed"
                icon="mcp"
                title="Code generation failed"
                body={`The MCP server timed out after 60 s while reading ${scenario.value.selection.frame}. Retry, or copy the prompt and run it in Claude Code.`}
                actions={[{ label: 'Copy prompt', variant: 'secondary', onClick: onCopyPrompt }, { label: 'Retry', variant: 'primary', onClick: () => { generation.value = 'done' } }]}
              />
              <SectionTitle title="MCP log" showCount={false} showAction={false} />
              <CodeSnippet language="Log" code={GENERATION_LOG} />
            </>
          ) : <Generated />}
        </Card>
      </div>
      <ActionBar
        summary={failed ? 'Nothing was generated.' : `${n} ${n === 1 ? 'file' : 'files'} · reuses 5 components · 0 hardcoded values`}
        secondary={[{ label: 'Back', onClick: () => goTo(1) }]}
        primary={{ label: 'Next: Ship', disabled: failed, onClick: () => goTo(3) }}
      />
    </>
  )
}
