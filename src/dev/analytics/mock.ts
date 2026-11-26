// Mock analytics for dev.html › Analytics. Nothing here is measured: a seeded
// generator makes believable numbers so the dashboard can be designed before
// any telemetry exists. The same filters always give the same numbers.
import { config } from '@shared/config'

export const RANGES = [7, 30, 90] as const
export type Range = (typeof RANGES)[number]
export type BrandFilter = 'all' | string
export type PersonaFilter = 'all' | string

export interface Kpi { value: number; previous: number; trend: readonly number[] }
export interface DailyPoint { date: string; active: number; hours: number }
export interface BrandRow { id: string; label: string; installs: number; active: number }
export interface FeatureRow { id: string; label: string; sessions: number; users: number; avgMinutes: number }
export interface UserRow { name: string; brandId: string; brand: string; personaId: string; persona: string; sessions: number; hours: number; avgMinutes: number; topTab: string; installedDaysAgo: number; lastActive: string }
export const JIRA_STATUSES = ['To do', 'In progress', 'In review', 'Done'] as const
export type JiraStatus = (typeof JIRA_STATUSES)[number]
export interface DesignerRow { name: string; brandId: string; counts: Record<JiraStatus, number>; hoursLogged: number }
export interface TicketRow { key: string; title: string; assignee: string; brandId: string; status: JiraStatus; estimateHours: number; loggedHours: number; ageDays: number }

export interface Analytics {
  range: Range
  kpis: { installs: Kpi; activeUsers: Kpi; avgSessionMinutes: Kpi; hoursPerUserWeek: Kpi; jiraTickets: Kpi }
  daily: readonly DailyPoint[]
  brands: readonly BrandRow[]
  features: readonly FeatureRow[]
  /** Sessions by weekday (Mon = 0) × hour of day (0–23). */
  heat: readonly (readonly number[])[]
  users: readonly UserRow[]
  jira: {
    kpis: { open: Kpi; closed: Kpi; hoursPerTicket: Kpi; cycleDays: Kpi }
    designers: readonly DesignerRow[]
    tickets: readonly TicketRow[]
  }
}

/** mulberry32: small, fast, good enough for fake data. */
function rng(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const hash = (s: string) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619), 2166136261)
const round = (n: number, places = 0) => Math.round(n * 10 ** places) / 10 ** places

const DESIGNERS = [
  'Asha Rao', 'Ben Ortiz', 'Chloe Martin', 'Daniel Kim', 'Elif Yilmaz', 'Farah Haddad',
  'Gustav Lind', 'Hana Sato', 'Ivan Petrov', 'Jade Okafor', 'Kai Weber', 'Lena Novak',
  'Mateo Silva', 'Nora Berg', 'Omar Aziz', 'Priya Nair',
]
/** Relative weight of each tab in sessions: Accessibility and UX AI lead, Audit trails. */
const FEATURE_WEIGHT: Record<string, number> = { a11y: 1, uxai: 0.86, jira: 0.71, agents: 0.52, mcp: 0.44, publish: 0.31, audit: 0.22 }
const TICKET_TITLES = [
  'Checkout: contrast fixes on promo banner', 'Nav drawer focus order', 'Tokenise card elevation', 'Search results empty state',
  'Product tile hover spec', 'Dark mode for settings', 'Form error messaging pass', 'Icon set audit (24px)',
  'Onboarding carousel motion', 'Price label typography', 'Filter chips spacing', 'Modal close target size',
]
const BRAND_SHARE: Record<string, number> = { bridge: 1, ikea: 0.82, microsoft: 0.64, ibm: 0.56, salesforce: 0.5, sap: 0.46, gap: 0.24 }

function kpi(random: () => number, base: number, growth: number, places = 0): Kpi {
  const trend = Array.from({ length: 12 }, (_, i) => round(base * (1 - growth + (growth * i) / 11) * (0.92 + random() * 0.16), places))
  return { value: trend[11]!, previous: round(base * (1 - growth) * (0.95 + random() * 0.1), places), trend }
}

function dateLabel(daysAgo: number, today: Date): string {
  const d = new Date(today)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString().slice(0, 10)
}

