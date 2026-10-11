import type { JSX } from 'preact'
import './IssueType.css'

export type IssueTypeKind = 'story' | 'bug' | 'task' | 'epic' | 'subtask'

interface Glyph {
  /** The Figma "Vector" layer's bounding box in the 16×16 frame, so the SVG can be sized by the derived tokens. */
  viewBox: string
  d: string
  /** Story / Bug / Epic fill their glyph; Task / Subtask stroke it. */
  paint: 'fill' | 'stroke'
}

/** Vector geometry copied from the Figma "Issue Type" set (40000265:8019); colours come from CSS. */
const GLYPHS: Record<IssueTypeKind, Glyph> = {
  story: { viewBox: '5 4 6 8', d: 'M5 4H11V12L8 9.8L5 12V4Z', paint: 'fill' },
  bug: { viewBox: '5 5 6 6', d: 'M8 11C9.65685 11 11 9.65685 11 8C11 6.34315 9.65685 5 8 5C6.34315 5 5 6.34315 5 8C5 9.65685 6.34315 11 8 11Z', paint: 'fill' },
  task: { viewBox: '4.5 5.7 7 4.8', d: 'M4.5 8.2L6.8 10.5L11.5 5.7', paint: 'stroke' },
  epic: { viewBox: '5 3.5 6 9', d: 'M9 3.5L5 9H8L7 12.5L11 7H8L9 3.5Z', paint: 'fill' },
  subtask: { viewBox: '4 4 8 8', d: 'M4 4H9V9H4V4ZM7 7H12V12H7V7Z', paint: 'stroke' },
}

const LABEL: Record<IssueTypeKind, string> = {
  story: 'Story',
  bug: 'Bug',
  task: 'Task',
  epic: 'Epic',
  subtask: 'Subtask',
}

export interface IssueTypeProps extends Omit<JSX.HTMLAttributes<HTMLSpanElement>, 'type' | 'label'> {
  /** Figma "Type": Story / Bug / Task / Epic / Subtask. */
  type?: IssueTypeKind
  /** Accessible name; defaults to the type name ("Story"). */
  label?: string
}

/** Figma "Issue Type" (40000265:8019): the Jira issue-type square with its glyph. */
export function IssueType({ type = 'story', label, class: cls, ...rest }: IssueTypeProps) {
  const glyph = GLYPHS[type]
  return (
    <span {...rest} class={`bb-issue-type ${cls ?? ''}`} data-type={type} role="img" aria-label={label ?? LABEL[type]}>
      <svg class="bb-issue-type__glyph" viewBox={glyph.viewBox} data-paint={glyph.paint} aria-hidden="true">
        <path d={glyph.d} />
      </svg>
    </span>
  )
}
