import type { IconName } from '@shared/ui'

export interface TourTabChip {
  id: string
  label: string
  icon: IconName
}

export interface SceneProps {
  /** End state, no motion (stories, prefers-reduced-motion). */
  still: boolean
  /** The persona's tabs, for scenes that show the tab list (Welcome). */
  tabs: readonly TourTabChip[]
}
