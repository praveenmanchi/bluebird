// Plugin window presets. The footer's S / M / L size expander steps through
// these; the sandbox applies them with figma.ui.resize and the dev harness
// resizes its iframe. plugin.config.json → window must stay inside WINDOW_BOUNDS.
export type WindowPreset = 'S' | 'M' | 'L'
export interface WindowSize { width: number; height: number }

export const WINDOW_PRESETS: Record<WindowPreset, WindowSize> = {
  S: { width: 360, height: 480 },
  M: { width: 480, height: 640 },
  L: { width: 600, height: 760 },
}

/** S is the minimum; the expand button jumps to the maximum. */
export const WINDOW_BOUNDS = { minWidth: 360, maxWidth: 760, minHeight: 480, maxHeight: 960 } as const
export const WINDOW_MAX: WindowSize = { width: WINDOW_BOUNDS.maxWidth, height: WINDOW_BOUNDS.maxHeight }

export function clampWindow({ width, height }: WindowSize): WindowSize {
  return {
    width: Math.min(WINDOW_BOUNDS.maxWidth, Math.max(WINDOW_BOUNDS.minWidth, Math.round(width))),
    height: Math.min(WINDOW_BOUNDS.maxHeight, Math.max(WINDOW_BOUNDS.minHeight, Math.round(height))),
  }
}

export function presetFor(size: WindowSize): WindowPreset | undefined {
  return (Object.keys(WINDOW_PRESETS) as WindowPreset[]).find((k) => WINDOW_PRESETS[k].width === size.width && WINDOW_PRESETS[k].height === size.height)
}
