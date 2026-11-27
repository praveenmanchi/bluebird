// Access-code logins from Analytics Engine (written by tools/connect/events.ts).
//
//   npm run connect:logins            last 30 days, per brand and per day
//   npm run connect:logins -- 7       last 7 days
//
// Needs CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_ANALYTICS_TOKEN (Account › Account Analytics › Read)
// in .env. Counts are weighted by Analytics Engine's sampling, so they stay right at high volume;
// "people" counts distinct pseudonymous ids and is exact at the volumes we expect.
const API = 'https://api.cloudflare.com/client/v4/accounts'
const DATASET = process.env.CONNECT_LOGINS_DATASET ?? 'bluebird_logins_staging'
const MAX_DAYS = 90 // Analytics Engine keeps three months

interface Result { data: Record<string, string | number>[] }

function setting(name: string): string {
  const value = process.env[name]
  if (!value) {
    console.error(`${name} is missing. Add it to .env (see .env.example).`)
    process.exit(1)
  }
  return value
}

function days(): number {
  const n = Number(process.argv[2] ?? 30)
  if (!Number.isInteger(n) || n < 1 || n > MAX_DAYS) {
    console.error(`Days must be a whole number from 1 to ${MAX_DAYS}.`)
    process.exit(1)
  }
  return n
}

async function query(account: string, token: string, sql: string): Promise<Result> {
  const res = await fetch(`${API}/${account}/analytics_engine/sql`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: sql })
  const text = await res.text()
  if (!res.ok) {
    // An empty dataset doesn't exist until the first login is written.
    if (/unknown table|does not exist/i.test(text)) return { data: [] }
    throw new Error(`Analytics Engine answered ${res.status}: ${text.slice(0, 300)}`)
  }
  return JSON.parse(text) as Result
}

async function main(): Promise<void> {
  const account = setting('CLOUDFLARE_ACCOUNT_ID')
  const token = setting('CLOUDFLARE_ANALYTICS_TOKEN')
  const n = days()
  const since = `timestamp > NOW() - INTERVAL '${n}' DAY AND blob1 = 'login'`
  const [byBrand, byDay] = await Promise.all([
    query(account, token, `SELECT blob2 AS brand, SUM(_sample_interval) AS logins, COUNT(DISTINCT blob3) AS people FROM ${DATASET} WHERE ${since} GROUP BY brand ORDER BY logins DESC FORMAT JSON`),
    query(account, token, `SELECT toDate(timestamp) AS day, SUM(_sample_interval) AS logins, COUNT(DISTINCT blob3) AS people FROM ${DATASET} WHERE ${since} GROUP BY day ORDER BY day FORMAT JSON`),
  ])
  console.log(`Access-code logins, last ${n} days (${DATASET})\n`)
  if (byBrand.data.length === 0) { console.log('No logins yet.'); return }
  console.table(byBrand.data)
  console.table(byDay.data)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
