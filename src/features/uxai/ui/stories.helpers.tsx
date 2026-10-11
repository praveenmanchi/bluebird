import type { ComponentChildren } from 'preact'

/** The M plugin window (480 × 640) the body renders in; pass a size to try S or L. */
export function Frame({ children, width = '600px', height = '760px' }: { children: ComponentChildren; width?: string; height?: string }) {
  return <div style={{ width, height, display: 'flex', flexDirection: 'column', background: 'var(--bb-background)', color: 'var(--bb-uxai-text-body)' }}>{children}</div>
}
