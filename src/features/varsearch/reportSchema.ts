// The sandbox's check on an Add to Figma request. Kept out of report.ts so the plugin UI,
// which only builds the report, does not ship the schema.
import * as z from 'zod/mini'
import type { SearchReport } from './report'

const rowSchema = z.object({ name: z.string(), kind: z.string(), page: z.string(), nodes: z.number(), nodeId: z.nullable(z.string()) })
const sectionSchema = z.object({
  name: z.string(), meta: z.string(), source: z.string(), counts: z.string(),
  rows: z.array(rowSchema).check(z.maxLength(2000)),
})
export const searchReportSchema = z.object({
  query: z.string(),
  frameName: z.string(),
  title: z.string(),
  details: z.array(z.tuple([z.string(), z.string()])),
  totals: z.array(z.object({ value: z.string(), label: z.string(), note: z.string() })),
  summary: z.string(),
  sections: z.array(sectionSchema).check(z.maxLength(200)),
  footer: z.string(),
  fileKey: z.nullable(z.string()),
})
export const reportRequestSchema = z.object({ report: searchReportSchema })

// The schema and the report type must describe the same shape.
type Same<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never
const sameShape: Same<z.infer<typeof searchReportSchema>, SearchReport> = true
void sameShape
