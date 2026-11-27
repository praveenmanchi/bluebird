# Bluebird Connect: the sign-in server for GitHub, Jira and Bitbucket

Written 2026-11-26. This doc picks up where
[enterprise-integrations-roadmap.md](enterprise-integrations-roadmap.md) leaves off. That doc
explains *why* a server is needed (§1) and the three layers: Direct, Bluebird Cloud and
Gateway (§4). This one is the build plan for the server itself. It also adds **Bitbucket**
as a third service, next to GitHub and Jira.

---

## 1. What the server does, in one picture

```
 Figma plugin (designer's machine, on their VPN)
   │
   │ 1. POST /auth/{service}/keys ─────────────► Bluebird Connect   (answers read, write and a code like 34M-7GU)
   │ 2. opens browser: /auth/{service}/start?host=…&write=…
   │    plugin shows the code                      │ 2b. page shows the same code; the person clicks Continue
   │                                               │ 3. redirects to GitHub / Atlassian / Bitbucket
   │                                               │ 4. provider calls /auth/{service}/callback?code=…
   │                                               │ 5. swaps the code for tokens (client secret lives here),
   │                                               │    encrypts them, stores them under the read key for 5 min
   │ 6. GET /auth/poll?read=… (every 2 s) ◄────────┘    returns the access token once, then deletes it
   │
   │ 7. normal API calls ──► GitHub / Bitbucket Cloud       direct (they allow plugin origins)
   │                    ──► Jira Cloud, Bitbucket/Jira DC   through /relay/* when CORS blocks the plugin
   │
   │ 8. POST /auth/refresh  (access token expired: the refresh token never leaves the server)
   │ 9. POST /auth/revoke   (Disconnect in Settings)
```

**One codebase, two ways to run it:**

| Run as | Where | Used for |
|---|---|---|
| **Bluebird Cloud** | Our hosting, e.g. `connect.<our-domain>` | github.com, Jira Cloud, Bitbucket Cloud |
| **Bluebird Gateway** | A Docker image the company runs inside its own network | GitHub Enterprise Server, Jira Data Center, Bitbucket Data Center behind a VPN |

The plugin side is already built (branch `feat/connect-sign-in-or-token`):
`src/shared/integrations/signin.ts` speaks the broker contract,
`src/shell/integrations/ConnectionCard.tsx` shows Sign in / Token. It waits on
`BLUEBIRD_CLOUD_URL`, which is empty until this server exists.

---

## 2. Bitbucket: every scenario a company can be in

| # | What the company runs | How to tell | API | CORS from plugin | VPN | Token (day one) | Sign-in |
|---|---|---|---|---|---|---|---|
| B1 | Bitbucket Cloud | `bitbucket.org/<workspace>` | `api.bitbucket.org/2.0` | ✅ per Atlassian staff, **verify in spike** | No | Atlassian **API token with Bitbucket scopes** + Atlassian email (Basic auth), or a workspace / repository access token (Bearer) | Bluebird Cloud + **our** Bitbucket OAuth consumer |
| B2 | Bitbucket Data Center, on the internet | `GET /rest/api/1.0/application-properties` answers | `<host>/rest/api/1.0` | ❌ assume, verify | No | HTTP access token (Bearer) through the relay or Gateway | OAuth 2.0 incoming application link (Bitbucket 7.20+, PKCE) + Gateway |
| B3 | Bitbucket Data Center behind the VPN | Same, only on VPN | Same | ❌ | **Yes** | HTTP access token through the **Gateway** | Incoming application link + **Gateway** |

Things that matter:

- **App passwords are gone.** Atlassian stopped new ones on 2025-09-09 and switched off the
  rest on 2026-06-09. Use **API tokens with scopes** only. With the REST API the username is
  the person's *Atlassian email*, not their Bitbucket username. People get this wrong, so
  the token screen has to say it.
- **Bitbucket Cloud access tokens last 2 hours.** Refresh can't wait for "later" like it can
  for GitHub. It has to ship with Bitbucket sign-in.
- **Scopes sit on the OAuth consumer, not on the request.** Bitbucket Cloud ignores a `scope`
  parameter. We set them once when we register the consumer.
- **Bitbucket Data Center has no multi-file commit over REST.** `PUT …/browse/{path}` writes
  one file per commit. Publish and Extraction commit several files at once, so on DC we
  either make one commit per file on a new branch (a PR squashes them), or the Gateway
  commits with git. The spike decides which.

