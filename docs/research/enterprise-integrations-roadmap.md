# Enterprise integrations roadmap: GitHub and Jira, anywhere they live

Written 2026-11-26. Goal: one plugin, sent cold to ~40 companies, connects to whatever
GitHub and Jira each company runs (cloud, enterprise cloud, or self-hosted behind a VPN),
with sign-in where the company allows it and a pasted token where it doesn't.

---

## 1. The short version

- **The plugin already runs on the designer's own machine, so it already sits inside the
  company's VPN.** A request from the plugin to `github.acme.internal` or `jira.acme.com`
  goes out over that VPN. We don't have to "get through" the VPN; we have to stop blocking
  ourselves.
- What blocks us today is not the VPN. There are three blockers:
  1. **Figma's allow-list.** `manifest.json` lists the exact hosts the plugin may call.
     Right now that's `api.github.com` and `github.gapinc.com`. Company 2's GitHub server
     is blocked before the request leaves Figma.
  2. **CORS.** A plugin's requests come from a `null` origin. The server has to answer
     "any origin is fine", or the browser throws the response away. GitHub (every flavour)
     does. Jira mostly doesn't.
  3. **Sign-in needs a server.** OAuth needs a redirect address and a client secret, and
     a Figma plugin has neither. Figma says so in its docs.
- So the plan has three layers, and each company uses only the layers it needs:

| Layer | What it is | Who runs it | Needed for |
|---|---|---|---|
| **A. Direct** | Plugin → company server, with a token | Nobody: it's just the plugin | GitHub everywhere; Jira when CORS allows it |
| **B. Bluebird Cloud** | A small hosted service of ours: sign-in brokering + a pass-through relay | Us | GitHub sign-in on github.com, Jira Cloud sign-in, Jira Cloud token relay |
| **C. Bluebird Gateway** | The *same* service as a Docker image the company runs inside its own network | The company's IT | Jira Data Center behind a VPN; sign-in against self-hosted GitHub or Jira |

- **Day one of the cold email should need no IT ticket.** Layer A with pasted tokens has
  to work for every company out of the box. Sign-in (B) and the Gateway (C) are upgrades a
  company opts into once they like the tool.

---

## 2. Where things stand in the code today

| Area | File | What it does now | Problem for 40 companies |
|---|---|---|---|
| Network allow-list | `manifest.json` › `networkAccess.allowedDomains` | `api.github.com`, `github.gapinc.com`, AI providers, Teams hosts | Any other company's GitHub/Jira host is blocked by Figma |
| Jira proxy | `devAllowedDomains: http://localhost:8787` | Only in development builds | **Jira doesn't work at all in a published build.** `*.atlassian.net` isn't allowed either |
| GitHub client | `src/shared/github/client.ts` | `baseUrl` → `<baseUrl>/api/v3` (GHES), else `api.github.com` | Data-residency tenants (`acme.ghe.com`) use `https://api.acme.ghe.com`, not `/api/v3`, so they get a wrong URL |
| GitHub settings | `schema.ts` › `github.baseUrl`, `mcp.enterpriseUrl`, `storage.baseUrl` + 5 tokens | Three separate host fields, five separate tokens | The same company types its GitHub host three times and makes up to five tokens |
| Jira settings | `schema.ts` › `jira` + `validate.ts` | Cloud site pinned to `*.atlassian.net`; DC via `baseUrl`; proxy must be `localhost` | No way to point at a company-hosted proxy or gateway |
| Jira client | `src/shared/jira/http.ts` | Cloud = Basic email:token, DC = Bearer PAT, optional proxy | Fine as transport; needs an OAuth-token mode and a gateway route |
| Secrets | `figma.clientStorage` under `bluebird:integrations` | Per user, per machine | Fine; sign-in tokens go here too |
| File key | `figma.fileKey` (MCP, Jira, History) | Already falls back to `null` | Community publishing loses deep links; not a blocker |

The code is in good shape for this. Transport, validation and settings are already split
cleanly, and the host checks (`validate.ts`) already make sure a token only goes to a host
the person chose. The work is mostly opening the allow-list, adding a "connection profile"
idea, and building the one service in layers B and C.

---

## 3. Every scenario a company can be in

### GitHub

