// Do the component properties in Figma still exist in code?
//
// `figma/components.json` carries every set's componentPropertyDefinitions, but until
// now nothing compared them to the component. Add a property in Figma and the code
// silently stayed behind — that is the drift this closes.
//
//  6. figma-prop-unmapped        a Figma property with no key in figma.ts
//  7. figma-prop-unknown-target  a mapping that names no real prop of <Code>Props
//  8. figma-setid-mismatch       figma.ts setId ≠ components.json ≠ figma/manifest.json
//
// The `props` map stays prose (`State: 'state | disabled'`) — only the KEYS are
// checked against Figma, and the value only has to mention one real prop somewhere.
// Keys that are not Figma property names (the 29 sets documenting composed children,
// e.g. 'Details rows') stay legal and unchecked.
import { readFileSync, existsSync } from 'node:fs'
import { resolve, relative } from 'node:path'
import ts from 'typescript'
import type { ComponentSetSnapshot, ComponentsSnapshot } from '../src/shared/brand/snapshot'

export interface Finding { rule: string; file: string; message: string; line?: number }

interface FigmaMeta {
  setId?: string
  props?: Record<string, string>
  /** Same meaning as `props`: a Figma property whose code counterpart is a card-level feature. */
  gapProps?: Record<string, string>
  /** Figma properties with no code prop at all — the value is the reason, not a prop name. */
  propGaps?: Record<string, string>
}

const IDENTIFIER = /[A-Za-z_$][A-Za-z0-9_$]*/g

/** Own members of every `*Props` interface or type alias in the file, plus same-file ancestors
 *  and the component's own destructuring pattern. Syntax only — no createProgram, no checker,
 *  so imported or utility heritage (`Omit<JSX.HTMLAttributes<…>, …>`) is opaque and ignored. */
export function readPropNames(file: string): Set<string> {
  const out = new Set<string>()
  if (!existsSync(file)) return out
  const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const members = new Map<string, ts.NodeArray<ts.TypeElement>>()
  const heritage = new Map<string, string[]>()

  const collect = (name: string, list: ts.NodeArray<ts.TypeElement>) => members.set(name, list)
  source.forEachChild((node) => {
    if (ts.isInterfaceDeclaration(node)) {
      collect(node.name.text, node.members)
      heritage.set(node.name.text, (node.heritageClauses ?? []).flatMap((h) => h.types.map((t) => (ts.isIdentifier(t.expression) ? t.expression.text : ''))).filter(Boolean))
    } else if (ts.isTypeAliasDeclaration(node) && ts.isTypeLiteralNode(node.type)) {
      collect(node.name.text, node.type.members)
    }
  })

  const add = (name: string, seen = new Set<string>()) => {
    if (seen.has(name)) return
    seen.add(name)
    for (const m of members.get(name) ?? []) {
      if (!ts.isPropertySignature(m) && !ts.isMethodSignature(m)) continue
      if (ts.isIdentifier(m.name) || ts.isStringLiteral(m.name)) out.add(m.name.text)
    }
    for (const parent of heritage.get(name) ?? []) add(parent, seen)
  }
  for (const name of members.keys()) if (name.endsWith('Props')) add(name)

  // Components that type their props inline still destructure them by name.
  const walk = (node: ts.Node) => {
    if ((ts.isFunctionDeclaration(node) || ts.isArrowFunction(node) || ts.isFunctionExpression(node)) && node.parameters.length) {
      const binding = node.parameters[0]!.name
      if (ts.isObjectBindingPattern(binding)) {
        for (const el of binding.elements) if (ts.isIdentifier(el.name)) out.add((el.propertyName && ts.isIdentifier(el.propertyName) ? el.propertyName : el.name).text)
      }
    }
    node.forEachChild(walk)
  }
  walk(source)
  return out
}

function metaFileFor(set: ComponentSetSnapshot, root: string): string {
  return set.dir ? resolve(root, set.dir, `${set.code}.figma.ts`) : resolve(root, 'src/shared/ui', set.code, 'figma.ts')
}

function sourceFilesFor(set: ComponentSetSnapshot, root: string): string[] {
  const dir = set.dir ? resolve(root, set.dir) : resolve(root, 'src/shared/ui', set.code)
  return [resolve(dir, `${set.code}.tsx`), resolve(dir, 'types.ts')].filter((f) => existsSync(f))
}

export async function checkProps(root: string, components: ComponentsSnapshot, manifestIds: Map<string, string>): Promise<Finding[]> {
  const findings: Finding[] = []
  for (const set of components.sets) {
    if (set.status === 'planned' || set.status === 'alias') continue
    const metaFile = metaFileFor(set, root)
    const rel = relative(root, metaFile)
    if (!existsSync(metaFile)) { findings.push({ rule: 'figma-prop-unmapped', file: rel, message: `Figma set "${set.name}" has no figma.ts` }); continue }
    const meta = ((await import(metaFile)) as { figma?: FigmaMeta }).figma ?? {}

    const manifestId = manifestIds.get(set.code)
    if (meta.setId !== set.id) findings.push({ rule: 'figma-setid-mismatch', file: rel, message: `setId is ${meta.setId ?? 'missing'} but figma/components.json says ${set.id}` })
    if (manifestId !== undefined && manifestId !== set.id) findings.push({ rule: 'figma-setid-mismatch', file: 'figma/manifest.json', message: `${set.code} is ${manifestId} in the manifest but ${set.id} in components.json — the next pull would snapshot a different node` })
    if (manifestId === undefined) findings.push({ rule: 'figma-setid-mismatch', file: 'figma/manifest.json', message: `${set.code} is built but has no manifest entry, so figma:pull never refreshes it` })

    const mapped = { ...meta.props, ...meta.gapProps }
    const excused = new Set(Object.keys(meta.propGaps ?? {}))
    for (const name of Object.keys(set.props)) {
      if (name in mapped || excused.has(name)) continue
      const def = set.props[name]!
      findings.push({ rule: 'figma-prop-unmapped', file: rel, message: `Figma property "${name}" (${def.type}) has no entry in props — add the code prop it maps to, or propGaps with the reason` })
    }

    const known = new Set(sourceFilesFor(set, root).flatMap((f) => [...readPropNames(f)]))
    if (!known.size) { findings.push({ rule: 'figma-prop-unknown-target', file: rel, message: `could not read any props from ${sourceFilesFor(set, root).map((f) => relative(root, f)).join(', ') || `${set.code}.tsx`}` }); continue }
    for (const [name, value] of Object.entries(mapped)) {
      if (!(name in set.props)) continue // prose documentation of a composed child, not a Figma property
      if ([...value.matchAll(IDENTIFIER)].some((m) => known.has(m[0]))) continue
      findings.push({ rule: 'figma-prop-unknown-target', file: rel, message: `props["${name}"] = "${value}" names no prop of ${set.code} — fix the mapping, or move it to propGaps` })
    }
  }
  return findings
}
