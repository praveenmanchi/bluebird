import { ContextChip, LinkButton } from '@shared/ui'
import { SOURCE_CHIPS_SHOWN, type Source } from '../fixtures'

/** The included sources as Source chips, the overflow folded into "+N" — shared by the screen's
 *  Sources bar and the Chat Input's own (Figma State "source expend"). */
export function SourceChips({ sources }: { sources: readonly Source[] }) {
  const included = sources.filter((s) => s.selected)
  const shown = included.slice(0, SOURCE_CHIPS_SHOWN)
  const more = included.length - shown.length
  return (
    <>
      {shown.map((s) => <ContextChip key={s.id} type="source" icon={s.icon}>{s.chip}</ContextChip>)}
      {more > 0 && <ContextChip type="source" icon="folder">{`+${more}`}</ContextChip>}
      {included.length === 0 && <span class="bb-uxai-caption">None selected</span>}
    </>
  )
}

export interface SourcesBarProps {
  sources: readonly Source[]
  onManage?: () => void
}

/** Figma "Sources bar": the included sources as Source chips (overflow → "+N") and "Manage sources". */
export function SourcesBar({ sources, onManage }: SourcesBarProps) {
  return (
    <div class="bb-uxai-sources-bar">
      <div class="bb-uxai-sources-bar__chips" aria-label="Sources in use">
        <span class="bb-uxai-caption" data-weight="strong">Sources</span>
        <SourceChips sources={sources} />
      </div>
      <LinkButton onClick={onManage}>Manage sources</LinkButton>
    </div>
  )
}
