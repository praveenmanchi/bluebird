// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { memoryStore } from '../../tools/connect/store'
import { createSealer, createSigner, randomKey, isKey } from '../../tools/connect/crypto'
import { createLimiter } from '../../tools/connect/limits'

const SECRET = 'a'.repeat(43)

describe('memoryStore', () => {
  it('keeps a value until its TTL passes', async () => {
    let now = 1_000
    const store = memoryStore(() => now)
    await store.put('k', 'v', 60)
    expect(await store.get('k')).toBe('v')
    now += 59_999
    expect(await store.get('k')).toBe('v')
    now += 1
    expect(await store.get('k')).toBeNull()
  })

  it('take reads once and deletes', async () => {
    const store = memoryStore()
    await store.put('k', 'v', 60)
    expect(await store.take('k')).toBe('v')
    expect(await store.take('k')).toBeNull()
  })

  it('stays bounded, dropping expired records first, then the oldest', async () => {
    let now = 0
    const store = memoryStore(() => now, 2)
    await store.put('old', '1', 1)
    await store.put('keep', '2', 60)
    now = 2_000
    await store.put('new', '3', 60)
    expect(await store.get('keep')).toBe('2')
    await store.put('newer', '4', 60)
    expect(await store.get('keep')).toBeNull()
    expect(await store.get('newer')).toBe('4')
  })

  it('delete removes a value', async () => {
    const store = memoryStore()
    await store.put('k', 'v', 60)
    await store.delete('k')
    expect(await store.get('k')).toBeNull()
  })
})

describe('randomKey', () => {
  it('makes url-safe keys the plugin accepts', () => {
    const a = randomKey()
    const b = randomKey()
    expect(a).not.toBe(b)
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(isKey(a)).toBe(true)
  })

  it('rejects keys outside the contract', () => {
    expect(isKey('short')).toBe(false)
    expect(isKey('x'.repeat(129))).toBe(false)
    expect(isKey('has spaces in it, sixteen+')).toBe(false)
    expect(isKey(undefined)).toBe(false)
  })
})

describe('sealer', () => {
  it('round-trips JSON and never stores plain text', async () => {
    const seal = await createSealer(SECRET)
    const box = await seal.seal({ accessToken: 'secret-token' }, 'read-1')
    expect(box).not.toContain('secret-token')
    expect(await seal.open(box, 'read-1')).toEqual({ accessToken: 'secret-token' })
  })

  it('uses a fresh IV each time', async () => {
    const seal = await createSealer(SECRET)
    expect(await seal.seal({ a: 1 }, 'c')).not.toBe(await seal.seal({ a: 1 }, 'c'))
  })

  it('returns null for tampered or foreign boxes', async () => {
    const seal = await createSealer(SECRET)
    const other = await createSealer('b'.repeat(43))
    const box = await seal.seal({ a: 1 }, 'read-1')
    expect(await other.open(box, 'read-1')).toBeNull()
    expect(await seal.open(`${box.slice(0, -2)}AA`, 'read-1')).toBeNull()
    expect(await seal.open('not-a-box', 'read-1')).toBeNull()
  })

  it('only opens a box under the context it was sealed with', async () => {
    const seal = await createSealer(SECRET)
    const box = await seal.seal({ a: 1 }, 'read-1')
    expect(await seal.open(box, 'read-2')).toBeNull()
  })

  it('refuses a weak secret', async () => {
    await expect(createSealer('short')).rejects.toThrow(/at least 32/)
  })
})

describe('signer', () => {
  it('verifies its own signatures only', async () => {
    const sign = await createSigner(SECRET)
    const other = await createSigner('b'.repeat(43))
    const token = await sign.sign('nonce-123')
    expect(await sign.verify(token)).toBe('nonce-123')
    expect(await other.verify(token)).toBeNull()
    expect(await sign.verify('nonce-124.' + token.split('.')[1])).toBeNull()
    expect(await sign.verify('no-dot')).toBeNull()
  })
})

describe('limiter', () => {
  it('allows a burst then blocks until the window resets', () => {
    let now = 0
    const limit = createLimiter(() => now)
    expect(limit('ip', 2, 60_000)).toBe(true)
    expect(limit('ip', 2, 60_000)).toBe(true)
    expect(limit('ip', 2, 60_000)).toBe(false)
    expect(limit('other', 2, 60_000)).toBe(true)
    now = 60_000
    expect(limit('ip', 2, 60_000)).toBe(true)
  })

  it('never wipes live counters when the table is full', () => {
    let now = 0
    const limit = createLimiter(() => now, 3)
    expect(limit('ip', 1, 60_000)).toBe(true)
    expect(limit('a', 1, 60_000)).toBe(true)
    expect(limit('b', 1, 60_000)).toBe(true)
    expect(limit('c', 1, 60_000)).toBe(false)
    expect(limit('ip', 1, 60_000)).toBe(false)
    now = 60_000
    expect(limit('c', 1, 60_000)).toBe(true)
  })
})
