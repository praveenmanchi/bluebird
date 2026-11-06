// Runs inside Figma. Everything that touches the document for this tab lives here.
import type { HandlerContext, HandlerMap } from '@shared/bridge'
import { traverse } from '@shared/figma/traverse'
import { librariesRuntime } from '@shared/libraries/handlers'
import type { LibraryLoadResult } from '@shared/libraries/types'
import { groupFindings } from '../match'
import {
  MSG, bindRequestSchema, gotoRequestSchema, selectRequestSchema, undoRequestSchema,
  type BindResult, type CheckProgress, type CheckResult, type Finding, type GotoResult, type SelectResult, type SourceInfo, type UndoResult,
} from '../messages'
import { bindTarget, holdsValue, restoreTarget, stillMatches, type Snapshot } from './apply'
import { findingsOf } from './collect'
import { createContexts } from './context'

export interface MapperDeps { loadLibraries: () => Promise<LibraryLoadResult> }

const plural = (n: number, one: string) => `${n.toLocaleString()} ${one}${n === 1 ? '' : 's'}`

function selectionInfo(selection: readonly SceneNode[], total: number, modes: readonly string[]): { name: string; meta: string } {
  const page = figma.currentPage.name.replace(/^[\s↳]+/, '')
  const mode = modes.length ? ` · ${modes.join(', ')} mode${modes.length === 1 ? '' : 's'}` : ''
  const values = `${plural(total, 'hard-coded value')}${mode}`
  if (selection.length === 1) {
    const kind = selection[0]!.type.charAt(0) + selection[0]!.type.slice(1).toLowerCase().replace(/_/g, ' ')
    return { name: selection[0]!.name, meta: `${kind} on ${page} · ${values}` }
  }
  return { name: plural(selection.length, 'layer'), meta: `On ${page} · ${values}` }
}

/** Finds a variable by key: this file's own first, then imported from its published library. */
async function variableFor(key: string): Promise<Variable> {
  const local = (await figma.variables.getLocalVariablesAsync()).find((v) => v.key === key)
  if (local) return local
  try {
    return await figma.variables.importVariableByKeyAsync(key)
  } catch {
    throw new Error('Figma couldn’t import that variable. Publish its library and add it to this file (Assets › Libraries), then try again.')
  }
}

const pageOf = (node: BaseNode): PageNode | null => {
  let p: BaseNode | null = node
  while (p && p.type !== 'PAGE') p = p.parent
  return p as PageNode | null
}

async function sceneNodes(ids: readonly string[]): Promise<SceneNode[]> {
  const nodes = await Promise.all(ids.map((id) => figma.getNodeByIdAsync(id)))
  return nodes.filter((n): n is SceneNode => !!n && n.type !== 'DOCUMENT' && n.type !== 'PAGE')
}

/** Oldest Binds drop off past this, so a long session can't grow without limit. */
const MAX_UNDO = 200

