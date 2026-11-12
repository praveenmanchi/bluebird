import { Button, Input, MetaBadge, SectionTitle } from '@shared/ui'
import { countKinds } from '../model'
import { plural, shortDateTime } from '../format'
import { branchMode, branches, compareBranch, hasBranches, newBranch, phase, pushResult, result, status } from '../state'
import { BranchSelect } from './BranchSelect'

export interface ToolbarProps {
  onExtract: () => void
}

function hint(): string {
  const s = status.value, r = result.value
  if (!s) return 'Checking GitHub…'
  if (!s.repo.connected) return 'Extractions are saved to the repository in Settings › GitHub.'
  if (r) {
    if (!r.baseline) return r.branch ? `${r.branch} has no extraction yet · everything in this file counts as new` : 'No branches yet · everything in this file counts as new'
    const k = countKinds(r.changes)
    return `Compared with ${r.branch} · extracted by ${r.baseline.by}, ${shortDateTime(r.baseline.at)} · +${k.added} added, ${k.modified} modified, ${k.removed} removed`
  }
  if (!hasBranches.value) return `${s.repo.repo} has no branches yet. Extract now — everything counts as new, and your first push creates the branch.`
  const picked = branches.value.find((b) => b.name === compareBranch.value)
  const latest = picked?.latest ? `latest extraction on ${picked.name}: ${picked.latest.by}, ${shortDateTime(picked.latest.at)}` : `${picked?.name ?? 'this branch'} has no extraction yet`
  return `${plural(branches.value.length, 'branch', 'branches')} · ${latest}`
}

/** Figma "Extraction v2" › "Extract and push": GitHub status, the branch to compare with, and Extract. */
export function Toolbar({ onExtract }: ToolbarProps) {
  const s = status.value, r = result.value
  const connected = !!s?.repo.connected
  const pushed = pushResult.value && pushResult.value.outcome !== 'rejected'
  return (
    <section class="bb-extraction__toolbar" aria-label="Extract and push">
      <div class="bb-extraction__header">
        <SectionTitle title="Extract and push" showCount={false} showAction={false} />
        {r && <MetaBadge tone={r.changes.length ? 'warning' : 'success'}>{r.changes.length ? 'Drift detected' : 'In sync'}</MetaBadge>}
        {!r && pushed && <MetaBadge tone="success">Pushed</MetaBadge>}
        {s && <MetaBadge tone={connected ? 'success' : 'danger'}>{connected ? 'GitHub connected' : 'GitHub not connected'}</MetaBadge>}
      </div>
      <div class="bb-extraction__compare">
        {connected && !hasBranches.value
          ? <Input class="bb-extraction__grow" label="New branch · created on your first push" placeholder="main" value={newBranch.value} onValueChange={(v) => { newBranch.value = v }} />
          : (
            <BranchSelect
              label="Compare with"
              value={compareBranch.value}
              branches={branches.value}
              disabled={!connected || phase.value === 'extracting'}
              onChange={(b) => { compareBranch.value = b }}
              extra={{ label: '+ Create new branch', onSelect: () => { branchMode.value = 'new' } }}
            />
          )}
        <Button variant={r ? 'secondary' : 'primary'} width="fixed" disabled={!connected} loading={phase.value === 'extracting'} onClick={onExtract}>
          {r ? 'Extract again' : 'Extract'}
        </Button>
      </div>
      <p class="bb-extraction__hint">{hint()}</p>
    </section>
  )
}
