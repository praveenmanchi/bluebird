// Local ESLint plugin enforcing tab isolation.
//
//   features/<a>/**  may import  shared/**, its own folder, and node_modules.
//   features/<a>/**  may NOT import features/<b>/** (b !== a) or shell/**.
//   shared/**        may NOT import features/** or shell/**.
//   shell/**         may import shared/** and features/*/manifest only via the
//                    generated registry (the registry file itself is ignored).
//
// This is what makes "each tab has its own codebase" real: a cross-tab import
// is a build error, not a code-review comment.

import path from 'node:path'
import process from 'node:process'

const SRC = path.resolve(process.cwd(), 'src')

function layerOf(absPath) {
  const rel = path.relative(SRC, absPath).split(path.sep)
  if (rel[0] === 'features') return { layer: 'features', feature: rel[1] ?? null }
  if (rel[0] === 'shared') return { layer: 'shared', feature: null }
  if (rel[0] === 'shell') return { layer: 'shell', feature: null }
  return { layer: rel[0] ?? 'other', feature: null }
}

function resolveImport(fromFile, source) {
  if (source.startsWith('@shared/')) return path.join(SRC, 'shared', source.slice('@shared/'.length))
  if (source.startsWith('@features/')) return path.join(SRC, 'features', source.slice('@features/'.length))
  if (source.startsWith('@shell/')) return path.join(SRC, 'shell', source.slice('@shell/'.length))
  if (source.startsWith('.')) return path.resolve(path.dirname(fromFile), source)
  return null // bare module specifier (node_modules) — always allowed
}

const rule = {
  meta: {
    type: 'problem',
    docs: { description: 'Enforce feature (tab) isolation boundaries' },
    schema: [],
    messages: {
      crossFeature: 'Tab "{{from}}" must not import from tab "{{to}}". Move shared code into src/shared.',
      sharedImportsFeature: 'src/shared must not import from src/features or src/shell.',
      featureImportsShell: 'Tabs must not import from src/shell. The shell depends on tabs, never the reverse.',
    },
  },
  create(context) {
    const fromFile = context.filename ?? context.getFilename()
    const from = layerOf(fromFile)

    function check(node, source) {
      const target = resolveImport(fromFile, source)
      if (!target) return
      const to = layerOf(target)

      if (from.layer === 'features') {
        if (to.layer === 'features' && to.feature !== from.feature) {
          context.report({ node, messageId: 'crossFeature', data: { from: from.feature, to: to.feature } })
        }
        if (to.layer === 'shell') context.report({ node, messageId: 'featureImportsShell' })
      }
      if (from.layer === 'shared' && (to.layer === 'features' || to.layer === 'shell')) {
        context.report({ node, messageId: 'sharedImportsFeature' })
      }
    }

    return {
      ImportDeclaration(node) { check(node, node.source.value) },
      ExportAllDeclaration(node) { if (node.source) check(node, node.source.value) },
      ExportNamedDeclaration(node) { if (node.source) check(node, node.source.value) },
      ImportExpression(node) {
        if (node.source.type === 'Literal' && typeof node.source.value === 'string') check(node, node.source.value)
      },
    }
  },
}

export default { rules: { 'feature-boundaries': rule } }
