// The few HTML pages the broker shows in the browser. Plain, self-contained,
// no scripts: the person only needs to read them and go back to Figma.

const escapeHtml = (text: string): string =>
  text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const csp = (formAction: string) => `default-src 'none'; style-src 'unsafe-inline'; form-action ${formAction}; frame-ancestors 'none'`

const SECURITY_HEADERS: Readonly<Record<string, string>> = {
  'content-type': 'text/html; charset=utf-8',
  'content-security-policy': csp("'self'"),
  'x-frame-options': 'DENY',
  'x-content-type-options': 'nosniff',
  'strict-transport-security': 'max-age=31536000',
  'referrer-policy': 'no-referrer',
  'cache-control': 'no-store',
}

const STYLE = 'body{font:14px/1.5 system-ui,sans-serif;color:#18181b;background:#fafafa;display:grid;place-items:center;min-height:100vh;margin:0}'
  + 'main{background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:24px 28px;max-width:380px}'
  + 'h1{font-size:16px;margin:0 0 8px}p{margin:0 0 12px;color:#52525b}'
  + '.button{display:inline-block;margin-right:8px;padding:6px 12px;border-radius:8px;text-decoration:none;border:1px solid #e4e4e7;color:#18181b;background:#fff;font:inherit;cursor:pointer}'
  + '.primary{background:#0066ff;border-color:#0066ff;color:#fff}'
  + '.code{display:block;box-sizing:border-box;width:100%;font:600 22px/1.2 ui-monospace,monospace;letter-spacing:.12em;text-transform:uppercase;margin:4px 0 16px;padding:8px 10px;border:1px solid #e4e4e7;border-radius:8px;color:#18181b}'
  + '.error{color:#dc2626}'

export interface PageLink { label: string; href: string; primary?: boolean }

const shell = (title: string, inner: string): string =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${escapeHtml(title)} · Bluebird</title><style>${STYLE}</style></head>`
  + `<body><main><h1>${escapeHtml(title)}</h1>${inner}</main></body></html>`

export function page(status: number, title: string, body: string, links: readonly PageLink[] = [], headers: Record<string, string> = {}): Response {
  const buttons = links.map((l) => `<a class="button${l.primary ? ' primary' : ''}" href="${escapeHtml(l.href)}">${escapeHtml(l.label)}</a>`).join('')
  return new Response(shell(title, `<p>${escapeHtml(body)}</p>${buttons}`), { status, headers: { ...SECURITY_HEADERS, ...headers } })
}

export interface ConfirmPageInput {
  provider: string
  /** The site being connected (github.com, acme.atlassian.net…), shown so the person knows what they're approving. */
  host: string
  /** Same-origin path the form posts to. */
  action: string
  nonce: string
  /** The provider's sign-in origin: the only place the form's redirect may go (CSP form-action). */
  providerOrigin: string
  /** Set on the first show only. */
  setCookie?: string
  /** "That code doesn't match…" after a wrong try. */
  error?: string
}

/**
 * "Connect GitHub to Bluebird?": the person types the code Bluebird shows in Figma. Someone sent
 * this link by another person has no code to type, so they can't approve that person's sign-in.
 * Continue and Cancel post the form; after Continue the broker redirects to the provider, and
 * browsers apply form-action to that redirect too, so it allows exactly that origin.
 */
export function confirmPage({ provider, host, action, nonce, providerOrigin, setCookie, error }: ConfirmPageInput): Response {
  const site = host ? `<p>Signing in to <strong>${escapeHtml(host)}</strong>.</p>` : ''
  const inner = `${site}<p>Type the code Bluebird is showing in Figma. If you didn’t just click Sign in in Figma, cancel.</p>`
    + (error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : '')
    + `<form method="post" action="${escapeHtml(action)}"><input type="hidden" name="nonce" value="${escapeHtml(nonce)}">`
    + '<input class="code" name="code" aria-label="Code from Figma" placeholder="ABC-123" maxlength="9" required autofocus autocomplete="off" autocapitalize="characters" spellcheck="false">'
    + `<button class="button primary" name="decision" value="confirm">Continue to ${escapeHtml(provider)}</button>`
    + '<button class="button" name="decision" value="deny" formnovalidate>Cancel</button></form>'
  return new Response(shell(`Connect ${provider} to Bluebird?`, inner), {
    status: error ? 400 : 200,
    headers: { ...SECURITY_HEADERS, 'content-security-policy': csp(`'self' ${providerOrigin}`), ...(setCookie ? { 'set-cookie': setCookie } : {}) },
  })
}
