import { describe, it, expect, vi, afterEach } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/preact'
import { BuildPrompt, forThisSave, isBuildPending, markBuildPending } from './BuildPrompt'
import type { BuildState } from './api'

function serveBuilds(states: BuildState[]) {
  const posts: unknown[] = []
  let i = 0
  vi.stubGlobal('fetch', vi.fn(async (_url: string, init?: RequestInit) => {
    if (init?.method === 'POST') posts.push(init.body)
    const build = init?.method === 'POST' ? states[i] : states[Math.min(i++, states.length - 1)]
    return new Response(JSON.stringify({ ok: true, build }), { status: 200 })
  }))
  return posts
}

afterEach(() => { vi.unstubAllGlobals(); sessionStorage.clear() })

describe('BuildPrompt', () => {
  it('asks to rebuild after a save and runs the build when asked', async () => {
    const posts = serveBuilds([{ status: 'idle' }, { status: 'running', startedAt: '2999-01-01', output: '> vite build' }, { status: 'passed', startedAt: '2999-01-01', finishedAt: '2999-01-01', exitCode: 0, output: '' }])
    render(<BuildPrompt open onClose={() => undefined} />)
    expect(screen.getByRole('heading', { name: /Rebuild the plugin/ })).toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Run build now' }))
    await waitFor(() => expect(posts).toHaveLength(1))
    expect(await screen.findByRole('heading', { name: 'Plugin rebuilt' }, { timeout: 3000 })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Done' })).toBeInTheDocument()
  })

  it('shows the output of a failed build and offers to run it again', async () => {
    serveBuilds([{ status: 'failed', startedAt: '2999-01-01', finishedAt: '2999-01-01', exitCode: 1, output: 'error TS2322' }])
    render(<BuildPrompt open onClose={() => undefined} />)
    expect(await screen.findByText('error TS2322')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Run build again' })).toBeInTheDocument()
  })

  it('remembers the save across a reload until dismissed', () => {
    serveBuilds([{ status: 'idle' }])
    markBuildPending()
    expect(isBuildPending()).toBe(true)
    const onClose = vi.fn()
    render(<BuildPrompt open onClose={onClose} />)
    fireEvent.click(screen.getByRole('button', { name: 'Later' }))
    expect(onClose).toHaveBeenCalled()
    expect(sessionStorage.length).toBe(0)
  })

  it('ignores a build that finished before this save', () => {
    const old: BuildState = { status: 'passed', startedAt: '2026-01-01T00:00:00.000Z', finishedAt: '2026-01-01T00:01:00.000Z', exitCode: 0, output: '' }
    expect(forThisSave(old, '2026-10-12T00:00:00.000Z')).toEqual({ status: 'idle' })
    expect(forThisSave(old, '2025-01-01T00:00:00.000Z')).toBe(old)
  })
})
