// Where a Teams / Power Automate post may go. Shared by every tab that notifies a channel.

/**
 * Hosts a Teams post may go to; the plugin manifest allows the same two. Classic
 * "Incoming Webhook" connectors live on *.webhook.office.com, Power Automate
 * "When a Teams webhook request is received" triggers on *.logic.azure.com.
 */
const WEBHOOK_HOSTS = [/^https:\/\/[a-z0-9.-]+\.webhook\.office\.com\//i, /^https:\/\/[a-z0-9.-]+\.logic\.azure\.com\//i]
export const allowedWebhook = (url: string): boolean => WEBHOOK_HOSTS.some((re) => re.test(url))

export const hostOf = (url: string): string => url.replace(/^https?:\/\//, '').split('/')[0] ?? url

/** The Teams / Power Automate message card: a title, paragraphs and an optional button. */
export function channelCard(title: string, lines: readonly string[], link?: string, linkLabel?: string): string {
  return JSON.stringify({
    '@type': 'MessageCard',
    '@context': 'https://schema.org/extensions',
    summary: title,
    title,
    text: lines.join('\n\n'),
    ...(link ? { potentialAction: [{ '@type': 'OpenUri', name: linkLabel ?? 'Open on GitHub', targets: [{ os: 'default', uri: link }] }] } : {}),
  })
}

export type WebhookFetch = (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => Promise<{ status: number }>

/** Posts `body` to each named webhook; only the allowed hosts are ever called. */
export async function postWebhooks(targets: readonly { name: string; url: string }[], body: string, fetchImpl: WebhookFetch): Promise<{ posted: string[]; failed: string[] }> {
  const posted: string[] = [], failed: string[] = []
  for (const t of targets) {
    if (!allowedWebhook(t.url)) { failed.push(t.name); continue }
    try {
      const res = await fetchImpl(t.url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body })
      if (res.status >= 200 && res.status < 300) posted.push(t.name)
      else failed.push(t.name)
    } catch {
      failed.push(t.name)
    }
  }
  return { posted, failed }
}
