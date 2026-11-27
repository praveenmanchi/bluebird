// What ties a sign-in to the person who asked for it.
//
// Without this, the start link works as a bearer link: someone makes their own keys, sends a
// designer the start link, and gets the designer's token when they approve. Two checks
// stop that:
// - a confirm code: the plugin shows it while it waits, and the person types it into the
//   browser page (three tries). Someone who was sent the link has no code to type.
// - a browser cookie: set on the confirm page, required by Confirm and by the callback,
//   so a sign-in can't be confirmed from another site or finished in another browser.

const encoder = new TextEncoder()
/** No 0/O, 1/I/L: the person reads it off Figma and types it into the browser. */
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
const COOKIE_MAX_AGE_S = 15 * 60

/** "K7Q-X92": six characters from the read key, so the plugin and the page agree without storing it. */
export async function confirmCode(read: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(`bluebird-connect code ${read}`)))
  const chars = Array.from(digest.slice(0, 6), (byte) => ALPHABET[byte % ALPHABET.length]!)
  return `${chars.slice(0, 3).join('')}-${chars.slice(3).join('')}`
}

/** What the store keeps instead of the cookie itself. */
export async function browserHash(id: string): Promise<string> {
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(`bluebird-connect browser ${id}`)))
  return Array.from(digest, (b) => b.toString(16).padStart(2, '0')).join('')
}

export interface BrowserCookie {
  /** The id this browser already has, or null. */
  read(req: Request): string | null
  /** The Set-Cookie header value for `id`. */
  header(id: string): string
}

/**
 * `__Host-` + Secure on https; a plain name on http://localhost, where browsers refuse
 * the prefix. SameSite=Lax: sent on the provider's redirect back (a top-level GET), not on
 * a form another site posts.
 */
export function browserCookie(publicUrl: string, isId: (value: string) => boolean): BrowserCookie {
  const secure = publicUrl.startsWith('https://')
  const name = secure ? '__Host-bb_connect' : 'bb_connect'
  return {
    read(req) {
      for (const part of (req.headers.get('cookie') ?? '').split(';')) {
        const [key, ...rest] = part.trim().split('=')
        const value = rest.join('=')
        if (key === name && isId(value)) return value
      }
      return null
    },
    header: (id) => `${name}=${id}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${COOKIE_MAX_AGE_S}${secure ? '; Secure' : ''}`,
  }
}
