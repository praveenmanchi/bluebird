import type { JSX } from 'preact'
import { PipelineNode, type PipelineNodeProps } from '../PipelineNode/PipelineNode'
import './Pipeline.css'

export type PipelineNodes = readonly [PipelineNodeProps, PipelineNodeProps, PipelineNodeProps]
export type PipelineLinks = readonly [boolean, boolean]

/** The Figma sample: Figma file → Repository → Docs site, the last one still building. */
export const PIPELINE_DEFAULT_NODES: PipelineNodes = [
  { name: 'Figma file', meta: '14 changes', status: 'done', icon: 'layers' },
  { name: 'Repository', meta: 'bridge-ds-site · main', status: 'done', logo: 'github' },
  { name: 'Docs site', meta: 'ds.bridge.design', status: 'running', icon: 'url' },
]
/** First link is publish/pipeline/link-active, second publish/pipeline/link (Figma). */
export const PIPELINE_DEFAULT_LINKS: PipelineLinks = [true, false]

export interface PipelineProps extends Omit<JSX.HTMLAttributes<HTMLOListElement>, 'aria-label'> {
  /** The three Pipeline Node instances, left to right. */
  nodes?: PipelineNodes
  /** Whether each Rail link is drawn active (the stage before it finished). */
  activeLinks?: PipelineLinks
  /** Accessible name of the list. */
  'aria-label'?: string
}

/** Figma "Pipeline" (40000345:8676): three Pipeline Nodes joined by two rail links, as an ordered list. */
export function Pipeline({
  nodes = PIPELINE_DEFAULT_NODES,
  activeLinks = PIPELINE_DEFAULT_LINKS,
  'aria-label': ariaLabel = 'Publish pipeline',
  class: cls,
  ...rest
}: PipelineProps) {
  return (
    <ol {...rest} class={`bb-pipeline ${cls ?? ''}`} aria-label={ariaLabel}>
      {nodes.map((node, i) => (
        <li key={i} class="bb-pipeline__item" data-first={i === 0 ? '' : undefined}>
          {i > 0 && (
            <span class="bb-pipeline__rail" aria-hidden="true">
              <span class="bb-pipeline__link" data-active={activeLinks[i - 1] ? '' : undefined} />
            </span>
          )}
          <PipelineNode {...node} />
        </li>
      ))}
    </ol>
  )
}
