import { describe, it, expect } from 'vitest'
import { base64, decodeBase64 } from './base64'

describe('base64', () => {
  it('matches Node for ASCII of every padding length', () => {
    for (const text of ['', 'a', 'ab', 'abc', '{"schema":1}\n']) expect(base64(text)).toBe(Buffer.from(text, 'utf8').toString('base64'))
  })

  it('encodes multi-byte characters as UTF-8', () => {
    for (const text of ['6 → 8', 'café', '色', '🐦 bluebird']) expect(base64(text)).toBe(Buffer.from(text, 'utf8').toString('base64'))
  })

  it('decodes what it encodes, and the line-wrapped output GitHub sends', () => {
    for (const text of ['', 'a', 'ab', 'abc', '6 → 8', 'café', '色', '🐦 bluebird', '{"x":[1,2]}\n']) expect(decodeBase64(base64(text))).toBe(text)
    const wrapped = Buffer.from('x'.repeat(100), 'utf8').toString('base64').replace(/(.{60})/g, '$1\n')
    expect(decodeBase64(wrapped)).toBe('x'.repeat(100))
  })
})
