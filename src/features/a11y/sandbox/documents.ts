// The Export menu's canvas documents: the Figma report and the developer spec.
// Runs inside Figma. Validates the request, collects what it needs, draws, places.
import type { ReportDoc } from '../doc/types'
import { buildSpecDoc } from '../doc/spec-doc'
import { createReportRequestSchema, createSpecRequestSchema, type CreatedDocument } from '../messages'
import { createKit, place } from './doc-kit'
import { renderReport } from './report-canvas'
import { renderSpec } from './spec-canvas'
import { collectSpec, specRoot } from './spec-collect'

/** Who is running the plugin, for the "Created by" line. Needs the `currentuser` manifest permission. */
function createdBy(): string {
  try {
    return figma.currentUser?.name || 'Figma user'
  } catch {
    return 'Figma user'
  }
}

export async function createReport(payload: unknown): Promise<CreatedDocument> {
  const request = createReportRequestSchema.parse(payload)
  const kit = await createKit(request.theme)
  const root = await renderReport(kit, request.doc as unknown as ReportDoc, request.branding, createdBy())
  const selection = figma.currentPage.selection
  place(root, selection.length ? selection : figma.currentPage.children.filter((n) => n.id !== root.id))
  return { nodeId: root.id, name: root.name }
}

export async function createSpec(payload: unknown): Promise<CreatedDocument> {
  const request = createSpecRequestSchema.parse(payload)
  const screen = specRoot(figma.currentPage.selection)
  if (!screen) throw new Error('Select the screen to spec — a frame, or anything inside one')
  const input = await collectSpec(screen)
  const createdOn = request.branding.createdAt.split(',')[0] ?? request.branding.createdAt
  const doc = buildSpecDoc(input, { ...request.audit, openIssues: request.audit.openIssues }, createdOn)
  const kit = await createKit(request.theme)
  const root = await renderSpec(kit, doc, request.branding, createdBy())
  place(root, [screen])
  return { nodeId: root.id, name: root.name }
}
