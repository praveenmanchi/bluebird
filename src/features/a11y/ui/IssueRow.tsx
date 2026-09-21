import { Badge, useRpc } from '@shared/ui'
import { MSG, type ContrastIssue, type ContrastLevel } from '../messages'

const LEVEL: Record<ContrastLevel, { label: string; variant: 'red' | 'yellow' | 'green' | 'blue' }> = {
  fail: { label: 'Fail', variant: 'red' },
  'aa-large': { label: 'AA large', variant: 'yellow' },
  aa: { label: 'AA', variant: 'green' },
  aaa: { label: 'AAA', variant: 'blue' },
}

export function IssueRow({ issue }: { issue: ContrastIssue }) {
  const rpc = useRpc()
  const level = LEVEL[issue.level]
  return (
    <li>
      <button
        onClick={() => { void rpc.call(MSG.focus, { nodeId: issue.nodeId }).catch(() => undefined) }}
        class="w-full text-left px-3 py-2 flex items-center gap-2.5 hover:bg-zinc-50 transition-colors"
        title="Select layer in Figma"
      >
        <span class="w-6 h-6 rounded-sm border border-zinc-200 shrink-0 flex items-center justify-center text-[10px] font-semibold" style={{ background: issue.background, color: issue.foreground }} aria-hidden="true">Aa</span>
        <span class="min-w-0 flex-1">
          <span class="block text-[11px] text-zinc-900 truncate">{issue.text || issue.name}</span>
          <span class="block text-[10px] text-zinc-500">{issue.fontSize}px{issue.isBold ? ' bold' : ''} · {issue.foreground} on {issue.background}</span>
        </span>
        <span class="text-[11px] font-medium tabular-nums text-zinc-700">{issue.ratio.toFixed(2)}</span>
        <Badge variant={level.variant}>{level.label}</Badge>
      </button>
    </li>
  )
}
