// Where a Teams / Power Automate post may go, and how it gets there. Shared by every
// tab that notifies a channel. What the post says lives in card.ts.

/**
 * Hosts a Teams post may go to; the plugin manifest allows the same three. Classic
 * "Incoming Webhook" connectors live on *.webhook.office.com. Power Automate
 * "When a Teams webhook request is received" triggers moved from *.logic.azure.com to
 * *.environment.api.powerplatform.com from 30 Nov 2025; flows made before then keep
 * the old host, so both stay allowed.
 */
const WEBHOOK_HOSTS = [
  /^https:\/\/[a-z0-9.-]+\.webhook\.office\.com\//i,
  /^https:\/\/[a-z0-9.-]+\.logic\.azure\.com\//i,
  /^https:\/\/[a-z0-9.-]+\.environment\.api\.powerplatform\.com\//i,
]

/**
 * The URL without a default `:443`. Power Platform trigger URLs carry it explicitly; the
 * port breaks the host patterns above (a colon is not in [a-z0-9.-]) and, likely, the
 * manifest's wildcard domain match. Applied at the fetch, not when reading Settings, so
 * code that compares against the saved setting still matches it.
 */
export const normalizeWebhook = (url: string): string => url.trim().replace(/^(https:\/\/[^/:?#]+):443(?=[/?#]|$)/i, '$1')

export const allowedWebhook = (url: string): boolean => {
  const clean = normalizeWebhook(url)
  return WEBHOOK_HOSTS.some((re) => re.test(clean))
}

export const hostOf = (url: string): string => normalizeWebhook(url).replace(/^https?:\/\//, '').split(/[/?#]/)[0] ?? url

export type WebhookFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ status: number }>

/** Posts `body` to each named webhook; only the allowed hosts are ever called. */
export async function postWebhooks(targets: readonly { name: string; url: string }[], body: string, fetchImpl: WebhookFetch): Promise<{ posted: string[]; failed: string[] }> {
  const posted: string[] = [], failed: string[] = []
  for (const t of targets) {
    if (!allowedWebhook(t.url)) { failed.push(t.name); continue }
    try {
      const res = await fetchImpl(normalizeWebhook(t.url), { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      if (res.status >= 200 && res.status < 300) posted.push(t.name)
      else failed.push(t.name)
    } catch {
      failed.push(t.name)
    }
  }
  return { posted, failed }
}