### What Bitbucket means for the plugin (not only the server)

Today every feature that writes code (Publish, Extraction, History, MCP) calls
`src/shared/github/client.ts` directly. Bitbucket needs a **code host** interface with one
adapter per provider:

| Client call today | GitHub | Bitbucket Cloud | Bitbucket Data Center |
|---|---|---|---|
| `whoAmI` | `GET /user` + `/repos/{r}` | `GET /2.0/user` + `/2.0/repositories/{ws}/{slug}` | `GET /rest/api/1.0/users/{slug}` + `/projects/{p}/repos/{r}` |
| `listBranches` | `/branches` | `/refs/branches` | `/branches` |
| `readFile` / `readFileWithSha` | `/contents/{path}` | `/src/{commit}/{path}` | `/raw/{path}?at=` |
| `commit` (many files) | git trees API | `POST /src` (form data, many files, one commit) | one `PUT /browse/{path}` per file (see above) |
| `createRef` / `moveBranch` | `/git/refs` | `POST /refs/branches` | `POST /rest/branch-utils/1.0/…/branches` |
| `openPull` / `findPull` / `recentPulls` | `/pulls` | `/pullrequests` | `/pull-requests` |
| `runsFor(sha)` (Actions) | `/actions/runs` | `/commit/{sha}/statuses` (Pipelines and other CI) | `/rest/build-status/1.0/commits/{sha}` |

Settings: GitHub and Bitbucket both answer "where does your code live?", and every feature
needs one repository. So the **GitHub section becomes "Code"**, with a GitHub / Bitbucket
choice at the top and the same Connection card under it. Detection (`hosts.ts`) learns
`bitbucket.org` → Cloud, and `application-properties` → Data Center. The manifest gains
`api.bitbucket.org` and `bitbucket.org`.

---

## 3. Server design

### 3.1 Stack

