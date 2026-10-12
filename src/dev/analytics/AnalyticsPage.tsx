import { useMemo, useState } from 'preact/hooks'
import { Icon, ICONS, type IconName } from '@shared/ui'
import { config } from '@shared/config'
import { ChartCard, fmt } from './card'
import { LineChart, StatTile, shortDate } from './charts'
import { BarList, Heatmap, Legend, StackedBars, WEEKDAYS, type StackSeries } from './bars'
import { buildAnalytics, JIRA_STATUSES, RANGES, type DesignerRow, type JiraStatus, type Range, type TicketRow, type UserRow } from './mock'
import { BrandChip, Person, SearchField, SortSelect, SortableTable, IconButton, brandLabel, downloadCsv, type Column } from './widgets'
import './analytics.css'

/** Status of the workflow, not good/bad: categorical slots 1–4, in fixed order. */
const STATUS_SERIES: readonly StackSeries[] = JIRA_STATUSES.map((s, i) => ({ key: s, label: s, color: `var(--an-series-${i + 1})` }))
const statusColor = (s: JiraStatus) => `var(--an-series-${JIRA_STATUSES.indexOf(s) + 1})`
const tabIcon = (id: string): IconName => { const icon = config.tabs[id]?.icon ?? ''; return icon in ICONS ? icon as IconName : 'variables' }

type Metric = 'active' | 'hours'
type FeatureSort = 'sessions' | 'users' | 'avgMinutes'
type BrandSort = 'installs' | 'active'
type DesignerSort = 'total' | 'open' | 'done' | 'hours'

const FEATURE_SORTS = [{ key: 'sessions', label: 'Sessions' }, { key: 'users', label: 'Users' }, { key: 'avgMinutes', label: 'Avg. minutes' }] as const
const BRAND_SORTS = [{ key: 'installs', label: 'Installs' }, { key: 'active', label: 'Active' }] as const
const DESIGNER_SORTS = [{ key: 'total', label: 'Total tickets' }, { key: 'open', label: 'Open tickets' }, { key: 'done', label: 'Done' }, { key: 'hours', label: 'Hours logged' }] as const

const designerTotal = (d: DesignerRow) => JIRA_STATUSES.reduce((t, s) => t + d.counts[s], 0)
const designerOpen = (d: DesignerRow) => designerTotal(d) - d.counts.Done
const designerKey = (sort: DesignerSort) => (d: DesignerRow) => sort === 'total' ? designerTotal(d) : sort === 'open' ? designerOpen(d) : sort === 'done' ? d.counts.Done : d.hoursLogged

/**
 * dev.html › Analytics: a visual of what plugin telemetry could show. Every
 * number is mock data from mock.ts; nothing is tracked or sent anywhere.
 */
