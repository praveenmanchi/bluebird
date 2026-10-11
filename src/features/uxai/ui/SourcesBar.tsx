import { ContextChip, LinkButton } from '@shared/ui'
import { SOURCE_CHIPS_SHOWN, type Source } from '../fixtures'

export interface SourcesBarProps {
  sources: readonly Source[]
  onManage?: () => void
}

/** Figma "Sources bar": the included sources as Source chips (overflow → "+N") and "Manage sources". */
export function SourcesBar({ sources, onManage }: SourcesBarProps) {
  const included = sources.filter((s) => s.selected)
  const shown = included.slice(0, SOURCE_CHIPS_SHOWN)
  const more = included.length - shown.length
  return (
    <div class="bb-uxai-sources-bar">
      <div class="bb-uxai-sources-bar__chips" aria-label="Sources in use">
        <span class="bb-uxai-caption" data-weight="strong">Sources</span>
        {shown.map((s) => <ContextChip key={s.id} type="source" icon={s.icon}>{s.chip}</ContextChip>)}
        {more > 0 && <ContextChip type="source" icon="layers">{`+${more}`}</ContextChip>}
        {included.length === 0 && <span class="bb-uxai-caption">None selected</span>}
      </div>
      <LinkButton onClick={onManage}>Manage sources</LinkButton>
    </div>
  )
}