- **TypeScript, plain Fetch API handler** (`(Request) => Promise<Response>`), no framework.
  The same code runs on Cloudflare Workers, Vercel and plain Node in Docker, which is how one
  codebase serves both Cloud and Gateway. (Hono was the first idea; six routes didn't need it.)
- **Storage behind a small interface** (`put(key, value, ttl)`, `get`, `take(key)`, `delete`):
  Cloudflare KV on Cloud, Redis or SQLite in the Gateway, in-memory in tests.
- **Encryption:** AES-256-GCM through WebCrypto, with the key in the host's secret store.
  Refresh tokens are stored encrypted, never logged, and never sent to the plugin.
- Lives in the repo as `tools/connect/` (next to `tools/jira-proxy`, sharing the root
  TypeScript, lint and test setup). Tests in `tests/connect/`. The relay will reuse
  `tools/jira-proxy/proxy.ts` (already pure and tested).

### 3.2 Endpoints

| Endpoint | Does | Notes |
|---|---|---|
| `POST /auth/{service}/keys` | New read/write key pair + confirm code | Keys: 16–128 chars `[A-Za-z0-9_-]`. Code: `XXX-XXX`, derived from the read key |
| `GET /auth/{service}/start?host&write` | Shows "Connect GitHub to Bluebird?" with the code, sets the browser cookie | Uses up the write key. `host` must be one with a registered app |
| `POST /auth/{service}/confirm` | Continue → redirects to the provider (303). Cancel → sign-in denied | Same browser only (cookie). `state` = signed nonce; PKCE verifier kept server-side |
| `GET /auth/{service}/callback` | Code → tokens, then encrypt and park under the read key (5 min TTL) | Shows a "You can go back to Figma" page |
| `GET /auth/poll?read` | `202` waiting, `200 {accessToken, account, expiresAt, refreshHandle}` once, `404/410` expired | Plugin already handles everything except `refreshHandle` |
| `POST /auth/refresh {refreshHandle}` | New access token | GitHub App: 8 h tokens. Atlassian: 1 h, rotating refresh tokens. Bitbucket: 2 h |
| `POST /auth/revoke {refreshHandle}` | Revokes at the provider, deletes our record | Disconnect in Settings |
| `ANY /relay/jira/*` | Jira Cloud pass-through (API-token mode) | Only `*.atlassian.net`, only `/rest/api/*` |
| `ANY /relay/bitbucket-dc/*`, `/relay/jira-dc/*` | Same for Data Center | **Gateway only**, host list from env |
| `GET /health` | Status + version | For monitoring and the IT install check |

`{service}` = `github` | `jira` | `bitbucket`. The plugin's `SignInService` type gains
`'bitbucket'` and `refreshHandle`.

### 3.3 Security rules (checked in review, Phase 7)

- Every read key works once. A poll that returns the token deletes the record.
- `state` is signed and tied to the write key, so a callback can't be replayed or swapped.
- PKCE on our side of every provider flow, even where a client secret is used.
- Relay: fixed host allow-list and path prefixes, no redirects followed, no private IPs on
  Cloud (SSRF), bodies and auth headers never logged.
- CORS on our own endpoints: plugin origin `null` only, plus `localhost` in development.
- Rate limits per IP and per key. A per-company kill switch (env or KV flag).
- Secrets only in the host's secret store (`wrangler secret put` or the Vercel dashboard).
  Never in the repo, never in chat.

**Security review 2026-11-27 (Phase 1 code).** Fixed straight away: the rate limiter could be
wiped by flooding it with random keys; the memory store grew without bound; `x-forwarded-for`
was trusted for rate limits; the fake provider was on by default; a late callback could
overwrite a finished sign-in; single-use records used read-then-delete instead of `take`;
sealed tokens weren't bound to their read key (now HKDF keys + AES-GCM AAD); provider errors
were logged verbatim; pages lacked `nosniff`, `frame-ancestors` and HSTS.

**Must land before the first real provider (Phase 2):**

1. ~~**Confirm code on the start page (HIGH).**~~ **Done 2026-11-27.** The start link used to
   work as a bearer link: an attacker could make keys, send a designer the start link, and
   receive that designer's token when they approved. Now:
   - `/keys` returns a code like `34M-7GU`, derived from the read key. The plugin shows it
     under "Finish signing in in your browser".
   - `/start` shows the same code with Continue / Cancel (a same-origin POST to `/confirm`)
     and redirects only after Continue. Cancel tells the plugin the sign-in was cancelled.
   - A browser cookie is set on that page (`__Host-bb_connect` on https, `bb_connect` on
     localhost; HttpOnly, SameSite=Lax). `/confirm` and the callback both require it, so a
     sign-in can't be confirmed by another site's form or finished in another browser. One
     id per browser, so two sign-ins at once still both finish.
   - The plugin refuses a broker that sends no code. The budget wasn't raised: the
     build stayed inside 1740 KB after shortening three of the sign-in messages.
2. **Exact host allow-list per provider.** **GitHub done 2026-11-27:** it accepts `github.com`
   and nothing else, and `exchange()` refuses before sending the secret anywhere else. Atlassian
   and Bitbucket need the same when they're built: `*.atlassian.net`, `bitbucket.org`, or hosts a
   company registered; https only, no private IPs.
3. ~~**Read key out of the URL.**~~ **Done 2026-11-27.** The plugin polls `GET /auth/poll` with the
   read key in an `x-connect-read` header. A `?read=` query is refused.
4. ~~**Only the plugin may call keys and poll.**~~ **Done 2026-11-27.** Both need the
   `x-connect-client: bluebird` header, which stops plain forms and image requests. They also
   need Figma's `null` origin (or no origin, from a non-browser client), which stops web pages.
   The local dev server also allows `http://localhost:*`, for the plugin dev harness.
5. ~~On KV, use a Durable Object or a conditional write for `s:` and `r:`.~~ **Done 2026-11-27:**
   Bluebird Cloud doesn't use KV. Every record is its own Durable Object (`tools/connect/durable.ts`),
   so `take()` reads and deletes in one step, and an alarm clears it at the TTL.
**Zero-trust review 2026-11-28** (independent read-only review, findings checked in the code):
- **Done:** the confirm code is typed, not compared: the plugin shows it, the person types it on the
  browser page, and three wrong tries cancel the sign-in. The page names the site and its CSP lets
  the form go only to that provider's origin. The fake provider needs `CONNECT_ENV=development|staging`
  (Workers set no `NODE_ENV`). The hosted Jira relay is off on staging (`JIRA_RELAY=off`). The relay
  allows only port 443 on Atlassian hosts, caps answers at 10 MB and always answers JSON with `nosniff`.
  Cloudflare's invocation logs are off (they record query strings). Login analytics accept only the
  brands in `plugin.config.json`. Atlassian no longer asks for `offline_access`.
- **The origin check is CSRF hygiene, not access control.** A web page can get a `null` origin from a
  sandboxed iframe. `keys` and `poll` are safe by key entropy; a Gateway needs a network rule or a
  company secret in front.
- **Open:** Cloudflare rate-limit rules keyed by IPv6 /64 (the in-memory limiter is per isolate, and a
  full table refuses everyone new); deploy from CI with a scoped token, separate staging and production
  accounts and provider apps; a separate `CONNECT_ANALYTICS_KEY` and a periodic salt for pseudonyms;
  PKCE for Atlassian and Bitbucket if they add it; warn before applying a gateway URL from a team-setup
  import.

6. Gateway: a configurable bind address, request timeouts, and a trusted-proxy setting for
   the client IP.

---

## 4. Roadmap

Sizes assume one developer working with Claude Code. Each phase ends with something you
can try in Figma.

### Phase 0: Spike (≈1 week)

Settle the unknowns before building on them. Add these to the "connection lab" in the
enterprise doc (§5 Phase 0):

| Test | Decides |
|---|---|
| Plugin (`null` origin) → `api.bitbucket.org` GET **and** POST with an API token | Whether Bitbucket Cloud goes direct (expected) or through the relay |
| Plugin → Bitbucket DC with an HTTP access token | Relay or direct for DC |
| Bitbucket DC: commit + PR with an HTTP access token | Whether tokens can do writes, or DC needs OAuth |
| Bitbucket DC multi-file commit options | One commit per file, or git in the Gateway |
| Jira Cloud 3LO token → `api.atlassian.com`, GET + POST | Whether Jira goes direct after sign-in |
| Hono app on Workers answering the plugin's `null` origin | Hosting works with Figma |

**Exit:** §2's table has no "verify" left.

### Phase 1: Server skeleton, deployed (≈1 week)

1. `services/connect/` with Hono, the storage interface, encryption, `/health`.
2. `/auth/{service}/keys` and `/auth/poll`, plus a **fake provider** for tests, so the whole
   flow runs end to end without any real app.
3. Unit tests for key handling, TTLs, one-time reads, signed state. Integration test of the
   full flow against the fake provider.
4. Deploy to staging (`connect-staging.<our-domain>`). Add the domain to `manifest.json`
   `allowedDomains`. Set `BLUEBIRD_CLOUD_URL` from build config instead of a constant.

**Exit:** "Sign in" in Settings goes through the fake provider and lands "Connected".

**Built 2026-11-27 (branch `feat/connect-server`), except the staging deploy:**

- `tools/connect/app.ts` (routes), `crypto.ts` (keys, AES-GCM, HMAC state, PKCE),
  `store.ts` (interface + memory store), `limits.ts`, `pages.ts`, `providers/fake.ts`,
  `server.ts` (Node entry). `npm run connect:dev` runs it on `localhost:8788` with the fake
  provider for github, jira and bitbucket. Throwaway secrets unless `CONNECT_ENCRYPTION_KEY`
  / `CONNECT_STATE_KEY` are set.
- Try it: run it, then Settings › GitHub › "Use a company gateway" → `http://localhost:8788`
  → Sign in → Approve. `localhost:8788` is in `devAllowedDomains`.
- Poll answers `403` when the person denies, and `502` when the provider swap fails. The
  plugin now says "Sign-in was cancelled in the browser" for 403.
- Not yet: `BLUEBIRD_CLOUD_URL` from build config (waits on D2 domain), refresh handles (Phase 5).

**D1 decided 2026-11-27: Cloudflare Workers.** Staging is live at
`https://bluebird-connect-staging.praveenmanchi.workers.dev` (fake provider) until D2 picks a domain.
It's in the manifest's `devAllowedDomains` only. Try it in a dev build: Settings › GitHub › "Use a
company gateway" → that address → Sign in.

- `tools/connect/worker.ts` (Worker entry + the `ConnectRecord` Durable Object), `durable.ts`
  (one object per record), `cloud.ts` (reads the Worker's settings; no throwaway keys, because
  each isolate would make its own), `wrangler.toml` (staging: fake provider on, `NODE_ENV` unset).
- `npm run connect:worker` runs it locally on `localhost:8789` (secrets in the git-ignored
  `tools/connect/.dev.vars`). `npm run connect:deploy` deploys it. Secrets only through
  `npx wrangler secret put <NAME> -c tools/connect/wrangler.toml`.
- wrangler is pinned to 4.86 because newer versions need Node 22 and the project runs on 20.
  That caps `compatibility_date` at 2026-05-03.
- Rate limits still count per isolate. Production adds Cloudflare rate-limit rules (Phase 7).
- **Login analytics (2026-11-28):** the plugin reports each access-code login to
  `POST /events/login` (`src/shared/analytics/login.ts`, only in builds with `VITE_LOGIN_ANALYTICS_URL`).
  The broker writes brand, version, country and a pseudonymous user id to the Analytics Engine
  dataset `bluebird_logins_staging` (`tools/connect/events.ts`). The sandbox hashes the Figma user id,
  and the broker HMACs that hash again with its state key. No codes, names, e-mails or IPs are stored.
  `npm run connect:logins` reads it (needs `CLOUDFLARE_ANALYTICS_TOKEN`, Account Analytics Read).
  Before production: mention it in the manifest's `networkAccess.reasoning` and in client privacy notes.
- `worker.ts` has its own `tools/connect/tsconfig.json` (Workers types), and `npm run typecheck`
  runs both.

### Phase 2: GitHub sign-in on github.com (≈1 week)

1. Our **GitHub App** (§5 has the exact settings), with user-token expiry turned on.
2. Provider module: authorize URL, code swap, `GET /user` for the account name.
3. Plugin: an "Install on your organisation" link for when the app isn't installed on the repo's org.

**Exit:** a github.com account connects in two clicks. Publish opens a PR with the sign-in token.

**Built 2026-11-27 (branch `feat/connect-server`), waiting on the GitHub App (§5 A2/A3):**

- `tools/connect/providers/github.ts`:
  - Authorize URL with S256 PKCE and `allow_signup=false`.
  - The code swap posts the secret and verifier to `github.com/login/oauth/access_token`.
    GitHub answers 200 with `{ error }` when it refuses, and that is handled.
  - `GET api.github.com/user` (with a User-Agent) for `@login`. `expiresAt` comes from
    `expires_in` (8 h with token expiry on).
  - It keeps the refresh token for Phase 5.
  - Failures become a `ProviderError`, whose code is safe to log (`bad_verification_code`,
    `user_401`, `network`…). GitHub's free-text error is never logged.
- `tools/connect/config.ts` picks the providers from the environment:
  - `GITHUB_APP_CLIENT_ID`, `GITHUB_APP_CLIENT_SECRET` and `GITHUB_APP_SLUG` turn real GitHub
    sign-in on. The other services stay fake when `CONNECT_FAKE_PROVIDER=1`.
  - `npm run connect:dev` reads `.env` (git-ignored).
  - For local runs, add `http://localhost:8788/auth/github/callback` to the app's callback URLs
    (a GitHub App takes up to 10).
- Security items 2–4 above are done.
- Size budget raised to 1745 KB, your call on 2026-11-27.
- **"Install Bluebird on your organisation"** (built the same day): after a GitHub sign-in, the
  connected row in Settings has this link. It opens `{broker}/auth/github/install`, which redirects
  to `github.com/apps/<slug>/installations/new`. So the install page is set in one place, the
  broker's `GITHUB_APP_SLUG`, and the plugin stores nothing new. A broker without an install
  step says "There's nothing to install". Jira doesn't show the link.
- **Not done yet:**
  - Trying it against the real app.
  - Drawing the install link in Figma (the Settings "Sign-in or token" section).

### Phase 3: Jira Cloud: relay + Atlassian sign-in (≈1.5 weeks)

1. Hosted `/relay/jira/*`. Jira Cloud with an API token now works in a published build, not
   only in development with `npm run jira:proxy`.
2. Our **Atlassian OAuth 2.0 (3LO) app**, `offline_access` for refresh, and
   `accessible-resources` to find the site's `cloudId`.
3. Plugin: after sign-in, call `api.atlassian.com/ex/jira/{cloudId}` directly, or through
   the relay (Phase 0 decides which).

**Exit:** a Jira Cloud site connects with either a token or sign-in. The Jira tab and
Changelog's Jira comment work.

**Server side built 2026-11-27 (branch `feat/connect-server`):**

- **Relay:** Connect answers `/rest/…` with the same contract as the local Jira proxy (the
  `x-jira-target` header). So the plugin's Jira gateway field can point at Connect with no plugin
  change. The forwarding code is shared with `tools/jira-proxy` (`forwardToJira`, now
  Workers-safe: no `Buffer`).
  - It reaches only `*.atlassian.net`, plus `JIRA_RELAY_HOSTS` on a gateway.
  - It accepts Figma's origin only, is limited to 600 requests a minute per IP, and logs paths
    only.
  - It's on by default; `JIRA_RELAY=off` turns it off. Tried against a real Atlassian site:
    `serverInfo` 200 through the relay, a non-Atlassian host 400, a web page 403.
- **Sign in with Atlassian** (`providers/atlassian.ts`):
  - The authorize URL uses audience `api.atlassian.com`, scopes `read:jira-work write:jira-work
    read:jira-user read:me offline_access`, and `prompt=consent`.
  - The code swap posts JSON to `auth.atlassian.com/oauth/token`.
  - `accessible-resources` must include the site the person pasted (else `site_not_granted`).
    The result carries `site: { cloudId, url }` to the plugin.
  - The name comes from `/me`.
  - PKCE isn't documented for 3LO, so none is sent. The confirm code, browser cookie and
    signed state still guard the flow.
- `ATLASSIAN_CLIENT_ID` / `ATLASSIAN_CLIENT_SECRET` in `.env` turn it on.
- **Step 3, plugin side (built 2026-11-28).**
  - After "Sign in with Atlassian", Settings keeps the site's `cloudId` (a personal field, like
    the account name). Disconnect clears it.
  - `JiraConfig.target` is what's called: `https://api.atlassian.com/ex/jira/<cloudId>` for a
    signed-in Jira Cloud connection, otherwise the site. `site` stays the real site, so issue
    links still open on it.
  - Requests go through the gateway relay with that target. The relay (and the local
    `jira:proxy`) accept `api.atlassian.com` only at exactly `/ex/jira/<uuid>`.
    `api.atlassian.com` gave a plugin-style request no CORS headers, so it isn't called
    directly.
  - A sign-in from before the cloudId was kept reads as "Jira sign-in" missing, so it is done
    again.
  - Checked live against the local server: a fake Jira sign-in returns the site, and a
    signed-in call through the relay reaches `api.atlassian.com` (its own 404 for the fake
    site id).
