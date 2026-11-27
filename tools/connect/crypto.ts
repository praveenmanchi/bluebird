// Keys, encryption and signatures for the broker, on WebCrypto only, so the
// same code runs in Cloudflare Workers, Vercel and Node 20+.
//
// - randomKey: the read/write keys and nonces (32 random bytes, base64url).
// - sealer: AES-256-GCM for tokens at rest. A leaked store holds nothing usable.
// - signer: HMAC-SHA256 for the OAuth `state`, so a callback can't be forged.

const MIN_SECRET_CHARS = 32
const KEY_PATTERN = /^[A-Za-z0-9_-]{16,128}$/
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function toBase64Url(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromBase64Url(text: string): Uint8Array<ArrayBuffer> | null {
  if (!/^[A-Za-z0-9_-]*$/.test(text)) return null
  try {
    const binary = atob(text.replace(/-/g, '+').replace(/_/g, '/'))
    return Uint8Array.from(binary, (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

/** 32 random bytes as 43 base64url characters. */
export function randomKey(bytes = 32): string {
  return toBase64Url(crypto.getRandomValues(new Uint8Array(bytes)))
}

/** True for a key in the plugin contract: 16–128 chars of [A-Za-z0-9_-]. */
export function isKey(value: unknown): value is string {
  return typeof value === 'string' && KEY_PATTERN.test(value)
}

/** A key for one purpose, derived from a secret with HKDF so each purpose gets its own key. */
async function deriveKey(secret: string, purpose: string, algorithm: AesKeyGenParams | HmacKeyGenParams, usages: KeyUsage[]): Promise<CryptoKey> {
  if (secret.length < MIN_SECRET_CHARS) throw new Error(`Connect secrets must be at least ${MIN_SECRET_CHARS} characters.`)
  const base = await crypto.subtle.importKey('raw', encoder.encode(secret), 'HKDF', false, ['deriveKey'])
  const params = { name: 'HKDF', hash: 'SHA-256', salt: new Uint8Array(32), info: encoder.encode(`bluebird-connect ${purpose}`) }
  return crypto.subtle.deriveKey(params, base, algorithm, false, usages)
}

export interface Sealer {
  /** `context` (e.g. the read key) is bound to the box: it opens only with the same context. */
  seal(value: unknown, context: string): Promise<string>
  /** The sealed value, or null when the box is tampered with, foreign, moved or malformed. */
  open(box: string, context: string): Promise<unknown>
}

export async function createSealer(secret: string): Promise<Sealer> {
  const key = await deriveKey(secret, 'seal', { name: 'AES-GCM', length: 256 }, ['encrypt', 'decrypt'])
  return {
    async seal(value, context) {
      const iv = crypto.getRandomValues(new Uint8Array(12))
      const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(context) }, key, encoder.encode(JSON.stringify(value)))
      return `${toBase64Url(iv)}.${toBase64Url(new Uint8Array(data))}`
    },
    async open(box, context) {
      const [ivText, dataText, extra] = box.split('.')
      const iv = ivText ? fromBase64Url(ivText) : null
      const data = dataText ? fromBase64Url(dataText) : null
      if (!iv || !data || extra !== undefined || iv.length !== 12) return null
      try {
        const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv, additionalData: encoder.encode(context) }, key, data)
        return JSON.parse(decoder.decode(plain)) as unknown
      } catch {
        return null
      }
    },
  }
}

export interface Signer {
  sign(value: string): Promise<string>
  /** The signed value, or null when the signature doesn't match. */
  verify(token: string): Promise<string | null>
}

export async function createSigner(secret: string): Promise<Signer> {
  const key = await deriveKey(secret, 'state', { name: 'HMAC', hash: 'SHA-256', length: 256 }, ['sign', 'verify'])
  return {
    async sign(value) {
      const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(value))
      return `${value}.${toBase64Url(new Uint8Array(mac))}`
    },
    async verify(token) {
      const dot = token.lastIndexOf('.')
      if (dot <= 0) return null
      const value = token.slice(0, dot)
      const mac = fromBase64Url(token.slice(dot + 1))
      if (!mac) return null
      // subtle.verify compares in constant time.
      return (await crypto.subtle.verify('HMAC', key, mac, encoder.encode(value))) ? value : null
    },
  }
}

/** PKCE S256 challenge for a verifier. */
export async function pkceChallenge(verifier: string): Promise<string> {
  return toBase64Url(new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(verifier))))
}