| # | What the company runs | How to tell | API address | CORS from plugin | VPN | Token (day one) | Sign-in |
|---|---|---|---|---|---|---|---|
| G1 | github.com (Free/Team/Enterprise Cloud) | `github.com/<org>` | `api.github.com` | ✅ any origin | No | ✅ Direct | Bluebird Cloud + **our** GitHub App |
| G2 | Enterprise Cloud with data residency | `<sub>.ghe.com` | `api.<sub>.ghe.com` | ✅ (same platform; verify in spike) | No | ✅ Direct once the URL is fixed | Bluebird Cloud + a GitHub App **they** register on their tenant |
| G3 | Enterprise Server, reachable on the internet | `github.acme.com`, `/api/v3/meta` answers | `<host>/api/v3` | ✅ any origin (GitHub docs) | No | ✅ Direct | Bluebird Cloud + App they register on their server |
| G4 | Enterprise Server behind the VPN | Same, only on VPN | `<host>/api/v3` | ✅ | **Yes** | ✅ Direct (rides the designer's VPN) | **Gateway** inside their network + App they register |

Key point: **GitHub tokens work everywhere directly**, including behind a VPN, as soon as the
allow-list stops blocking the host. That's the biggest win and the cheapest.

Why sign-in for G4 needs the Gateway: the code-for-token swap happens server-side, against
their GitHub server. A server on the public internet can't reach a server behind their VPN.
GitHub added PKCE in July 2025, which could let the plugin do the swap itself, but GitHub
staff said the token endpoint still lacked CORS at the time. Treat that as "test in the
spike, don't plan on it".

### Jira

| # | What the company runs | How to tell | CORS from plugin | VPN | Token (day one) | Sign-in |
|---|---|---|---|---|---|---|
| J1 | Jira Cloud | `<site>.atlassian.net`, `/rest/api/3/serverInfo` says `Cloud` | ❌ with API tokens, ✅ with OAuth (3LO) tokens through `api.atlassian.com` (per Atlassian staff) | No | Via **Bluebird Cloud relay** (pass-through, stores nothing) | Bluebird Cloud + **our** Atlassian app, then direct calls to `api.atlassian.com/ex/jira/{cloudId}` |
| J2 | Jira Data Center, reachable on the internet | `serverInfo` says `Server` | ❌ (assume; verify) | No | Via Bluebird Cloud relay (their host on our allow-list for them) or Gateway | OAuth 2.0 incoming application link (Jira 8.22+, PKCE supported) + Gateway |
| J3 | Jira Data Center behind the VPN | Only reachable on VPN | ❌ | **Yes** | **Gateway** (or the desktop helper for a pilot) | Incoming application link + **Gateway** |

Key point: **Jira always needs something in the middle**, except Jira Cloud *after* OAuth
sign-in. For Jira behind a VPN, the thing in the middle has to be inside the VPN: the
company's Gateway, or a small helper on the designer's machine.

### What each company gets

```
                 ┌─────────────── Day one, no IT ticket ───────────────┐
GitHub  G1–G4    Paste a token → works (Direct)
Jira    J1       Paste email + API token → works (Bluebird Cloud relay)
Jira    J2/J3    Not yet → "Ask IT for the Bluebird Gateway" screen, or desktop helper (pilot)
                 └──────────────────────────────────────────────────────┘

                 ┌─────────────── Upgrade, IT approves an app ─────────┐
GitHub  G1       "Sign in with GitHub" (our app)
GitHub  G2/G3    "Sign in with GitHub" (their app, via Bluebird Cloud)
Jira    J1       "Sign in with Atlassian" (our app)
GitHub  G4, Jira J2/J3   Sign-in through their own Gateway
                 └──────────────────────────────────────────────────────┘
```

---

## 4. The architecture

### 4.1 Connection profiles (plugin)

Replace "a pile of host + token fields per section" with one **connection** per service:

```ts
type GithubConnection = {
  flavor: 'github.com' | 'ghe.com' | 'server'   // detected, not asked
  host: string                                   // github.com | acme.ghe.com | github.acme.com
  auth: { mode: 'token'; token: string }
      | { mode: 'signin'; accessToken: string; refreshHandle: string; expiresAt: number; login: string }
  route: 'direct' | { gateway: string }          // GitHub is direct unless sign-in uses a gateway
}

type JiraConnection = {
  flavor: 'cloud' | 'datacenter'
  site: string                                   // acme.atlassian.net | jira.acme.com
  cloudId?: string                               // Cloud + sign-in only
  auth: { mode: 'token'; email?: string; token: string }
      | { mode: 'signin'; accessToken: string; refreshHandle: string; expiresAt: number; account: string }
  route: 'direct' | 'bluebird-cloud' | { gateway: string }
}
```

- **One GitHub connection** feeds GitHub, MCP (all three scenarios) and Storage. The MCP
  "one token per scenario" decision stays possible as an *override*, but the default is
  one sign-in.
- The API base comes from `flavor`: `api.github.com`, `api.<sub>.ghe.com`, or
  `<host>/api/v3`. This fixes the data-residency bug.
- `route` decides where the request goes. `http.ts` already has the endpoint/site split
  (`endpoint` = proxy or site). It generalises to `endpoint` = site, Bluebird Cloud relay,
  or gateway.

### 4.2 Detection: "paste any link"

The person pastes **anything**: a repo URL, a Jira issue URL, a bare host. The plugin works
the rest out:

| Probe | Answer means |
|---|---|
| Host is `github.com` | G1 |
| Host ends `.ghe.com` | G2, API at `api.<sub>.ghe.com` |
| `GET https://<host>/api/v3/meta` returns JSON with `installed_version` | G3/G4 (GHES) |
| Host ends `.atlassian.net` | J1 |
| `GET https://<host>/rest/api/2/serverInfo` returns `deploymentType` | J2/J3, and the version (tells us if OAuth 2.0 links exist) |
| Network error on a private-looking host | "Can't reach jira.acme.com. Are you on the VPN?" |
| Response but CORS-blocked | "Jira answered but blocks plugins. You'll need the Gateway (or the relay for Cloud)." |

Then the screen shows only the options that apply: "Sign in with GitHub" if a GitHub App is
set up for that host, else "Paste a token", with the exact scopes listed.

### 4.3 Bluebird Cloud (layer B)

One small HTTPS service, e.g. `connect.bluebird.design` (name TBD). Cloudflare Workers or
Vercel functions are enough. It does exactly three things:

1. **Sign-in broker** (Figma's documented plugin OAuth pattern):
   1. Plugin creates a random `readKey` + `writeKey` pair, opens
      `connect…/start/github?write=<writeKey>` in the browser (`figma.openExternal`).
   2. User signs in on the provider's real page and approves.
   3. Our callback swaps the code for tokens (the client secret lives only here), encrypts
      them, stores them under `readKey` for ~5 minutes.
   4. Plugin polls `connect…/poll?read=<readKey>`, gets the access token once, record deleted.
   5. **Refresh**: plugin keeps an opaque `refreshHandle`. When the token expires it calls
      `connect…/refresh`. The refresh token itself never leaves our server, because Atlassian
      and GitHub both need the client secret to refresh.
2. **Jira Cloud relay** for token mode: today's `tools/jira-proxy` logic, hosted. A strict
   pass-through: only `*.atlassian.net` targets, only `/rest/api/*` paths, no logging of
   bodies or headers, nothing stored. This is what makes Jira Cloud work on day one.
3. **"Bring your own app" registry** for G2/G3: a company that registered its own GitHub
   App gives us (through an admin page, never through the plugin) its host, client ID and
   secret. Then "Sign in with GitHub" works against their host.

What it must **never** do: see design data, proxy GitHub traffic (not needed: GitHub has
CORS), or keep request logs with tokens in them.

### 4.4 Bluebird Gateway (layer C)

**The same codebase as Bluebird Cloud**, shipped as a Docker image (plus a Helm chart). The
company's IT runs it inside their network, e.g. `https://bluebird-gateway.acme.internal`.

- Same sign-in broker, using apps *they* register on *their* GitHub Server / Jira DC
  (GitHub App on GHES; Jira incoming application link with OAuth 2.0).
- Same relay, but the allow-list is their own hosts (`JIRA_PROXY_HOSTS` already exists in
  `tools/jira-proxy`).
- The designer's plugin reaches the gateway over the same VPN. The gateway reaches Jira and
  GitHub inside the network. Nothing crosses the internet except the designer's own VPN.
- Config through environment variables. Optional: it logs who connected (IT security teams
  like an audit trail).

### 4.5 Desktop helper (pilot only)

For a design team that wants to try Jira DC before IT approves a Gateway: today's
`npm run jira:proxy`, packaged as a signed menu-bar app for macOS and Windows. It runs on
the designer's machine (inside the VPN) on `localhost`. This is a pilot tool, not the
enterprise answer: many IT departments block unsigned or unknown local apps.

### 4.6 Figma network access

- `allowedDomains`: switch to `["*"]`. Figma documents `*` as "all domains". The manifest
  `reasoning` has to explain why (company-chosen GitHub/Jira hosts). Keep it under 1000
  characters; `scripts/check-manifest.ts` already enforces that.
- The safety net stays in our own code: `validate.ts` + `configFromSettings` only send a
  token to the host the person typed, https only, no credentials in the URL.
- Per-company builds (`BB_DEPLOY=<brand>`, `npm run package`) can **narrow** the list back to
  that company's actual hosts plus Bluebird Cloud or their gateway. Security reviewers
  prefer the narrow version. Add `brand.brands.<id>.networkHosts` to `plugin.config.json`
  and have `tools/deploy/package.ts` write it into the manifest.

### 4.7 Settings: sign in, or use a token

Every company gets **both** options for GitHub and for Jira. A token is the no-surprises
route that always works and needs no IT approval. Sign-in is the easy route where the
company allows it. The person picks one per service, once.

```
GitHub                                                    ● Connected as @maria
  Where's your GitHub?   [ github.acme.com            ]   Detected: GitHub Enterprise Server

  How do you want to connect?
  ┌───────────────────────────────┐ ┌───────────────────────────────┐
  │ ◉ Sign in with GitHub         │ │ ○ Use an access token         │
  │   Recommended. No keys to     │ │   Works everywhere. No IT     │
  │   copy or renew.              │ │   approval needed.            │
  └───────────────────────────────┘ └───────────────────────────────┘

  [ Sign in with GitHub ]          (sign-in chosen)
  — or —
  Access token [ •••••••••••• ]    (token chosen)
  Needs: Contents and Pull requests (read and write), Actions (read).  How to create one ↗

  ▸ Advanced: company gateway URL  [ https://bluebird-gateway.acme.internal ]

  Repository [ acme/design-tokens ]   Branch [ main ]          [ Test connection ]
```

Jira uses the same layout: **Sign in with Atlassian** / **Use an API token** (Cloud: email
+ API token; Data Center: personal access token, no email).

**States the screen needs**

| State | What shows |
|---|---|
| Not set up | Host field + the two method cards; sign-in preselected when available, else token |
| Sign-in available | "Sign in with GitHub / Atlassian" button |
| Waiting for browser | Spinner + "Finish signing in in your browser" + Cancel; the plugin is polling |
| Connected (sign-in) | Avatar/name, "Connected as …", **Disconnect**; the token field is hidden |
| Connected (token) | Masked token, scopes it has, **Disconnect** |
| Sign-in not possible here | Sign-in card disabled, with a one-line reason and the way out (below); token preselected |
| Expired / revoked | Warning row: "Your GitHub sign-in expired. Sign in again." |
| Connection problem | The Connection doctor's result: VPN / blocked / rejected (§4.2) |

**When sign-in is offered**

| Detected host | Sign-in | Reason shown when it isn't |
|---|---|---|
| github.com, Jira Cloud | Always (our apps) | — |
| ghe.com, public GHES, public Jira DC | When their admin has registered an app with Bluebird | "Your admin hasn't set up sign-in for github.acme.com yet. Use a token, or send them the setup guide." |
| VPN-only host | Only with a company gateway URL | "Your Jira is only reachable on the VPN. Ask IT for the Bluebird gateway, or use a token." |
| VPN-only Jira, no gateway, token | Token also blocked (CORS) | "Jira blocks plugins on this network. Ask IT for the Bluebird gateway." |

**Rules**

- **One connection per service.** The GitHub method and token cover GitHub, MCP and Storage.
  MCP's per-scenario tokens become an optional override under "Advanced".
- **Switching is safe.** Changing method asks first, then disconnects the old one (revokes
  the sign-in, or clears the token).
- **Team setup file** (`transfer.ts`) can set the host, preferred method and gateway URL for
  everyone. It never carries a token or sign-in.
- **Brand config** (`plugin.config.json`) can lock the method, e.g. "sign-in only" for a
  company that has disabled personal tokens.
- **Settings schema** (built 2026-11-26): `github` gains `method`, `gatewayUrl`,
  `signinAccount`, `signinExpires`; `jira` gains `method`, `signinAccount`, `signinExpires`
  and keeps `proxyUrl` as its gateway (now any https address, or localhost for the local
  proxy). A sign-in leaves its token in the same `apiKey` a pasted token uses, so every
  client reads one key. That token never reaches a team setup file, even with keys
  included (`transfer.ts` drops `apiKey` when `method` is `signin`), and `signinAccount` /
  `signinExpires` are personal fields.

**Built in code (2026-11-26, branch `feat/connect-sign-in-or-token`)**

- `src/shell/integrations/ConnectionCard.tsx` + `GatewayField.tsx`, as two new field kinds
  (`connection`, `gateway`) in `sections.ts`. GitHub and Jira use them; Storage and MCP
  still have their own token fields.
- `src/shared/integrations/hosts.ts`: works out github.com / ghe.com / Enterprise Server and
  Jira Cloud / Data Center from the pasted address, and fixes the ghe.com API address
  (`api.<tenant>.ghe.com`, used by the GitHub and MCP clients).
- `src/shared/integrations/signin.ts`: the broker client. **Broker contract** (what Bluebird
  Cloud and the gateway must serve):
  - `POST {broker}/auth/{github|jira}/keys` → `200 { read, write, code }` (keys 16–128 chars,
    `[A-Za-z0-9_-]`; code `XXX-XXX`, shown in the plugin while it waits)
  - browser opens `GET {broker}/auth/{service}/start?host=<host>&write=<write>`, which shows the
    same code and goes on to the provider only after the person clicks Continue
    (see auth-server-roadmap.md §3.3)
  - plugin polls `GET {broker}/auth/poll?read=<read>` every 2 s for up to 5 min:
    `202/204` pending, `200 { accessToken, account, expiresAt }` done (then deleted),
    `404/410` expired.
- Sign-in is offered only when a broker exists: the company gateway URL, or
  `BLUEBIRD_CLOUD_URL` (empty until Phase 2). Otherwise "Sign in" is greyed out with a
  one-line reason, and the person uses a token.
- Settings opens links through a new `integrations:open` sandbox call (https only, or a
  localhost gateway).
- Not done yet: Bluebird Cloud and the gateway themselves, refresh tokens (an expired
  sign-in asks to sign in again), revoking at the provider on Disconnect, a "Connected"
  header label, and `allowedDomains` in the manifest (company hosts are still blocked in a
  published build, Phase 1).

Figma: drawn 2026-11-26 on the Settings page of the backup file (x6BossHvEAmDZos5tHxu4t) as
section "Settings · 600 · Sign-in or token" (40003043:19074). GitHub row: G1 sign in,
G2 waiting for browser, G3 connected with sign-in, G4 access token, G5 sign-in not set up
(token only), G6 sign-in expired, G7 VPN-only with company gateway. Jira row: J1 sign in with
Atlassian, J2 connected, J3 API token (Cloud), J4 Data Center on VPN, blocked.

Revised the same day to look less scattered. Every state now uses one **Connection card**
(bordered, 12 px padding): a header with "Connection" and the detected server type as a Meta
Badge, a full-width Sign in / Token switch (two "Tab selecters" items in a frame styled like
"Tab sub menu"), then that state's content (full-width sign-in button + caption, the
token field, the account row with Disconnect, or the waiting row with Spinner + Cancel).
Alerts (Notice) sit above the card. The gateway is a "Use a company gateway" Toggle, styled
like "Enable diff comparison", with the URL field shown only when it's on. Not built in code.

---

## 5. Roadmap

Rough sizes assume one developer working with Claude Code.

### Phase 0: Spike, verify the unknowns (≈1 week)

Build a throwaway "connection lab" dev page and test each cell with real servers:

| Test | How |
|---|---|
| Plugin `null` origin → github.com, GHES, ghe.com | GHES trial VM; a ghe.com tenant if a friendly company has one |
| Plugin → GHES token endpoint with PKCE, no secret (CORS?) | Same VM |
| Plugin → `api.atlassian.com/ex/jira/{cloudId}` with a 3LO token, GET **and** POST | Free Jira Cloud site + dev Atlassian app |
| Plugin → Jira DC with a PAT (CORS?) | Atlassian's Jira DC Docker image with a trial licence |
| Jira DC OAuth 2.0 incoming link + PKCE from a gateway | Same |
| `allowedDomains: ["*"]` imports and publishes | Private publish + a Community review dry run |
| Private-network access (Chrome PNA) from Figma desktop to an intranet host | Docker host on a LAN IP |

**Exit:** the scenario table in §3 with every ✅/❌ confirmed, plus a list of changes to the plan.

### Phase 1: "Works anywhere with a token" (≈2 weeks, no server)

1. `allowedDomains: ["*"]` + new reasoning; update `check-manifest.ts`.
2. One shared **GitHub connection** (flavour, host, token) feeding GitHub, MCP, Storage;
   migrate old settings (keep per-scenario token as an override).
3. Fix the `ghe.com` API base; detect GHES via `/api/v3/meta`.
4. Jira: accept a Data Center host directly when CORS allows it (spike result); detect
   Cloud vs DC via `serverInfo`.
5. **VPN-aware errors**: tell "can't reach the host" (VPN/DNS) apart from "reached but
   blocked" (CORS) and "rejected" (token/scopes).
6. **Connection doctor** in Settings: reach → CORS → auth → permissions on the repo or
   project. Ends with a "Copy report for IT" button.
7. Token screens list the exact scopes per flavour (fine-grained PAT for github.com/GHEC,
   classic PAT for older GHES, Jira API token vs DC PAT).

**Exit:** GitHub works for G1–G4 with a token. Jira works where the spike says direct
works. Tests cover each flavour's URL building and error mapping.

### Phase 2: Bluebird Cloud: sign-in + Jira Cloud relay (≈3 weeks)

1. Service skeleton (Workers or Vercel), encrypted key-value store with a TTL, health check,
   rate limits per IP and per `readKey`.
2. Hosted **Jira Cloud relay** (port `tools/jira-proxy/proxy.ts`, which is already pure and
   tested). Jira Cloud now works on day one.
3. **Register our GitHub App** (Contents R/W, Pull requests R/W, Actions R, Metadata R).
   Plugin "Sign in with GitHub" → broker → token; "Install on your org" link for the admin.
4. **Register our Atlassian 3LO app**, distribution set to Sharing (needs a privacy
   policy URL and a personal-data declaration). Scopes: `read:jira-work`,
   `write:jira-work`, `read:jira-user`, `offline_access`. After sign-in the plugin calls
   `api.atlassian.com` directly (if the spike confirms CORS, including POST), else via the relay.
5. Refresh, **Disconnect** (revokes at the provider and deletes our handle), expiry handling.
6. Add the Bluebird Cloud domain to the manifest; privacy policy + security page on the site.

**Exit:** a github.com company and a Jira Cloud company connect with two clicks each and no tokens.

### Phase 3: Bluebird Gateway for VPN-only companies (≈3 weeks)

1. Package the Phase 2 service as a Docker image; config through env vars
   (`GITHUB_HOST`, `GITHUB_APP_*`, `JIRA_HOST`, `JIRA_OAUTH_*`, `ALLOWED_ORIGINS`).
2. Sign-in against **their** GitHub Server (GitHub App on GHES) and **their** Jira DC
   (incoming application link, OAuth 2.0, PKCE).
3. Relay for Jira DC PAT mode.
4. Plugin: "Your company runs a Bluebird Gateway" field, also settable from the team setup
   file and `plugin.config.json` (it's not a secret).
5. Helm chart, `docker compose` example, a 1-page **IT install guide**, and an optional audit log.
6. Optional: signed desktop helper for pilots.

**Exit:** a VPN-only Jira DC + GHES test environment works end to end through the gateway.

### Phase 4: Onboarding for 40 companies (≈2 weeks, overlaps 2–3)

1. **Team setup file** (`src/shared/integrations/transfer.ts`) carries the connection
   profiles, *without* secrets. The design-system lead sets it up once and shares the file;
   everyone else just signs in.
2. "Bring your own GitHub App" admin page on Bluebird Cloud (G2/G3).
3. Per-company package: `networkHosts` narrows `allowedDomains` (§4.6).
4. **IT pack** (one web page + PDF): what talks to what (diagram), what's stored where, scopes
   requested, how to revoke, Gateway install, and answers to the usual security questionnaire.
5. A first-run "Where does your team's GitHub / Jira live?" step in onboarding that runs
   detection (§4.2).

### Phase 5: Hardening before wide rollout (≈2 weeks)

- Security review of the broker/relay (`security-reviewer` agent + an outside check):
  open-redirect, SSRF in the relay, token logging, key reuse, replay of `readKey`.
- Secrets in a KMS; rotate the app secrets; per-company kill switch.
- Monitoring and alerting on Bluebird Cloud; status page.
- Data-handling statement: design data stays in Figma and on the company's own servers;
  AI calls go only to the provider the company picked.

---

## 6. Distribution: how 40 companies install it

| Route | How it reaches them | Good for | Watch out |
|---|---|---|---|
| **Figma Community** (public) | They click Install | Cold email at scale | Figma review; `networkAccess: *` needs a solid reasoning; `figma.fileKey` is null (deep links fall back already); access codes still gate the brand |
| **Zip import** (`npm run package`) | They import a manifest in Figma desktop | Pilots, one company at a time | Every designer imports it by hand; desktop app only; no auto-update |
| **Private org plugin** | Published inside *their* Figma org | Companies that adopt it | Only someone in their org can publish it; that's a step they take after the pilot |

Recommendation: Community plugin for the cold email, a per-company private build once a
company commits (narrow allow-list, their brand, their gateway URL baked in).

---

## 7. What to ask each company (paste into the follow-up email)

1. Where's your code: github.com, `<name>.ghe.com`, or your own GitHub server?
2. Where's Jira: `<name>.atlassian.net`, or your own Jira Data Center (which version)?
3. Are those reachable from the internet, or only on the VPN?
4. Can designers create personal access tokens, or does IT disable them?
5. Who approves GitHub Apps / Atlassian apps, and do you use IP allow-lists?
6. Would IT run a small Docker service inside the network (only needed for VPN-only Jira)?
7. Do you have a security questionnaire for new tools?

Their answers map straight onto §3: G1–G4 × J1–J3 tells you which phases they need.

---

## 8. Risks and open questions

| Risk | Impact | Mitigation |
|---|---|---|
| Jira Cloud 3LO CORS covers GET but not all POSTs (community reports) | Writes fail after sign-in | Route writes through the relay; spike tests POST |
| Figma rejects or questions `allowedDomains: *` in Community review | Delays the cold email | Good reasoning text; fall back to per-company builds; spike does a dry run |
| Companies disable PATs | No day-one route | Sign-in path (Phase 2/3) |
| IT won't run the Gateway | No Jira DC behind VPN | Desktop helper for pilots; Jira DC users get GitHub-only features meanwhile |
| We hold refresh tokens for 40 companies | A breach would be serious | Encrypt with KMS, keep the minimum, short TTLs, disconnect = revoke, outside security review |
| Supporting 7 auth combinations | Support load | Detection + Connection doctor + IT report do most of the triage |
| GHES versions vary (older ones lack fine-grained PATs or some endpoints) | Odd failures | Read `installed_version` from `/api/v3/meta`; set a minimum supported version |

---

## Sources

- Figma: [OAuth with plugins](https://developers.figma.com/docs/plugins/oauth-with-plugins), [Plugin manifest](https://developers.figma.com/docs/plugins/manifest), [Making network requests](https://developers.figma.com/docs/plugins/making-network-requests)
- GitHub: [CORS on Enterprise Server REST API](https://docs.github.com/en/enterprise-server@3.16/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests), [PKCE support (2025-07-14)](https://github.blog/changelog/2025-07-14-pkce-support-for-oauth-and-github-app-authentication/), [PKCE discussion incl. token-endpoint CORS](https://github.com/orgs/community/discussions/15752), [Data residency feature overview](https://docs.github.com/en/enterprise-cloud@latest/admin/data-residency/feature-overview-for-github-enterprise-cloud-with-data-residency)
- Atlassian: [OAuth 2.0 (3LO) apps](https://developer.atlassian.com/cloud/jira/platform/oauth-2-3lo-apps/), [CORS with 3LO (community, Atlassian staff)](https://community.developer.atlassian.com/t/jira-cloud-token-based-auth-cors-isues/37426), [Jira DC OAuth 2.0 provider API](https://confluence.atlassian.com/adminjiraserver/jira-oauth-2-0-provider-api-1115659070.html)