- **Bitbucket sign-in in the plugin (built 2026-11-28):** "Sign in with Bitbucket" in Code
  repository goes through the broker. The token is used as Bearer: a leftover Atlassian email is
  cleared on sign-in and ignored by `codeHostConfig` when the method is sign-in. There's no
  install link, which is a GitHub-only step.
- **Not done:** trying both with real apps (Atlassian A4, Bitbucket A7), and refresh
  (Phase 5). Atlassian tokens last about an hour and Bitbucket's 2 hours.

### Phase 4: Bitbucket (≈3 weeks; the plugin work is most of it)

1. Plugin: `CodeHost` interface, with the GitHub client moved behind it unchanged. Tests
   must stay green before Bitbucket is added.
2. Bitbucket Cloud adapter (§2 table), token mode first: Atlassian email + API token.
3. Settings: GitHub section → **Code** with a GitHub / Bitbucket choice. Bitbucket states in
   the Connection card (Figma first, then code). Bitbucket logo through `BrandLogo`.
4. Server: **Bitbucket OAuth consumer**, provider module, and refresh (needed right away
   because tokens last 2 h).
5. Features: Publish, Extraction, History and MCP run on the interface. Copy says "pull
   request" on both. MCP's "Actions run" becomes "Checks".

**Exit:** a Bitbucket Cloud workspace connects with a token or sign-in, and Publish opens a PR there.

