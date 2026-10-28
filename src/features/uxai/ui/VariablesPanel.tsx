import { ArtifactHeader, Button, SegmentedControl, VariableRow } from '@shared/ui'
import { PANEL_MODES, SWAP_OPTIONS, VARIABLES_PANEL, type BoundVariable, type PanelMode } from '../fixtures'

export interface VariablesPanelProps {
  variables: readonly BoundVariable[]
  mode: PanelMode
  onMode?: (mode: PanelMode) => void
  onSwap?: (index: number, value: string) => void
  onDiscard?: () => void
  onApply?: () => void
}

/** "surface/accent" → "var(--bb-surface-accent)", the generated CSS name of a Figma variable. */
const tokenColor = (variable: string) => `var(--bb-${variable.replace(/\//g, '-')})`

const changed = (v: BoundVariable) => v.value !== v.token

/** Figma "Variables panel" in the Selection answer: bound variables, each swappable, then Discard / Apply. */
export function VariablesPanel({ variables, mode, onMode, onSwap, onDiscard, onApply }: VariablesPanelProps) {
  const changes = variables.filter(changed).length
  return (
    <section class="bb-uxai-variables" aria-label={VARIABLES_PANEL.title}>
      <ArtifactHeader icon="variables" title={VARIABLES_PANEL.title} subtitle={VARIABLES_PANEL.subtitle} actionLabel={VARIABLES_PANEL.action} class="bb-uxai-variables__header" />
      <div class="bb-uxai-variables__rows">
        {variables.map((v, i) => (
          <VariableRow
            key={i}
            class="bb-uxai-variables__row"
            token={v.token}
            where={changed(v) ? `${v.where} · pending: ${v.value}` : v.where}
            kind={v.kind}
            state={changed(v) ? 'changed' : 'default'}
            color={v.kind === 'color' ? tokenColor(v.value) : undefined}
            amount={v.amount}
            value={v.value}
            options={SWAP_OPTIONS[v.kind]}
            onChange={(next) => onSwap?.(i, next)}
          />
        ))}
      </div>
      <div class="bb-uxai-variables__footer">
        <SegmentedControl class="bb-uxai-variables__modes" aria-label="Edit mode" options={PANEL_MODES} value={mode} onChange={(m) => onMode?.(m)} />
        <div class="bb-uxai-variables__apply">
          <span class="bb-uxai-variables__summary">{`${changes} ${changes === 1 ? 'change' : 'changes'} · ${VARIABLES_PANEL.variants} variants`}</span>
          <Button variant="secondary" width="fixed" disabled={changes === 0} onClick={onDiscard}>Discard</Button>
          <Button variant="primary" width="fixed" leadingIcon="ui-general-check" disabled={changes === 0} onClick={onApply}>Apply</Button>
        </div>
      </div>
    </section>
  )
}
