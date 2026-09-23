// This tab's wire contract. Every type is prefixed with the tab id so it can
// never collide with another tab's messages.
import * as z from 'zod/mini'
import type { SpacingProperty } from './audit'

export const MSG = {
  audit: 'tokens:audit',
  focus: 'tokens:focus',
  selectAll: 'tokens:select-all',
  progress: 'tokens:progress',
} as const

export const auditScopeSchema = z.enum(['selection', 'page'])
export type AuditScope = z.infer<typeof auditScopeSchema>

export const auditRequestSchema = z.object({ scope: auditScopeSchema })
export type AuditRequest = z.infer<typeof auditRequestSchema>

export const focusRequestSchema = z.object({ nodeId: z.string().check(z.minLength(1)) })
export const selectRequestSchema = z.object({ nodeIds: z.array(z.string()).check(z.minLength(1)) })

/** A colour painted as a literal instead of read from a variable. */
export interface UnboundPaint {
  nodeId: string
  nodeIds: readonly string[]
  occurrences: number
  name: string
  kind: 'fill' | 'stroke'
  hex: string
  /** Variable whose value already matches this colour, when one exists. */
  suggestion?: { id: string; name: string }
}

/** An auto-layout length that is not on the spacing scale. */
export interface OffScaleSpacing {
  nodeId: string
  nodeIds: readonly string[]
  occurrences: number
  name: string
  property: SpacingProperty
  value: number
  /** Closest value the scale does offer. */
  nearest: number | null
}

export interface AuditMeta {
  file: string
  page: string
  brand: string
}

export interface AuditResult {
  scope: AuditScope
  meta: AuditMeta
  scanned: number
  /** Paints that already read a variable — the numerator of the coverage figure. */
  boundPaints: number
  unbound: readonly UnboundPaint[]
  offScale: readonly OffScaleSpacing[]
  /** 0..1. */
  coverage: number
  durationMs: number
}

export interface AuditProgress { visited: number }