**Server side built 2026-11-27 (step 4 without refresh):** `providers/bitbucket.ts`.

- It accepts `bitbucket.org` only.
- The authorize URL carries `client_id`, `response_type=code` and `state`. Scopes and the
  callback live on the consumer, so neither is sent.
- The code swap sends Basic `key:secret` and a form body to
  `bitbucket.org/site/oauth2/access_token`.
- The name comes from `api.bitbucket.org/2.0/user` (`display_name`, then `nickname`).
- `BITBUCKET_CLIENT_ID` / `BITBUCKET_CLIENT_SECRET` in `.env` turn it on.

**Plugin side built 2026-11-27 (steps 1–3 and 5).** Designed first in Figma: section "Settings ·
600 · Code: GitHub or Bitbucket" (40003067:23087) in the backup file.

- **`@shared/codehost`:** one `CodeHost` interface used by Publish, Extraction, History,
  Changelog and MCP.
  - `githubCodeHost` wraps the existing client and makes the same requests in the same order;
    the existing GitHub tests pass unchanged.
  - `bitbucketCodeHost` talks to Bitbucket Cloud's 2.0 API:
    - A commit goes straight onto a branch: `POST /src` as a form with one field per file, then
      the hash is read back from the branch.
    - Optimistic writes send the branch head as `parents`; a branch that moved on (409) is a
      refusal.
    - Pull requests and commit statuses (shown as "Bitbucket Pipelines") are covered.
    - Errors come back as readable messages, and 5xx answers are retried.
  - Bitbucket Cloud answers plugin requests directly (`Access-Control-Allow-Origin: *`, checked
    2026-11-27), so no relay is needed. `api.bitbucket.org` is in the manifest.
