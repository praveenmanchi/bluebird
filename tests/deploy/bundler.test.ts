// @vitest-environment node
import { describe, it, expect, beforeEach } from 'vitest'
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deployEsbuildPlugin, deployFiles, deployVitePlugin, describeDeploy, planDeploy } from '../../tools/deploy/bundler'
import { rawConfig } from './fixture'

let root: string

function repo(deploy?: unknown): string {
  const files = deployFiles(root)
  writeFileSync(files.config, JSON.stringify(rawConfig(deploy)))
  mkdirSync(join(root, 'src/shared/ui/BrandLogo'), { recursive: true })
  mkdirSync(join(root, 'src/shared/brand/generated'), { recursive: true })
  writeFileSync(files.logos, 'export const LOGOS = {\n  "ikea": { viewBox: "0 0 1 1", body: "i" },\n  "gap": { viewBox: "0 0 1 1", body: "g" },\n}\n')
  writeFileSync(files.tokens, 'export const BRANDS = [\n  "bridge",\n  "ikea",\n  "gap",\n] as const\n')
  return root
}

beforeEach(() => { root = mkdtempSync(join(tmpdir(), 'bb-deploy-')) })

describe('planDeploy', () => {
  it('rewrites nothing for a multi-brand build', () => {
    const plan = planDeploy(repo(), {})
    expect(plan).toEqual({ deploy: { mode: 'multi' }, rewrites: new Map(), others: [] })
    expect(describeDeploy(plan.deploy)).toMatch(/multi-brand/)
  })

  it('rewrites the config, logos and brand list for one brand', () => {
    const plan = planDeploy(repo(), { BB_DEPLOY: 'gap' })
    const files = deployFiles(root)
    expect(plan.others).toEqual(['bridge', 'ikea'])
    expect(JSON.parse(plan.rewrites.get(files.config)!()).brand.active).toBe('gap')
    expect(plan.rewrites.get(files.logos)!()).not.toContain('"ikea"')
    expect(plan.rewrites.get(files.tokens)!()).toBe('export const BRANDS = [\n  "gap",\n] as const\n')
    expect(describeDeploy(plan.deploy)).toBe('single brand: gap (no sign-in, other brands stripped)')
  })
})

describe('bundler plugins', () => {
  it('vite: loads the rewrites and strips other brands’ CSS from the built page', () => {
    const plan = planDeploy(repo({ mode: 'single', brand: 'gap' }), {})
    const plugin = deployVitePlugin(plan)
    const load = plugin.load as (id: string) => string | null
    expect(load(`${deployFiles(root).config}?import`)).toContain('"active":"gap"')
    expect(load('/elsewhere.ts')).toBeNull()
    const bundle = {
      'style.css': { type: 'asset', fileName: 'style.css', source: '[data-brand=ikea]{--x:1}.a{--y:2}' },
      'index.html': { type: 'asset', fileName: 'index.html', source: '<style>[data-brand=bridge]{--x:1}</style>' },
      'index.js': { type: 'chunk', fileName: 'index.js', code: '[data-brand=ikea]{}' },
    }
    ;(plugin.generateBundle as { handler: (o: unknown, b: unknown) => void }).handler({}, bundle)
    expect(bundle['style.css'].source).toBe('.a{--y:2}')
    expect(bundle['index.html'].source).toBe('<style></style>')
    expect(bundle['index.js'].code).toBe('[data-brand=ikea]{}')
  })

  it('esbuild: registers an onLoad rewrite only for a single-brand build', async () => {
    const hooks: { filter: RegExp; fn: (args: { path: string }) => unknown }[] = []
    const build = { onLoad: (opts: { filter: RegExp }, fn: (args: { path: string }) => unknown) => { hooks.push({ filter: opts.filter, fn }) } }
    deployEsbuildPlugin(planDeploy(repo(), {})).setup(build as never)
    expect(hooks).toHaveLength(0)
    deployEsbuildPlugin(planDeploy(repo(), { BB_DEPLOY: 'gap' })).setup(build as never)
    const files = deployFiles(root)
    expect(hooks[0]!.filter.test(files.config)).toBe(true)
    expect(await hooks[0]!.fn({ path: files.config })).toMatchObject({ loader: 'json' })
    expect(await hooks[0]!.fn({ path: files.tokens })).toMatchObject({ loader: 'ts' })
    expect(await hooks[0]!.fn({ path: join(root, 'other/plugin.config.json') })).toBeUndefined()
  })
})