export function buildAnalytics(range: Range, brand: BrandFilter, persona: PersonaFilter = 'all', today = new Date('2026-10-12T00:00:00Z')): Analytics {
  const random = rng(hash(`${range}:${brand}:${persona}`))
  const brands = Object.entries(config.brand.brands)
  const personaShare = persona === 'all' ? 1 : persona === 'design-system' ? 0.38 : 0.62
  const share = (brand === 'all' ? brands.reduce((s, [id]) => s + (BRAND_SHARE[id] ?? 0.4), 0) : (BRAND_SHARE[brand] ?? 0.4)) * personaShare
  const scale = share * (range / 30) ** 0.55
  const activeBase = 64 * share

  const daily = Array.from({ length: range }, (_, i) => {
    const daysAgo = range - 1 - i
    const weekday = (new Date(dateLabel(daysAgo, today)).getUTCDay() + 6) % 7
    const weekend = weekday >= 5 ? 0.32 : 1
    const active = Math.max(1, Math.round(activeBase * weekend * (0.85 + (0.25 * i) / range + random() * 0.18)))
    return { date: dateLabel(daysAgo, today), active, hours: round(active * (0.6 + random() * 0.5), 1) }
  })

  const tabs = Object.entries(config.tabs).filter(([, t]) => t.enabled)
  const features = tabs
    .map(([id, t]) => {
      const sessions = Math.round(900 * scale * (FEATURE_WEIGHT[id] ?? 0.3) * (0.9 + random() * 0.2))
      return { id, label: t.label, sessions, users: Math.max(1, Math.round(sessions / (6 + random() * 5))), avgMinutes: round(4 + random() * 14, 1) }
    })
    .sort((a, b) => b.sessions - a.sessions)

  const heat = Array.from({ length: 7 }, (_, day) => Array.from({ length: 24 }, (_, hour) => {
    const work = hour >= 9 && hour <= 18 ? 1 : hour >= 7 && hour <= 21 ? 0.3 : 0.04
    const lunch = hour === 12 || hour === 13 ? 0.6 : 1
    const weekend = day >= 5 ? 0.15 : 1
    const peak = day === 1 || day === 2 ? 1.2 : 1
    return Math.round(40 * scale * work * lunch * weekend * peak * (0.7 + random() * 0.6))
  }))

  const brandRows = brands.map(([id, b]) => {
    const installs = Math.round(120 * (BRAND_SHARE[id] ?? 0.4) * (0.9 + random() * 0.2))
    return { id, label: b.label, installs, active: Math.round(installs * (0.45 + random() * 0.3)) }
  }).sort((a, b) => b.installs - a.installs)

  const brandLabels = new Map(brands.map(([id, b]) => [id, b.label]))
  const personaEntries = Object.entries(config.personas)
  const users = DESIGNERS.map((name, i) => {
    const brandId = brand === 'all' ? brands[i % brands.length]![0] : brand
    const [personaId, personaCfg] = persona === 'all' ? personaEntries[i % 3 === 0 ? 1 : 0] ?? personaEntries[0]! : [persona, config.personas[persona]!]
    const sessions = Math.round((8 + random() * 60) * (range / 30) ** 0.8)
    const avgMinutes = round(5 + random() * 18, 1)
    return {
      name,
      brandId,
      brand: brandLabels.get(brandId) ?? brandId,
      personaId,
      persona: personaCfg.label,
      sessions,
      hours: round((sessions * avgMinutes) / 60, 1),
      avgMinutes,
      topTab: features[Math.floor(random() * Math.min(4, features.length))]?.label ?? '',
      installedDaysAgo: Math.round(14 + random() * 300),
      lastActive: random() > 0.3 ? 'Today' : `${Math.ceil(random() * 6)} days ago`,
    }
  }).sort((a, b) => b.hours - a.hours).slice(0, 10)

  const designers = DESIGNERS.slice(0, 8).map((name, i) => {
    const k = (range / 30) ** 0.7
    const brandId = brand === 'all' ? brands[i % brands.length]![0] : brand
    const counts = { 'To do': Math.round((1 + random() * 5) * k), 'In progress': Math.round((1 + random() * 4) * k), 'In review': Math.round(random() * 3 * k), Done: Math.round((2 + random() * 10) * k) }
    const total = Object.values(counts).reduce((s, n) => s + n, 0)
    return { name, brandId, counts, hoursLogged: round(total * (2.5 + random() * 3), 1) }
  }).sort((a, b) => b.hoursLogged - a.hoursLogged)

  const tickets = TICKET_TITLES.map((title, i) => {
    const estimateHours = [2, 3, 4, 6, 8, 12][Math.floor(random() * 6)]!
    const status = JIRA_STATUSES[Math.floor(random() * 4)]!
    const progress = status === 'Done' ? 0.7 + random() * 0.7 : status === 'To do' ? random() * 0.2 : 0.3 + random() * 0.9
    const owner = designers[i % designers.length]!
    return { key: `DS-${412 + i * 7}`, title, assignee: owner.name, brandId: owner.brandId, status, estimateHours, loggedHours: round(estimateHours * progress, 1), ageDays: Math.round(1 + random() * Math.min(range, 40)) }
  }).sort((a, b) => b.loggedHours - a.loggedHours)

  const openNow = designers.reduce((s, d) => s + d.counts['To do'] + d.counts['In progress'] + d.counts['In review'], 0)
  const closedNow = designers.reduce((s, d) => s + d.counts.Done, 0)

  return {
    range,
    kpis: {
      installs: kpi(random, 120 * share * (0.75 + range / 360), 0.12),
      activeUsers: kpi(random, activeBase * (range / 30) ** 0.35, 0.18),
      avgSessionMinutes: kpi(random, 11.4, 0.08, 1),
      hoursPerUserWeek: kpi(random, 2.6, 0.1, 1),
      jiraTickets: kpi(random, 140 * scale, 0.22),
    },
    daily,
    brands: brandRows,
    features,
    heat,
    users,
    jira: {
      kpis: { open: kpi(random, openNow, -0.06), closed: kpi(random, closedNow, 0.2), hoursPerTicket: kpi(random, 4.8, -0.09, 1), cycleDays: kpi(random, 6.2, -0.12, 1) },
      designers,
      tickets,
    },
  }
}