- **Settings:**
  - The GitHub section is now **Code repository**. It has a "Where's your code?" GitHub /
    Bitbucket switch, and the Bitbucket logo shows in the header when Bitbucket is picked.
  - Bitbucket shows: "Where's your Bitbucket?", a "Bitbucket Cloud" badge, an **Atlassian email**
    and an API token (Basic auth), or sign-in through the broker (Bearer).
  - Switching hosts clears the token and sign-in, so a GitHub token is never sent to Bitbucket.
  - Storage and each MCP scenario have their own switch and email field.
  - "Settings › GitHub" is now "Settings › Code repository" in every message.
- **Settings data:** `host` + `email` on `github` and `storage`, and `<scenario>Host` /
  `<scenario>Email` on `mcp`. Older stored settings read as GitHub. The email is personal: it is
  never written to a team setup file.
- **Links:** History, Extraction and Publish now open `bitbucket.org` links (commit and PR pages).
- **Not done yet:**
  - Bitbucket Data Center: Settings shows "coming", and the adapter refuses with a clear message.
    It needs its own adapter (REST 1.0, one file per commit) and a gateway relay.
  - Trying it against a real Bitbucket workspace. In particular, whether `POST /src` refuses a
    stale `parents`, and whether it accepts file field names without a leading slash.
  - Refresh (Phase 5): Bitbucket sign-in tokens last 2 hours.

