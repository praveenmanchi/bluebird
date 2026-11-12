// Base64 of a UTF-8 string. The Figma sandbox has no btoa or TextEncoder, and
// GitHub's Contents API only takes file content in base64.
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'

function utf8(text: string): number[] {
  const bytes: number[] = []
  for (const char of text) {
    const code = char.codePointAt(0)!
    if (code < 0x80) bytes.push(code)
    else if (code < 0x800) bytes.push(0xc0 | (code >> 6), 0x80 | (code & 0x3f))
    else if (code < 0x10000) bytes.push(0xe0 | (code >> 12), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
    else bytes.push(0xf0 | (code >> 18), 0x80 | ((code >> 12) & 0x3f), 0x80 | ((code >> 6) & 0x3f), 0x80 | (code & 0x3f))
  }
  return bytes
}

export function base64(text: string): string {
  const bytes = utf8(text)
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i]!, b = bytes[i + 1], c = bytes[i + 2]
    out += ALPHABET[a >> 2]! + ALPHABET[((a & 3) << 4) | ((b ?? 0) >> 4)]!
    out += b === undefined ? '=' : ALPHABET[((b & 15) << 2) | ((c ?? 0) >> 6)]!
    out += c === undefined ? '=' : ALPHABET[c & 63]!
  }
  return out
}

const INDEX: Record<string, number> = Object.fromEntries([...ALPHABET].map((c, i) => [c, i]))

/** UTF-8 text from base64 (GitHub's Contents API wraps it with newlines; whitespace is ignored). */
export function decodeBase64(data: string): string {
  const clean = data.replace(/[^A-Za-z0-9+/]/g, '')
  const bytes: number[] = []
  for (let i = 0; i < clean.length; i += 4) {
    const a = INDEX[clean[i]!]!, b = INDEX[clean[i + 1]!] ?? 0, c = INDEX[clean[i + 2]!], d = INDEX[clean[i + 3]!]
    bytes.push((a << 2) | (b >> 4))
    if (c !== undefined) bytes.push(((b & 15) << 4) | (c >> 2))
    if (d !== undefined) bytes.push(((c! & 3) << 6) | d)
  }
  let out = ''
  for (let i = 0; i < bytes.length;) {
    const x = bytes[i]!
    const n = x < 0x80 ? 1 : x < 0xe0 ? 2 : x < 0xf0 ? 3 : 4
    let code = n === 1 ? x : x & (0xff >> (n + 1))
    for (let k = 1; k < n; k++) code = (code << 6) | ((bytes[i + k] ?? 0) & 0x3f)
    out += String.fromCodePoint(code)
    i += n
  }
  return out
}