export function createHandlers(deps: MapperDeps): HandlerMap {
  const undoLog = new Map<string, { variableId: string; snapshots: readonly Snapshot[] }>()
  let nextUndo = 0

  async function check(_payload: unknown, ctx: HandlerContext): Promise<CheckResult> {
    const library = await deps.loadLibraries()
    if (library.status !== 'ready') return { status: 'no-source', message: library.message }
    const { files, variables } = library.index
    const sources = files.filter((f) => f.roles.includes('variables'))
    const failed = sources.find((f) => f.error)
    if (!variables.length && failed) return { status: 'source-failed', message: failed.error! }
    if (!variables.length) return { status: 'no-source', message: 'Add a Variables file in Settings › Dual File Mode.' }
    const source: SourceInfo = { name: sources.map((f) => f.name).join(', '), variables: variables.length }

    const selection = figma.currentPage.selection
    if (!selection.length) return { status: 'no-selection', source }

    const found: { node: SceneNode; values: readonly Finding[] }[] = []
    let skippedInstances = 0
    const visited = await traverse(selection, (node) => {
      if (node.type === 'INSTANCE') { skippedInstances += 1; return }
      if (node.visible) found.push({ node, values: findingsOf(node) })
    }, {
      // Layers inside an instance belong to its main component, so that is where they get fixed.
      skipChildren: (node) => node.type === 'INSTANCE' || !node.visible,
      onProgress: (n) => { ctx.emit(MSG.progress, { visited: n } satisfies CheckProgress) },
    })
    const contextOf = await createContexts(selection)
    const findings: Finding[] = []
    for (const { node, values } of found) {
      if (!values.length) continue
      const context = await contextOf(node)
      findings.push(...values.map((f) => ({ ...f, context })))
    }
    const groups = groupFindings(findings, variables)
    const modes = [...new Set(groups.flatMap((g) => (g.mode ? [g.mode] : [])))].sort()
    return { status: 'ready', source, selection: selectionInfo(selection, findings.length, modes), groups, visited, skippedInstances }
  }

  async function bind(payload: unknown): Promise<BindResult> {
    const { variableKey, targets, value, opacity, keepValue } = bindRequestSchema.parse(payload)
    const variable = await variableFor(variableKey)
    if (variable.resolvedType !== (typeof value === 'string' ? 'COLOR' : 'FLOAT')) throw new Error(`${variable.name} can’t hold this kind of value.`)
    const snapshots: Snapshot[] = []
    const restoredNodes: string[] = []
    let stuck = 0
    for (const target of targets) {
      const [node] = await sceneNodes([target.nodeId])
      if (!node || !stillMatches(node, target, value, opacity)) continue
      let snapshot: Snapshot
      try {
        snapshot = await bindTarget(node, target, variable)
      } catch {
        // A locked font or a field this layer can't bind: left as it was, and counted as skipped.
        continue
      }
      if (!keepValue || holdsValue(node, target, value, opacity)) { snapshots.push(snapshot); continue }
      try {
        if (await restoreTarget(node, snapshot, variable.id)) { restoredNodes.push(target.nodeId); continue }
      } catch {
        // Falls through: it stays bound, is reported, and Undo can still try.
      }
      stuck += 1
      snapshots.push(snapshot)
    }
    const restored = restoredNodes.length
    if (!snapshots.length && !restored) throw new Error('These layers changed since the check. Re-check to see what they hold now.')
    const undoId = `undo:${(nextUndo += 1)}`
    if (snapshots.length) {
      figma.commitUndo()
      undoLog.set(undoId, { variableId: variable.id, snapshots })
      if (undoLog.size > MAX_UNDO) undoLog.delete(undoLog.keys().next().value!)
    }
    return {
      bound: snapshots.length, skipped: targets.length - snapshots.length - restored, restored, restoredLayers: new Set(restoredNodes).size, stuck, variable: variable.name, undoId,
    }
  }

  async function undo(payload: unknown): Promise<UndoResult> {
    const { undoId } = undoRequestSchema.parse(payload)
    const entry = undoLog.get(undoId)
    if (!entry) throw new Error('That Bind can’t be undone from here any more. Use Cmd+Z in Figma.')
    let restored = 0
    for (const snapshot of entry.snapshots) {
      const [node] = await sceneNodes([snapshot.target.nodeId])
      try {
        if (node && await restoreTarget(node, snapshot, entry.variableId)) restored += 1
      } catch {
        // One bad layer must not strand the rest half-restored.
      }
    }
    undoLog.delete(undoId)
    if (restored) figma.commitUndo()
    return { restored, skipped: entry.snapshots.length - restored }
  }

  /** Figma selects on one page at a time; the check may have run on a page the designer has left. */
  async function reveal(nodes: readonly SceneNode[]): Promise<PageNode> {
    const page = pageOf(nodes[0]!)
    if (!page) throw new Error('Those layers are not on a page.')
    if (figma.currentPage !== page) await figma.setCurrentPageAsync(page)
    const onPage = nodes.filter((n) => pageOf(n) === page)
    figma.currentPage.selection = onPage
    figma.viewport.scrollAndZoomIntoView(onPage)
    return page
  }

  async function select(payload: unknown): Promise<SelectResult> {
    const { nodeIds } = selectRequestSchema.parse(payload)
    const nodes = await sceneNodes(nodeIds)
    if (!nodes.length) throw new Error('Those layers no longer exist. Re-check to refresh the list.')
    const page = await reveal(nodes)
    return { selected: nodes.length, page: page.name.replace(/^[\s↳]+/, '') }
  }

  async function goto(payload: unknown): Promise<GotoResult> {
    const { nodeId } = gotoRequestSchema.parse(payload)
    const [node] = await sceneNodes([nodeId])
    if (!node) throw new Error('That layer no longer exists. Re-check to refresh the list.')
    const page = await reveal([node])
    return { page: page.name.replace(/^[\s↳]+/, ''), name: node.name }
  }

  return { [MSG.check]: check, [MSG.bind]: bind, [MSG.undo]: undo, [MSG.select]: select, [MSG.goto]: goto }
}

export const handlers: HandlerMap = createHandlers({ loadLibraries: () => librariesRuntime().load() })