### Phase 5: Refresh + Disconnect for all three (≈1 week)

1. `/auth/refresh` and `/auth/revoke` for GitHub and Atlassian. Bitbucket already has them
   from Phase 4.
2. Plugin: refresh quietly before expiry. Disconnect revokes. "Sign-in expired" only shows
   when a refresh fails.

### Phase 6: Bluebird Gateway (≈3 weeks)

1. Same service with a Node entry point, Docker image, `docker compose` example, Helm chart.
2. Providers for **GHES** (GitHub App on their server), **Jira DC** and **Bitbucket DC**
   (incoming application links with OAuth 2.0 and PKCE). The host list comes from env.
3. `/relay/jira-dc/*` and `/relay/bitbucket-dc/*` for token mode.
4. Bitbucket DC adapter in the plugin (§2 table), including the multi-file commit choice.
5. One-page **IT install guide** + an optional audit log.

**Exit:** a VPN-only test network with Jira DC and Bitbucket DC works end to end through the Gateway.

### Phase 7: Hardening + go live (≈1.5 weeks)

- Security review (the `security-reviewer` agent, then an outside check): replayed state,
  open redirects, SSRF in the relay, token logging, key reuse.
- Production deploy, monitoring and alerts, status page, secret rotation runbook.
- Privacy policy and security page live (Atlassian app distribution and Figma Community
  both ask for them).
- Atlassian app distribution switched to "Sharing". GitHub App made public. Bitbucket
  consumer callback moved to the production domain.

**Total:** about 12–13 weeks for everything. **github.com + Jira Cloud + Bitbucket Cloud
sign-in, the part most of the 40 companies need, is Phases 0–5: about 8–9 weeks.**

---

## 5. What I need from you

Put secrets straight into the hosting dashboard or CLI, never in chat or the repo. I only
need the non-secret IDs.

### Decisions (needed before Phase 1)

| # | Decision | My recommendation |
|---|---|---|
| D1 | Hosting for Bluebird Cloud | **Cloudflare Workers + KV.** KV has TTLs built in, it's cheap, and secrets are built in. Vercel also works, and is already connected here. |
| D2 | Domain for the server | A subdomain of a domain you own, e.g. `connect.<your-domain>`. Staging + production. |
| D3 | Bitbucket in Settings | A GitHub / Bitbucket choice inside one **Code** section (not a third section) |
| D4 | Who owns the apps | A Bluebird organisation/workspace, **not** your personal account, so the apps outlive any one person |

