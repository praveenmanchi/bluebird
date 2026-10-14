import { CheckItem, PublishEmptyState, ReadinessMeter, SectionTitle, Spinner } from '@shared/ui'
import { blocked, checkError, checkPhase, checkResult, checks, failingChecks, goTo, selection } from '../state'
import { ActionBar } from './ActionBar'
import { Card, SelectionLink, type SelectionLinkProps } from './cards'
import './CheckStep.css'

export interface CheckStepProps extends Pick<SelectionLinkProps, 'onOpenNode' | 'onCopyLink'> {
  /** Run the checks again (after a failure, or to pick up fixes made on the canvas). */
  onRetry: () => void
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

/** Figma "MCP v2 · 2 Check" and "Error · Not ready" (a failing check locks Generate). */
export function CheckStep({ onOpenNode, onCopyLink, onRetry }: CheckStepProps) {
  const s = selection.value
  const result = checkResult.value
  const phase = checkPhase.value
  const list = checks.value
  const warnings = list.filter((c) => c.status === 'warning').length
  const fails = failingChecks.value
  const ready = phase === 'done' && result !== null && list.length > 0
  const caption = ready && blocked.value ? `Generate locked · ${plural(fails, 'check')} ${fails === 1 ? 'is' : 'are'} failing` : undefined
  const summary = phase === 'loading' ? `Checking ${s?.frame ?? 'the selection'} layer by layer…`
    : phase === 'failed' ? (checkError.value ?? 'The checks could not run.')
      : !ready ? 'Run the checks to continue.'
        : blocked.value ? `${plural(fails, 'check')} must pass before you can generate`
          : `Ready to generate · ${plural(warnings, 'warning')} won’t block the push`
  const st = result?.stats

  return (
    <>
      <div class="bb-mcp-handoff__panels">
        <Card label="Handoff check">
          <SectionTitle title="Handoff readiness" showCount={false} showAction={ready} actionLabel="Re-check" onAction={onRetry} />
          {phase === 'loading' && <div class="bb-mcp-handoff__loading" role="status"><Spinner tone="accent" size="sm" label="Checking the selection" /><span class="bb-mcp-handoff__caption">Reading instances, variable bindings, auto layout and text styles…</span></div>}
          {phase === 'failed' && <PublishEmptyState state="failed" title="The checks could not run" body={checkError.value} actions={[{ label: 'Back', variant: 'secondary', onClick: () => goTo(0) }, { label: 'Try again', variant: 'primary', onClick: onRetry }]} />}
          {ready && (
            <>
              <ReadinessMeter tone={result.readiness.tone} value={result.readiness.value} caption={caption} />
              <ul class="bb-mcp-handoff__checks" aria-label="Handoff checks">
                {list.map((c) => (
                  <li key={c.id}><CheckItem status={c.status} title={c.title} detail={c.detail} actionLabel={c.actionLabel} onAction={() => s && onOpenNode?.(s.nodeId)} /></li>
                ))}
              </ul>
              {st && (
                <p class="bb-mcp-handoff__caption">
                  {plural(st.layers, 'layer')} · {plural(st.instances, 'instance')} ({st.libraryInstances} from the library) · {st.boundPaints + st.boundNumbers} of {st.boundPaints + st.boundNumbers + st.rawPaints + st.rawNumbers} values bound · {st.autoLayout} of {plural(st.frames, 'frame')} auto layout · {st.styledTexts} of {plural(st.texts, 'text layer')} styled
                </p>
              )}
            </>
          )}
        </Card>
        <Card label="Checking">
          <SectionTitle title="Checking" showCount={false} actionLabel="Change" onAction={() => goTo(0)} />
          {s && <SelectionLink selection={s} onOpenNode={onOpenNode} onCopyLink={onCopyLink} />}
        </Card>
      </div>
      <ActionBar
        summary={summary}
        secondary={[{ label: 'Back', onClick: () => goTo(0) }]}
        primary={{ label: 'Next: Generate', disabled: !ready || blocked.value, onClick: () => goTo(2) }}
      />
    </>
  )
}
