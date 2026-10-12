// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { EventEmitter } from 'node:events'
import { PassThrough } from 'node:stream'
import { createBuildRunner, type Spawn } from '../../tools/dev-config/build-runner'

function fakeSpawn() {
  const runs: { command: string; args: readonly string[]; cwd: string; child: EventEmitter & { stdout: PassThrough; stderr: PassThrough } }[] = []
  const spawn: Spawn = (command, args, { cwd }) => {
    const child = Object.assign(new EventEmitter(), { stdout: new PassThrough(), stderr: new PassThrough() })
    runs.push({ command, args, cwd, child })
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