### Accounts and registrations

| # | What | Where | Blocks | What you send me |
|---|---|---|---|---|
| A1 | Hosting account (from D1) + DNS access for D2 | Cloudflare or Vercel | Phase 1 | Account/team name; you add me as a member or run the deploy command I give you |
| A2 | **GitHub org** for Bluebird + a test repo | github.com | Phase 2 | Org name |
| A3 | **GitHub App** in that org. Callback `https://connect…/auth/github/callback`; "Expire user authorization tokens" on; permissions: Contents R/W, Pull requests R/W, Actions R, Metadata R; "Any account" can install | GitHub › Org settings › Developer settings › GitHub Apps | Phase 2 | App ID, client ID, app slug. **Client secret + private key → hosting secrets** |
| A4 | **Atlassian developer app**, OAuth 2.0 (3LO). Callback `…/auth/jira/callback` (and `http://localhost:8788/auth/jira/callback` for local runs). APIs: **Jira API** with `read:jira-work`, `write:jira-work`, `read:jira-user`, and **User Identity API** with `read:me`. `offline_access` is asked for in the URL | developer.atlassian.com › Developer console | Phase 3 | Client ID. **Secret → hosting secrets** |
| A5 | Free **Jira Cloud** test site | atlassian.com (free plan) | Phase 0 | Site URL + a test project key |
| A6 | **Bitbucket workspace** for Bluebird + a test repo | bitbucket.org (free) | Phase 0 / 4 | Workspace + repo slug |
| A7 | **Bitbucket OAuth consumer** in that workspace. Callback `…/auth/bitbucket/callback` (Bitbucket allows one: `http://localhost:8788/auth/bitbucket/callback` while testing locally). Permissions Account Read, Repositories Write, Pull requests Write, Pipelines Read; "This is a private consumer" off | Bitbucket › Workspace settings › OAuth consumers | Phase 4 | Key. **Secret → hosting secrets** |
| A8 | **Privacy policy + terms** URL | Your site | Phase 3 (Atlassian Sharing) + Phase 7 | URLs. I can draft the text |

### For the Gateway (Phase 6 only; skip until a company needs it)

| # | What | Notes |
|---|---|---|
| G1 | A machine with Docker and ~16 GB RAM | Runs Jira DC and Bitbucket DC test servers |
| G2 | Free 30-day **Jira DC** and **Bitbucket DC** trial licences | my.atlassian.com |
| G3 | A **GitHub Enterprise Server** trial | Only if one of the 40 companies runs GHES behind a VPN. It's a large VM, and GitHub sales issues the trial |

### From the companies (add to the follow-up email in the enterprise doc §7)

- "Is your code on **GitHub or Bitbucket**? If Bitbucket: bitbucket.org, or your own
  Bitbucket Data Center?"
- Their answers decide whether Phase 6 is needed at all, and which Data Center product comes first.

### What I can do without waiting on you

- Phase 0 spike scaffolding, the Phase 1 server with the fake provider, and the Phase 4
  `CodeHost` refactor. None of these need an account.
- The Figma Bitbucket states for the Connection card on the backup file.

---

## Sources

- Bitbucket: [API tokens replace app passwords](https://www.atlassian.com/blog/bitbucket/bitbucket-cloud-transitions-to-api-tokens-enhancing-security-with-app-password-deprecation), [Phase 2 of app password deprecation](https://www.atlassian.com/blog/bitbucket/bitbucket-cloud-enters-phase-2-of-app-password-deprecation), [Use OAuth on Bitbucket Cloud](https://support.atlassian.com/bitbucket-cloud/docs/use-oauth-on-bitbucket-cloud/), [CORS on the Bitbucket REST API (community, Atlassian staff)](https://community.atlassian.com/forums/Bitbucket-questions/Access-Bitbucket-API-from-Client-Browser-CORS-access-support/qaq-p/1039301), [Bitbucket DC OAuth 2.0 provider API](https://confluence.atlassian.com/bitbucketserver/bitbucket-oauth-2-0-provider-api-1108483661.html), [HTTP tokens and admin endpoints (KB)](https://support.atlassian.com/bitbucket-data-center/kb/how-to-use-oauth2-tokens-for-administrative-endpoints-of-bitbucket-data-center/)
- GitHub, Atlassian and Figma sources: see [enterprise-integrations-roadmap.md](enterprise-integrations-roadmap.md#sources).
