import type { JSX } from 'preact'
import { LOGOS, type LogoName } from '@logos'
import { Icon, type IconName } from '../Icon/Icon'
import { Spinner } from '../Spinner/Spinner'
import './PipelineNode.css'

export type PipelineNodeStatus = 'done' | 'running' | 'error' | 'idle'

/** Status label read by assistive tech (the glyph's accessible name, or hidden text for Idle). */
const STATUS_LABEL: Record<PipelineNodeStatus, string> = { done: 'Done', running: 'Running', error: 'Error', idle: 'Idle' }

export interface PipelineNodeProps extends Omit<JSX.HTMLAttributes<HTMLDivElement>, 'name' | 'icon'> {
  /** Figma "Name". */
  name?: string
  /** Figma "Meta". */
  meta?: string
  /** Figma "Status": Done / Running / Error / Idle. */
  status?: PipelineNodeStatus
  /** Figma "Icon" instance swap from the Tab Icons set (default "layers"). */
  icon?: IconName
  /** Figma "Icon" swapped to a "brands" logo (the Pipeline's Repository node uses github). Wins over `icon`. */
  logo?: LogoName
}

function StatusGlyph({ status }: { status: PipelineNodeStatus }) {
  const label = STATUS_LABEL[status]
  if (status === 'running') return <Spinner tone="accent" label={label} class="bb-pipeline-node__status" />
  if (status === 'idle') return <span class="bb-pipeline-node__sr">{label}</span>
  return <Icon name={status === 'done' ? 'status-good' : 'status-error'} title={label} class="bb-pipeline-node__status" />
}

function NodeArt({ icon, logo }: { icon: IconName; logo?: LogoName }) {
  const art = logo ? LOGOS[logo] : undefined
  if (!art) return <Icon name={icon} class="bb-pipeline-node__icon" />
  return <svg class="bb-pipeline-node__icon" data-logo={logo} viewBox={art.viewBox} fill="none" aria-hidden="true" dangerouslySetInnerHTML={{ __html: art.body }} />
}

/** Figma "Pipeline Node" (40000341:8511): one stage of the publish pipeline — round icon box, status glyph + name, meta. */
export function PipelineNode({
  name = 'Figma file',
  meta = 'Bridge DS · v14',
  status = 'done',
  icon = 'layers',
  logo,
  class: cls,
  ...rest
}: PipelineNodeProps) {
  return (
    <div {...rest} class={`bb-pipeline-node ${cls ?? ''}`} data-status={status} aria-busy={status === 'running' ? 'true' : undefined}>
      <span class="bb-pipeline-node__icon-box">
        <NodeArt icon={icon} logo={logo} />
      </span>
      <span class="bb-pipeline-node__name-row">
        <StatusGlyph status={status} />
        <span class="bb-pipeline-node__name">{name}</span>
      </span>
      <span class="bb-pipeline-node__meta">{meta}</span>
    </div>
  )
}
