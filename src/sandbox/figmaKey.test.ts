import { describe, expect, it, vi } from 'vitest'
import type { HttpFetch } from '@shared/libraries/rest'
import type { Handler, HandlerContext } from '@shared/bridge'
import { FIGMA_KEY_MSG } from '@shared/session'
import { checkFigmaKey, createFigmaKeyHandlers, tokenOf } from './figmaKey'

const answer = (status: number, body: unknown): HttpFetch => vi.fn(async () => ({ status, text: async () => JSON.stringify(body) }))

describe('tokenOf', () => {
  it('trims a plausible token and rejects anything else', () => {
    expect(tokenOf({ token: '  figd_abcdefghij  ' })).toBe('figd_abcdefghij')
    for (const bad of [null, {}, { token: 12 }, { token: 'short' }, { token: 'figd_has space here' }, { token: 'x'.repeat(300) }]) {
      expect(() => tokenOf(bad)).toThrow(/personal access token/)
    }
  })
})

describe('checkFigmaKey', () => {
  it('calls GET /v1/me with the token header and returns the handle', async () => {
    const fetch = answer(200, { handle: 'Ada' })
    await expect(checkFigmaKey({ token: 'figd_abcdefghij' }, fetch)).resolves.toEqual({ handle: 'Ada' })
    expect(fetch).toHaveBeenCalledWith('https://api.figma.com/v1/me', { method: 'GET', headers: { 'X-Figma-Token': 'figd_abcdefghij' } })
  })
  it('explains a rejected, failing or unreachable check', async () => {
    await expect(checkFigmaKey({ token: 'figd_abcdefghij' }, answer(403, { err: 'Invalid token' }))).rejects.toThrow(/didn’t accept/)
    await expect(checkFigmaKey({ token: 'figd_abcdefghij' }, answer(500, {}))).rejects.toThrow(/answered 500/)
    await expect(checkFigmaKey({ token: 'figd_abcdefghij' }, vi.fn(async () => { throw new Error('offline') }))).rejects.toThrow(/Couldn’t reach Figma/)
  })
  it('accepts a 200 without a readable body', async () => {
    const fetch: HttpFetch = async () => ({ status: 200, text: async () => 'not json' })
    await expect(checkFigmaKey({ token: 'figd_abcdefghij' }, fetch)).resolves.toEqual({ handle: '' })
  })
  it('is registered under figma-key:check', async () => {
    const h = createFigmaKeyHandlers({ fetch: answer(200, { handle: 'Ada' }) })
    await expect((h[FIGMA_KEY_MSG.check] as Handler)({ token: 'figd_abcdefghij' }, {} as HandlerContext)).resolves.toEqual({ handle: 'Ada' })
  })
})
