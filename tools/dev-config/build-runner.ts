// Runs `npm run build` for dev.html › Plugin configuration's "Run build now".
// One build at a time; its state lives here, not in the page, because the
// build regenerates files the dev server watches and the page may reload mid-run.
import { spawn as nodeSpawn } from 'node:child_process'

export const BUILD_ENDPOINT = '/__bluebird/build'
/** Lines of output kept for the page: enough to show a failing step. */
const TAIL_LINES = 40

export type BuildState =
  | { status: 'idle' }
  | { status: 'running'; startedAt: string; output: string }
  | { status: 'passed' | 'failed'; startedAt: string; finishedAt: string; exitCode: number | null; output: string }

/** The slice of child_process.spawn the runner uses, so tests can fake it. */
export type Spawn = (command: string, args: readonly string[], options: { cwd: string; shell: boolean }) => {
  stdout: NodeJS.ReadableStream | null
  stderr: NodeJS.ReadableStream | null
  on(event: 'close', listener: (code: number | null) => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
}

export interface BuildRunner {
  state(): BuildState
  /** Starts a build; false when one is already running. */
  start(): boolean
}

// eslint-disable-next-line no-control-regex -- strips the colour codes vite and tsx print
const ANSI = /\x1b\[[0-9;]*m/g

export function createBuildRunner(cwd: string, spawn: Spawn = nodeSpawn as unknown as Spawn, now: () => Date = () => new Date()): BuildRunner {
  let current: BuildState = { status: 'idle' }
  return {
    state: () => current,
    start() {
      if (current.status === 'running') return false
      const startedAt = now().toISOString()
      let lines: string[] = []
      const append = (chunk: Buffer | string) => {
        lines = [...lines, ...String(chunk).replace(ANSI, '').split('\n').filter((l) => l.trim())].slice(-TAIL_LINES)
        if (current.status === 'running') current = { ...current, output: lines.join('\n') }
      }
      const finish = (exitCode: number | null) => {
        current = { status: exitCode === 0 ? 'passed' : 'failed', startedAt, finishedAt: now().toISOString(), exitCode, output: lines.join('\n') }
      }
      current = { status: 'running', startedAt, output: '' }
      // shell: npm is npm.cmd on Windows. The command is fixed; nothing from the request reaches it.
      const child = spawn('npm', ['run', 'build'], { cwd, shell: process.platform === 'win32' })
      child.stdout?.on('data', append)
      child.stderr?.on('data', append)
      child.on('error', (error) => { append(`Couldn’t start npm: ${error.message}`); finish(null) })
      child.on('close', (code) => { if (current.status === 'running') finish(code) })
      return true
    },
  }
}