export function AnalyticsPage() {
  const [range, setRange] = useState<Range>(30)
  const [brand, setBrand] = useState('all')
  const [persona, setPersona] = useState('all')
  const [metric, setMetric] = useState<Metric>('active')
  const [featureSort, setFeatureSort] = useState<FeatureSort>('sessions')
  const [brandSort, setBrandSort] = useState<BrandSort>('installs')
  const [designerSort, setDesignerSort] = useState<DesignerSort>('total')
  const [userQuery, setUserQuery] = useState('')
  const [ticketQuery, setTicketQuery] = useState('')
  const [statuses, setStatuses] = useState<ReadonlySet<JiraStatus>>(new Set(JIRA_STATUSES))

  const data = useMemo(() => buildAnalytics(range, brand, persona), [range, brand, persona])
  const period = `${range} days`
  const filtered = brand !== 'all' || persona !== 'all' || range !== 30
  const clearFilters = () => { setRange(30); setBrand('all'); setPersona('all') }

  const brandRows = useMemo(() => [...data.brands].sort((a, b) => b[brandSort] - a[brandSort]), [data, brandSort])
  const featureRows = useMemo(() => [...data.features].sort((a, b) => b[featureSort] - a[featureSort]), [data, featureSort])
  const designerRows = useMemo(() => { const k = designerKey(designerSort); return [...data.jira.designers].sort((a, b) => k(b) - k(a)) }, [data, designerSort])
  const tickets = useMemo(() => data.jira.tickets.filter((t) => statuses.has(t.status)), [data, statuses])
  const toggleStatus = (s: JiraStatus) => setStatuses((cur) => { const next = new Set(cur); if (next.has(s)) next.delete(s); else next.add(s); return next })

  const userColumns: readonly Column<UserRow>[] = [
    { key: 'name', label: 'Name', value: (u) => u.name, render: (u) => <Person name={u.name} /> },
    { key: 'brand', label: 'Brand', value: (u) => u.brand, render: (u) => <BrandChip id={u.brandId} /> },
    { key: 'persona', label: 'Persona', value: (u) => u.persona },
    { key: 'sessions', label: 'Sessions', value: (u) => u.sessions, numeric: true },
    { key: 'hours', label: 'Hours', value: (u) => u.hours, numeric: true },
    { key: 'avg', label: 'Avg. session (min)', value: (u) => u.avgMinutes, numeric: true },
    { key: 'top', label: 'Favourite tab', value: (u) => u.topTab, render: (u) => <span class="an-tab"><Icon name={tabIcon(featureRows.find((f) => f.label === u.topTab)?.id ?? '')} size="sm" />{u.topTab}</span> },
    { key: 'installed', label: 'Installed', value: (u) => u.installedDaysAgo, numeric: true, render: (u) => `${u.installedDaysAgo} days ago`, noSearch: true },
    { key: 'last', label: 'Last active', value: (u) => u.lastActive, noSearch: true },
  ]
  const maxTicketHours = Math.max(1, ...data.jira.tickets.map((t) => Math.max(t.loggedHours, t.estimateHours)))
  const ticketColumns: readonly Column<TicketRow>[] = [
    { key: 'key', label: 'Ticket', value: (t) => t.key, render: (t) => <span class="an-mono">{t.key}</span> },
    { key: 'title', label: 'Summary', value: (t) => t.title },
    { key: 'assignee', label: 'Assignee', value: (t) => t.assignee, render: (t) => <Person name={t.assignee} /> },
    { key: 'brand', label: 'Brand', value: (t) => brandLabel(t.brandId), render: (t) => <BrandChip id={t.brandId} logoOnly /> },
    { key: 'status', label: 'Status', value: (t) => t.status, render: (t) => <span class="an-status"><span class="an-status__dot" style={{ background: statusColor(t.status) }} aria-hidden="true" />{t.status}</span> },
    { key: 'logged', label: 'Logged vs estimate', value: (t) => t.loggedHours, numeric: true, render: (t) => <LoggedMeter ticket={t} max={maxTicketHours} /> },
    { key: 'age', label: 'Age', value: (t) => t.ageDays, numeric: true, render: (t) => `${t.ageDays} d`, noSearch: true },
  ]

  return (
    <div class="dh-page">
      <header class="dh-page__header">
        <div class="dh-page__heading">
          <h1 class="dh-page__title">Analytics</h1>
          <span class="dh-page__context">Plugin usage and Jira work</span>
        </div>
        <div class="dh-page__actions">
          <span class="dh-meta"><span>Updated today, 09:00</span></span>
          <span class="dh-chip" data-tone="info" title="Every number on this page is generated. No usage is tracked or sent anywhere."><Icon name="info-component" size="sm" />Mock data</span>
          <button type="button" class="dh-btn" onClick={() => downloadCsv(`bluebird-usage-${range}d`, ['Date', 'Active users', 'Hours in plugin'], data.daily.map((d) => [d.date, d.active, d.hours]))}>
            <Icon name="tool-export" size="sm" />Export
          </button>
        </div>
      </header>

      <div class="an__toolbar" role="group" aria-label="Filters">
        <div class="dh-seg" role="group" aria-label="Period">
          {RANGES.map((r) => <button key={r} type="button" aria-pressed={range === r} onClick={() => setRange(r)}>Last {r} days</button>)}
        </div>
        <span class="an__filter">
          {brand !== 'all' && <BrandChip id={brand} logoOnly />}
          <select class="dh-control" aria-label="Brand" value={brand} onChange={(e) => setBrand((e.currentTarget as HTMLSelectElement).value)}>
            <option value="all">All brands</option>
            {Object.entries(config.brand.brands).map(([id, b]) => <option key={id} value={id}>{b.label}</option>)}
          </select>
        </span>
        <select class="dh-control" aria-label="Persona" value={persona} onChange={(e) => setPersona((e.currentTarget as HTMLSelectElement).value)}>
          <option value="all">All personas</option>
          {Object.entries(config.personas).map(([id, p]) => <option key={id} value={id}>{p.label}</option>)}
        </select>
        {filtered && <button type="button" class="dh-btn" data-variant="quiet" onClick={clearFilters}>Clear filters</button>}
      </div>

      <div class="an">
        <h2 class="an__section"><Icon name="visualization" size="sm" />Plugin usage</h2>
        <div class="an-stats">
          <StatTile hero icon="access" label="Active users" kpi={data.kpis.activeUsers} period={period} />
          <StatTile icon="extract" label="Installs" kpi={data.kpis.installs} period={period} />
          <StatTile icon="show" label="Avg. session" kpi={data.kpis.avgSessionMinutes} unit=" min" period={period} />
          <StatTile icon="version" label="Time per user / week" kpi={data.kpis.hoursPerUserWeek} unit=" h" period={period} />
          <StatTile icon="jira" label="Jira tickets opened in plugin" kpi={data.kpis.jiraTickets} period={period} />
        </div>

        <div class="an-grid">
          <ChartCard
            span={2} icon="visualization" title={metric === 'active' ? 'Daily active users' : 'Daily hours in plugin'} subtitle={metric === 'active' ? 'People who opened the plugin each day' : 'Time spent across everyone, per day'}
            actions={
              <div class="dh-seg" role="group" aria-label="Measure">
                <button type="button" aria-pressed={metric === 'active'} onClick={() => setMetric('active')}>Users</button>
                <button type="button" aria-pressed={metric === 'hours'} onClick={() => setMetric('hours')}>Hours</button>
              </div>
            }
            table={{ columns: ['Date', 'Active users', 'Hours in plugin'], rows: data.daily.map((d) => [shortDate(d.date), d.active, d.hours]) }}
          >
            {(tip) => <LineChart points={data.daily.map((d) => ({ label: shortDate(d.date), value: metric === 'active' ? d.active : d.hours }))} series={metric === 'active' ? 'Active users' : 'Hours'} unit={metric === 'hours' ? ' h' : ''} tooltip={tip} />}
          </ChartCard>
          <ChartCard
            icon="colors" title="Installs by brand" subtitle="Select a brand to filter the page"
            actions={<SortSelect options={BRAND_SORTS} value={brandSort} onChange={setBrandSort} />}
            table={{ columns: ['Brand', 'Installs', 'Active'], rows: brandRows.map((b) => [b.label, b.installs, b.active]) }}
          >
            {(tip) => (
              <BarList
                rows={brandRows.map((b) => ({ id: b.id, label: b.label, value: b[brandSort], detail: brandSort === 'installs' ? `${fmt(b.active)} active in period` : `${fmt(b.installs)} installed`, leading: <BrandChip id={b.id} logoOnly /> }))}
                measure={brandSort === 'installs' ? 'Installs' : 'Active users'} tooltip={tip} highlight={brand === 'all' ? undefined : brand}
                onSelect={(id) => setBrand(brand === id ? 'all' : id)}
              />
            )}
          </ChartCard>
          <ChartCard
            icon="navbar-tab-icon" title="Most-used features" subtitle="By tab"
            actions={<SortSelect options={FEATURE_SORTS} value={featureSort} onChange={setFeatureSort} />}
            table={{ columns: ['Tab', 'Sessions', 'Users', 'Avg. minutes'], rows: featureRows.map((f) => [f.label, f.sessions, f.users, f.avgMinutes]) }}
          >
            {(tip) => (
              <BarList
                rows={featureRows.map((f) => ({ id: f.id, label: f.label, value: f[featureSort], detail: `${fmt(f.sessions)} sessions, ${f.users} users, ${f.avgMinutes} min avg.`, leading: <span class="an-tab__icon"><Icon name={tabIcon(f.id)} size="sm" /></span> }))}
                measure={FEATURE_SORTS.find((s) => s.key === featureSort)?.label ?? ''} unit={featureSort === 'avgMinutes' ? ' min' : ''} tooltip={tip}
              />
            )}
          </ChartCard>
          <ChartCard span={2} icon="research" title="When people use it" subtitle="Sessions by weekday and hour (local time)" table={{ columns: ['Day', ...Array.from({ length: 24 }, (_, h) => `${h}h`)], rows: data.heat.map((hours, d) => [WEEKDAYS[d]!, ...hours]) }}>
            {(tip) => <Heatmap grid={data.heat} tooltip={tip} />}
          </ChartCard>
        </div>

        <section class="an-card" data-span={3} aria-label="Top users">
          <header class="an-card__head">
            <span class="an-card__icon"><Icon name="access" size="sm" /></span>
            <div class="an-card__text"><h3 class="an-card__title">Top users</h3><p class="an-card__subtitle">Most time in the plugin this period</p></div>
            <div class="an-card__actions">
              <SearchField value={userQuery} onChange={setUserQuery} placeholder="Search people" />
              <IconButton icon="tool-export" label="Export top users as CSV" onClick={() => downloadCsv('bluebird-top-users', userColumns.map((c) => c.label), data.users.map((u) => userColumns.map((c) => c.value(u))))} />
            </div>
          </header>
          <SortableTable caption="Top users" columns={userColumns} rows={data.users} rowKey={(u) => u.name} defaultSort={{ key: 'hours', dir: 'desc' }} query={userQuery} empty="No one matches that name." />
        </section>

        <h2 class="an__section"><Icon name="jira" size="sm" />Jira</h2>
        <div class="an-stats">
          <StatTile icon="jira" label="Open tickets" kpi={data.jira.kpis.open} upIsGood={false} period={period} />
          <StatTile icon="status-good" label="Closed" kpi={data.jira.kpis.closed} period={period} />
          <StatTile icon="version" label="Avg. time per ticket" kpi={data.jira.kpis.hoursPerTicket} unit=" h" upIsGood={false} period={period} />
          <StatTile icon="change-log" label="Avg. cycle time" kpi={data.jira.kpis.cycleDays} unit=" days" upIsGood={false} period={period} />
        </div>

        <div class="an-grid">
          <ChartCard
            span={2} icon="layers" title="Tickets per designer" subtitle="Assigned tickets by status" legend={<Legend series={STATUS_SERIES} />}
            actions={<SortSelect options={DESIGNER_SORTS} value={designerSort} onChange={setDesignerSort} />}
            table={{ columns: ['Designer', 'Brand', ...JIRA_STATUSES, 'Total'], rows: designerRows.map((d) => [d.name, brandLabel(d.brandId), ...JIRA_STATUSES.map((s) => d.counts[s]), designerTotal(d)]) }}
          >
            {(tip) => <StackedBars rows={designerRows.map((d) => ({ label: d.name, values: d.counts, leading: <Person name={d.name} detail={brandLabel(d.brandId)} /> }))} series={STATUS_SERIES} tooltip={tip} />}
          </ChartCard>
          <ChartCard icon="version" title="Hours logged per designer" subtitle="Time logged on Jira tickets" table={{ columns: ['Designer', 'Hours'], rows: designerRows.map((d) => [d.name, d.hoursLogged]) }}>
            {(tip) => <BarList rows={designerRows.map((d) => ({ id: d.name, label: d.name, value: d.hoursLogged, leading: <BrandChip id={d.brandId} logoOnly /> }))} measure="Hours logged" unit=" h" tooltip={tip} />}
          </ChartCard>
        </div>

        <section class="an-card" data-span={3} aria-label="Time per ticket">
          <header class="an-card__head">
            <span class="an-card__icon"><Icon name="file-change" size="sm" /></span>
            <div class="an-card__text"><h3 class="an-card__title">Time per ticket</h3><p class="an-card__subtitle">Hours logged against the estimate</p></div>
            <div class="an-card__actions">
              <div class="an-chips" role="group" aria-label="Status">
                {JIRA_STATUSES.map((s) => (
                  <button key={s} type="button" class="an-chips__chip" aria-pressed={statuses.has(s)} onClick={() => toggleStatus(s)}>
                    <span class="an-status__dot" style={{ background: statusColor(s) }} aria-hidden="true" />{s}
                  </button>
                ))}
              </div>
              <SearchField value={ticketQuery} onChange={setTicketQuery} placeholder="Search tickets" />
              <IconButton icon="tool-export" label="Export tickets as CSV" onClick={() => downloadCsv('bluebird-tickets', ticketColumns.map((c) => c.label), tickets.map((t) => ticketColumns.map((c) => c.value(t))))} />
            </div>
          </header>
          <SortableTable caption="Time per ticket" columns={ticketColumns} rows={tickets} rowKey={(t) => t.key} defaultSort={{ key: 'logged', dir: 'desc' }} query={ticketQuery} empty="No tickets match. Try another status or search." />
        </section>
      </div>
    </div>
  )
}

/** Logged time as a bar, the estimate as a tick; over-estimate is flagged in words, not colour alone. */
function LoggedMeter({ ticket, max }: { ticket: TicketRow; max: number }) {
  const over = ticket.loggedHours > ticket.estimateHours
  return (
    <span class="an-meter">
      <span class="an-meter__track">
        <span class="an-meter__bar" data-over={over || undefined} style={{ width: `${(ticket.loggedHours / max) * 100}%` }} />
        <span class="an-meter__tick" style={{ left: `${(ticket.estimateHours / max) * 100}%` }} title={`Estimate ${ticket.estimateHours} h`} />
      </span>
      <span class="an-meter__text" data-num>
        {fmt(ticket.loggedHours)} / {ticket.estimateHours} h
        {over && <span class="an-over"> over estimate</span>}
      </span>
    </span>
  )
}
