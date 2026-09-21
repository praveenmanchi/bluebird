// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'

export const MSG = {
  scan: 'a11y:scan',
  focus: 'a11y:focus',
  progress: 'a11y:progress',
} as const

export const scanScopeSchema = z.enum(['selection', 'page'])
export type ScanScope = z.infer<typeof scanScopeSchema>

export const scanRequestSchema = z.object({ scope: scanScopeSchema })
export type ScanRequest = z.infer<typeof scanRequestSchema>

export type ContrastLevel = 'fail' | 'aa-large' | 'aa' | 'aaa'

export interface ContrastIssue {
  nodeId: string
  name: string
  text: string
  fontSize: number
  isBold: boolean
  foreground: string
  background: string
  ratio: number
  level: ContrastLevel
}

export interface ScanResult {
  scope: ScanScope
  scanned: number
  textNodes: number
  issues: readonly ContrastIssue[]
  durationMs: number
}

export interface ScanProgress { visited: number }

export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export type FocusRequest = z.infer<typeof focusRequestSchema>
