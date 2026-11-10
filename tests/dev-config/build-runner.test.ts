// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { createBuildRunner, type Spawn } from '../../tools/dev-config/build-runner'

function fakeSpawn() {
  const runs: { command: string; args: readonly string[]; cwd: string; env: NodeJS.ProcessEnv; child: EventEmitter & { stdout: PassThrough; stderr: PassThrough } }[] = []
  const spawn: Spawn = (command, args, { cwd, env }) => {
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough() })
    runs.push({ command, args, cwd, env, child })
    return child as unknown as ReturnType<Spawn>
  }
  return { spawn, runs }
}
const tick = () => new Promise((r) => setTimeout(r, 0))

describe('build runner', () => {
  it('runs npm run build in the repo, keeps the output and reports a pass', async () => {
    const { spawn, runs } = fakeSpawn()
    const runner = createBuildRunner('/repo', spawn)
    expect(runner.state()).toEqual({ status: 'idle' })
    expect(runner.start()).toBe(true)
    expect(runs[0]).toMatchObject({ command: 'npm', args: ['run', 'build'], cwd: '/repo' })
    runs[0]!.child.stdout.write('\x1b[32m> vite build\x1b[0m\n')
    await tick()
    expect(runner.state()).toMatchObject({ status: 'running', output: '> vite build' })
    runs[0]!.child.emit('close', 0)
    expect(runner.state()).toMatchObject({ status: 'passed', exitCode: 0, output: '> vite build' })
  })

  it('refuses a second build while one runs, and reports a failure or a missing npm', async () => {
    const { spawn, runs } = fakeSpawn()
    const runner = createBuildRunner('/repo', spawn)
    runner.start()
    expect(runner.start()).toBe(false)
    runs[0]!.child.stderr.write('error TS2322\n')
    await tick()
    runs[0]!.child.emit('close', 1)
    expect(runner.state()).toMatchObject({ status: 'failed', exitCode: 1, output: 'error TS2322' })
    expect(runner.start()).toBe(true)
    runs[1]!.child.emit('error', new Error('spawn npm ENOENT'))
    expect(runner.state()).toMatchObject({ status: 'failed', exitCode: null, output: 'Couldn’t start npm: spawn npm ENOENT' })
  })

  it('keeps only the last 40 lines', async () => {
    const { spawn, runs } = fakeSpawn()
    const runner = createBuildRunner('/repo', spawn)
    runner.start()
    runs[0]!.child.stdout.write(Array.from({ length: 60 }, (_, i) => `line ${i}`).join('\n'))
    await tick()
    runs[0]!.child.emit('close', 0)
    const lines = (runner.state() as { output: string }).output.split('\n')
    expect(lines).toHaveLength(40)
    expect(lines[0]).toBe('line 20')
  })
})

import { failureLine, withoutNoise } from '../../tools/dev-config/build-runner'

/** The real Rollup warning zod triggers on every build, passing or not. */
const ZOD_WARNING = [
  'node_modules/zod/v4/core/util.js (400:0): A comment',
  '"// Wrapped in a `@__PURE__` IIFE: esbuild never tree-shakes a top-level initializer"',
  'in "node_modules/zod/v4/core/util.js" contains an annotation that Rollup cannot interpret due to the position of the comment. The comment will be removed to avoid issues.',
]

describe('build output', () => {
  it('drops the zod comment warning so it cannot hide the failing step', () => {
    expect(withoutNoise(['> vite build', ...ZOD_WARNING, ...ZOD_WARNING, '✓ built in 204ms'])).toEqual(['> vite build', '✓ built in 204ms'])
  })

  it('names the line that failed, not npm’s footer', () => {
    expect(failureLine(['[size] dist/index.html = 1434.0 KB (budget 1430 KB) — OVER BUDGET', 'npm error Lifecycle script `build` failed with error:'])).toBe('[size] dist/index.html = 1434.0 KB (budget 1430 KB) — OVER BUDGET')
    expect(failureLine(['all good'])).toBeUndefined()
  })

  it('keeps the error in view even after hundreds of warning lines, and reports it', async () => {
    const { spawn, runs } = fakeSpawn()
    const runner = createBuildRunner('/repo', spawn)
    runner.start()
    for (let i = 0; i < 60; i += 1) runs[0]!.child.stderr.write(`${ZOD_WARNING.join('\n')}\n`)
    runs[0]!.child.stdout.write('[size] dist/index.html = 1434.0 KB (budget 1430 KB) — OVER BUDGET\n')
    await tick()
    runs[0]!.child.emit('close', 1)
    const state = runner.state()
    expect(state).toMatchObject({ status: 'failed', summary: '[size] dist/index.html = 1434.0 KB (budget 1430 KB) — OVER BUDGET' })
    expect(state.status !== 'idle' && state.output).not.toMatch(/Rollup cannot interpret/)
  })
})

describe('build environment', () => {
  it('does not pass the dev server’s NODE_ENV to the build, so Vite makes a production build', () => {
    const before = process.env.NODE_ENV
    process.env.NODE_ENV = 'development'
    try {
      const { spawn, runs } = fakeSpawn()
      createBuildRunner('/repo', spawn).start()
      expect(runs[0]!.env.NODE_ENV).toBeUndefined()
      expect(runs[0]!.env.PATH).toBe(process.env.PATH)
    } finally {
      if (before === undefined) delete process.env.NODE_ENV
      else process.env.NODE_ENV = before
    }
  })
})
