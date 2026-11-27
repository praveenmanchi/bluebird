// The few HTML pages the broker shows in the browser. Plain, self-contained,
// no scripts: the person only needs to read them and go back to Figma.

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy': "default-src 'none'; style-src 'unsafe-inline'; form-action 'self'; frame-ancestors 'none'",
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
}

const STYLE = 'body{font:14px/1.5 system-ui,sans-serif;color:#18181b;background:#fafafa;display:grid;place-items:center;min-height:100vh;margin:0}'
  + 'main{background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px 28px;max-width:380px}'
  + 'h1{font-size:16px;margin:0 0 8px}p{margin:0 0 12px;color:#52525b}'
  + 'a.button{display:inline-block;margin-right:8px;padding:6px 12px;border-radius:8px;text-decoration:none;border:1px solid #e4e4e7;color:#18181b}'
  + 'a.primary{background:#0066ff;border-color:#0066ff;color:#fff}'

export interface PageLink { label: string; href: string; primary?: boolean }

export function page(status: number, title: string, body: string, links: readonly PageLink[] = []): Response {
  const buttons = links.map((l) => `<a class="button${l.primary ? ' primary' : ''}" href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`).join('')
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)} · Bluebird</title><style>${STYLE}</style></head>`
    + `<body><main><h1>${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p>${buttons}</main></body></html>`
  return new Response(html, { status, headers: SECURITY_HEADERS })
}
