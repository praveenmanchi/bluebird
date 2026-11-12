// Where a Teams / Power Automate post may go. Shared by every tab that notifies a channel.

/**
 * Hosts a Teams post may go to; the plugin manifest allows the same two. Classic
 * "Incoming Webhook" connectors live on *.webhook.office.com, Power Automate
 * "When a Teams webhook request is received" triggers on *.logic.azure.com.
 */
const WEBHOOK_HOSTS = [/^https:\/\/[a-z0-9.-]+\.webhook\.office\.com\//i, /^https:\/\/[a-z0-9.-]+\.logic\.azure\.com\//i]
export const allowedWebhook = (url: string): boolean => WEBHOOK_HOSTS.some((re) => re.test(url))

export const hostOf = (url: string): string => url.replace(/^https?:\/\//, '').split('/')[0] ?? url
