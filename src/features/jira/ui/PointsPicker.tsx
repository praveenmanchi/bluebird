import { useCallback, useRef, useState } from 'preact/hooks'
import { DropdownMenu, MenuItem, StoryPoints } from '@shared/ui'
import { STORY_POINT_OPTIONS } from '../fixtures'
import { useDismiss } from './useDismiss'

export interface PointsPickerProps {
  points: number
  onChange: (points: number) => void
}

/** The Figma "Story Points" chip as a trigger: click to pick another estimate. */
export function PointsPicker({ points, onChange }: PointsPickerProps) {
  const [open, setOpen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const close = useCallback(() => setOpen(false), [])
  useDismiss(root, open, close)

  return (
    <div ref={root} class="bb-jira-popover">
      <button
        type="button"
        class="bb-jira-board__points-trigger"
        aria-label={`Story points: ${points}. Change`}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        <StoryPoints>{points}</StoryPoints>
      </button>
      {open && (
        <DropdownMenu class="bb-jira-popover__menu" aria-label="Story points">
          {STORY_POINT_OPTIONS.map((p) => (
            <MenuItem key={p} label={String(p)} selected={p === points} onSelect={() => { onChange(p); setOpen(false) }} />
          ))}
        </DropdownMenu>
      )}
    </div>
  )
}
