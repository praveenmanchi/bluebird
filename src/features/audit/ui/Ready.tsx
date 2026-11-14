import { Button, KpiTile, Notice, PipelineNode, SectionTitle, VersionOption } from '@shared/ui'
import { plural, runLabel } from '../format'
import type { LibraryCard, Scope } from '../messages'

const ROLE_LABEL: Readonly<Record<LibraryCard['role'], string>> = { components: 'Components', variables: 'Variables' }
const ROLE_ICON = { components: 'component', variables: 'variables' } as const

const STEPS = [
  { name: 'Scan', meta: 'Every layer in scope', icon: 'inspect' },
  { name: 'Match', meta: 'By published library key', icon: 'component' },
  { name: 'Report', meta: 'Mapped and not mapped', icon: 'visualization' },
] as const

export interface ReadyProps {
  libraries: readonly LibraryCard[]
  scope: Scope
  /** Layers selected on the canvas, the current page's name and screen count, and how many pages can be picked. */
  selected: number
  page: { name: string; screens: number }
  pageCount: number
  onScope: (scope: Scope) => void
  onChoosePages: () => void
  onRun: () => void
}

const heading = (title: string) => <SectionTitle class="bb-audit__heading" title={title} showCount={false} showAction={false} />

/** Figma "Audit v2 · 1 Ready": what the audit compares against, what to audit, and how it works. */
export function Ready({ libraries, scope, selected, page, pageCount, onScope, onChoosePages, onRun }: ReadyProps) {
  const chosen = scope.mode === 'pages' ? scope.pageIds.length : 0
  return (
    <>
      {heading('Compared against')}
      {libraries.length > 0 ? (
        <div class="bb-audit__cells">
          {libraries.map((l) => (
            <KpiTile key={l.role} tone="success" icon={ROLE_ICON[l.role]} value={l.count.toLocaleString()} label="published" caption={`${ROLE_LABEL[l.role]} · ${l.name}`} />
          ))}
        </div>
      ) : (
        <Notice tone="info" title="No library connected yet">Add your library files in Settings › Dual File Mode. Until then only this file’s own variables are checked.</Notice>
      )}

      {heading('Choose what to audit')}
      <div class="bb-audit__cells" role="radiogroup" aria-label="What to audit">
        <VersionOption name="bb-audit-scope" showBump={false} version="Selection" hint={selected ? `${plural(selected, 'layer')} selected` : 'Nothing selected'}
          selected={scope.mode === 'selection'} disabled={!selected} onSelect={() => onScope({ mode: 'selection' })} />
        <VersionOption name="bb-audit-scope" showBump={false} version="This page" hint={page.name ? `${page.name} · ${plural(page.screens, 'screen')}` : 'Every screen on this page'}
          selected={scope.mode === 'current'} onSelect={() => onScope({ mode: 'current' })} />
        <VersionOption name="bb-audit-scope" showBump={false} version="Chosen pages" hint={chosen ? `${plural(chosen, 'page')} chosen` : `Pick from ${plural(pageCount, 'page')}`}
          selected={scope.mode === 'pages'} onSelect={onChoosePages} onClick={() => { if (scope.mode === 'pages') onChoosePages() }} />
      </div>

      {heading('How it works')}
      <div class="bb-audit__cells">
        {STEPS.map((s) => <PipelineNode key={s.name} status="idle" name={s.name} meta={s.meta} icon={s.icon} />)}
      </div>

      <div class="bb-audit__run">
        <Button size="lg" onClick={onRun}>{runLabel(scope)}</Button>
        <span class="bb-audit__status">Library analytics across files is coming soon</span>
      </div>
    </>
  )
}
