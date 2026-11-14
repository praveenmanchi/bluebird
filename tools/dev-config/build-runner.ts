// Runs `npm run build` for dev.html › Plugin configuration's "Run build now".
// One build at a time; its state lives here, not in the page, because the
// build regenerates files the dev server watches and the page may reload mid-run.
import { spawn as nodeSpawn } from 'node:child_process'

export const BUILD_ENDPOINT = '/__bluebird/build'
/** Lines of output kept for the page: enough to show a failing step. */
const TAIL_LINES = 40
/** Raw lines held before the noise filter runs, so a long warning block cannot push the error out. */
const RAW_LINES = 4000

export type BuildState =
  | { status: 'idle' }
  | { status: 'running'; startedAt: string; output: string }
  | { status: 'passed' | 'failed'; startedAt: string; finishedAt: string; exitCode: number | null; output: string; summary?: string }

/** The slice of child_process.spawn the runner uses, so tests can fake it. */
export type Spawn = (command: string, args: readonly string[], options: { cwd: string; shell: boolean; env: NodeJS.ProcessEnv }) => {
  stdout: NodeJS.ReadableStream | null
  stderr: NodeJS.ReadableStream | null
  on(event: 'close', listener: (code: number | null) => void): unknown
  on(event: 'error', listener: (error: Error) => void): unknown
}

/** The npm scripts the page may start. Nothing else from the request reaches the shell. */
export const BUILD_SCRIPTS = ['build', 'package'] as const
export type BuildScript = (typeof BUILD_SCRIPTS)[number]
export const isBuildScript = (v: unknown): v is BuildScript => (BUILD_SCRIPTS as readonly unknown[]).includes(v)

export interface BuildRunner {
  state(): BuildState
  /** Starts `npm run <script>` (build by default); false when one is already running. */
  start(script?: BuildScript): boolean
}

// eslint-disable-next-line no-control-regex -- strips the colour codes vite and tsx print
const ANSI = /\x1b\[[0-9;]*m/g

/**
 * Rollup prints a multi-line warning for every zod comment it cannot place ("… contains an
 * annotation that Rollup cannot interpret"). It is harmless and shows on passing builds too,
 * but it filled the 40-line tail and hid the line that actually failed.
 */
const NOISE_START = /\(\d+:\d+\): A comment$/
const NOISE_END = /Rollup cannot interpret/

export function withoutNoise(lines: readonly string[]): string[] {
  const out: string[] = []
  let skipping = false
  for (const line of lines) {
    if (!skipping && NOISE_START.test(line)) { skipping = true; continue }
    if (skipping) { if (NOISE_END.test(line)) skipping = false; continue }
    out.push(line)
  }
  return out
}

const FAILURE = /(OVER BUDGET|error TS\d+|\berror\b|\bfailed\b|✖|✗)/i
const NPM_FOOTER = /^npm (error|ERR!)/i

/** The line that says what broke, preferring the tool's own message over npm's footer. */
export function failureLine(lines: readonly string[]): string | undefined {
  const own = lines.filter((l) => FAILURE.test(l) && !NPM_FOOTER.test(l))
  return own.at(-1) ?? lines.filter((l) => FAILURE.test(l)).at(-1)
}

export function createBuildRunner(cwd: string, spawn: Spawn = nodeSpawn as unknown as Spawn, now: () => Date = () => new Date()): BuildRunner {
  let current: BuildState = { status: 'idle' }
  return {
    state: () => current,
    start(script: BuildScript = 'build') {
      if (current.status === 'running') return false
      if (!isBuildScript(script)) return false
      const startedAt = now().toISOString()
      let raw: string[] = []
      const tail = () => withoutNoise(raw).slice(-TAIL_LINES)
      const append = (chunk: Buffer | string) => {
        raw = [...raw, ...String(chunk).replace(ANSI, '').split('\n').filter((l) => l.trim())].slice(-RAW_LINES)
        if (current.status === 'running') current = { ...current, output: tail().join('\n') }
      }
      const finish = (exitCode: number | null) => {
        const lines = tail()
        const summary = exitCode === 0 ? undefined : failureLine(withoutNoise(raw))
        current = { status: exitCode === 0 ? 'passed' : 'failed', startedAt, finishedAt: now().toISOString(), exitCode, output: lines.join('\n'), ...(summary ? { summary } : {}) }
      }
      current = { status: 'running', startedAt, output: '' }
      // shell: npm is npm.cmd on Windows. The script is one of BUILD_SCRIPTS; nothing else from the request reaches it.
      // The dev server runs with NODE_ENV=development, and a child inherits it: Vite then makes an
      // unminified development build (~1.8 MB) that always fails check:size. Build as a terminal would.
      const env: NodeJS.ProcessEnv = { ...process.env }
      delete env.NODE_ENV
      const child = spawn('npm', ['run', script], { cwd, shell: process.platform === 'win32', env })
      child.stdout?.on('data', append)
      child.stderr?.on('data', append)
      child.on('error', (error) => { append(`Couldn’t start npm: ${error.message}`); finish(null) })
      child.on('close', (code) => { if (current.status === 'running') finish(code) })
      return true
    },
  }
}
