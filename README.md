# Bluebird

Persona-based, multi-tab, multi-brand Figma plugin. Speed and accuracy first.

- **One JSON switchboard.** `plugin.config.json` decides the active brand, personas, and which tabs are on. Disabled tabs are excluded from the bundle, not just hidden.
- **Each tab is its own codebase.** `src/features/<tab>/` owns its UI, sandbox logic, state, messages, mocks, and tests. Cross-tab imports are a lint error.
- **One plugin, many clients: access codes.** The plugin opens on a login screen; each brand in `plugin.config.json` carries the SHA-256 of its access code (`npm run access-code -- <code>` prints the hash). A valid code unlocks that brand for the Figma user (stored in `figma.clientStorage`); the settings gear offers *Logoff session* and *Reset all Settings*. The code is a theme selector, not access control: every brand's tokens and logos ship in the bundle.
- **Brand from Figma variables.** `figma/tokens.json` is a snapshot of the file's three collections (Primitives → Semantics → Brand with five modes). `npm run gen:tokens` turns it into `--bb-*` custom properties; components read only those. Storybook shows every brand; the plugin ships the one in `brand.active`. See [docs/design-system-pipeline.md](docs/design-system-pipeline.md).
- **Three dev modes** that share one code path: browser with fixtures, browser connected to real Figma, and the real plugin panel.

## Commands

```bash
npm install
npm run dev            # browser preview with fixtures  → http://localhost:5173/?mode=mock
npm run dev:sandbox    # rebuild dist/code.js on change (Figma side)
npm run dev:live       # same, but running the plugin opens the live-mode bridge panel
npm run dev:relay      # WebSocket relay for live mode (port 4001)
npm run jira:proxy     # local CORS proxy the Jira tab calls Jira through (port 8787)
npm run build          # dist/index.html + dist/bridge.html + dist/code.js, enforces size budget
npm run test           # vitest
npm run storybook      # component workshop with a Brand switcher → http://localhost:6006
npm run figma:diff     # what changed in Figma since the last pull (writes nothing but figma/drift.json)
npm run figma:pull     # refresh figma/*.json from the Figma file (relay, or --rest)
npm run figma:visual   # Figma renders vs Storybook renders per brand (needs FIGMA_TOKEN)
npm run figma:parity   # do the relay and REST extractors agree? (needs both)
npm run gen:tokens     # figma/*.json → generated CSS/TS
npm run tokens:check   # Figma ↔ code drift gate
npm run verify         # typecheck + lint + tokens:check + test + build
```

## Loading the plugin in Figma (desktop app)

1. `npm run build`
2. Figma → Plugins → Development → Import plugin from manifest… → pick `manifest.json`
3. Run **Plugins → Development → Design Studio (Beta 2.0)**; it opens Bluebird directly (the manifest has no menu, so published users never see dev commands). Re-run with `Cmd+Opt+P` after each sandbox change.

## Live mode (UI in your browser, real Figma document)

```
browser  ─►  ws://127.0.0.1:4001 relay  ─►  bridge page inside Figma  ─►  sandbox  ─►  document
```

1. `npm run dev:relay` (add `-- --token abc` for a shared secret)
2. `npm run dev:live` and `npm run dev` in two more terminals. `dev:live` builds a dev-only `dist/code.js`
   that opens the bridge panel instead of the plugin UI.
3. In Figma: run the plugin. The small "Bluebird · live bridge (dev build)" panel opens; leave it open.
4. Open `http://localhost:5173/?mode=live` (append `&token=abc` if you set one)

Sandbox changes still need a plugin re-run in Figma (`Cmd+Opt+P`). UI changes hot-reload in the browser.
Run `npm run build` (or `npm run dev:sandbox`) before using or publishing the plugin normally again: the
live build is never what you publish.

## Syncing from Figma

The source is **Project Bluebird UI** (`fileKey` and `fileName` in `figma/manifest.json`). It sits on a Pro team, so REST
cannot read its variables: pull through the relay, which works on every plan.

1. `npm run dev:relay`, then `BB_LIVE=1 npx tsx scripts/build-sandbox.ts` (a one-off live build).
2. In Figma desktop, with that file open: **Plugins → Development → Design Studio (Beta 2.0)**. Wait for a green **connected**.
3. `npm run figma:diff` to see what changed, then `npm run figma:pull`. The pull accepts the changes as the new baseline.
4. `npm run gen:tokens && npm run tokens:check`, then `npm run verify`, which also restores the normal `dist/code.js`.

A pull from any other open file is refused. `figma:visual` and `--rest` need a `FIGMA_TOKEN` from an account that can open the file.

## AI providers (Settings › AI Agent Assistance)

UX AI and the UX AI agents call the model the user picks under **Answer with**: Claude
(`api.anthropic.com`), OpenAI (`api.openai.com`) or Gemini
(`generativelanguage.googleapis.com`), each with its own Default Model and API key. The key
is read in the Figma sandbox and sent to that provider's host only; when the picked
provider has no key the first provider that does answers, and the footer pill says so.
`src/shared/ai` holds the three request shapes, the error mapping and the lenient JSON
reader the agents use. Model ids come from the providers' docs as of 2026-10-13
(`docs/research/ux-ai-agents-research.md`); **Test Connection** sends one tiny request.

## UX AI agents (live)

Six agents review the selection, the current frame, its section or the whole page inside
Figma, stream findings while they work and write results back:

| Agent | Reads | Needs a model | Writes back |
|---|---|---|---|
| Accessibility | text runs, strokes, interactive layers, images; Brand UI tokens in every ticked brand mode | no | rebind fills/strokes to the nearest passing token, Dev Mode annotations, report frame |
| Design system | fills, strokes, auto-layout spacing, radii, `detachedInfo`, text styles | no | rebind raw values that equal a token, bind spacing/radius variables |
| Content | placeholder copy, fake people, placeholder data and grey image boxes | for realistic replacements | replace text |
| Spelling & grammar | every text layer, de-duplicated and batched | yes | replace text |
| UX writing | every text layer with its role (button, error, heading…) | yes | replace text |
| Localization | text boxes vs. German/French/Arabic expansion, directional icons, US formats | no | advice only |

Setup picks the rule pack, brand modes, **Review / Suggest / Auto-fix** and the outputs
(Dev Mode annotations, a report frame on the canvas, a Jira-ready list, a Markdown + JSON
download). Results can be applied one by one or all safe ones at once; **Run all** runs the
agents in sequence so fixes don't collide. The Voice view talks to the agent about its run
through the configured model (speech recognition where the host offers it, typing
otherwise) and acts on replies that end with `[apply-safe]`, `[annotate]`, `[report]` or
`[show-findings]`. The rule packs are pure (`src/features/agents/rules`), the Figma reads
and writes live in `src/features/agents/sandbox`.

## Library files (Dual File Mode)

Settings › Dual File Mode takes the two designed slots plus **Add another library file**
for as many library files as the system spans (icons, typography, a second components
library). Every file is read over the Figma REST API with its own key or File 1's; besides
variables and components the loader now reads each file's published text and colour styles
(`/styles` + `/nodes`), which UX AI uses for typography questions and for colours in files
without variables.

## Jira tab (live Jira)

Figma plugins call the web from a `null` origin, and Jira Cloud sends no CORS headers for
API-token calls, so the Jira tab reaches Jira through a small proxy
(`tools/jira-proxy`). It forwards only to `https://*.atlassian.net` (plus hosts in
`JIRA_PROXY_HOSTS` for Server / Data Center), listens on loopback only and stores nothing.

1. `npm run jira:proxy`
2. Create an API token at https://id.atlassian.com/manage-profile/security/api-tokens
3. Settings › **Jira Integration**: switch it on; fill Email ID, Jira API Key, Site URL
   (`https://yourteam.atlassian.net`), Proxy URL `http://localhost:8787`, optionally
   Project Key; Save. For Jira Server / Data Center use Base URL and a personal access
   token, leave Email empty.
4. Open the Jira board tab: it loads your assigned / reported / watched issues (open,
   plus done in the last two weeks). Status, story points, comments, Log work (1h),
   subtasks and "Attach Figma link" write to Jira.

Works in Figma (`npm run build`, then run the plugin; `manifest.json` allows
`localhost:8787` in development) and in the browser preview (`npm run dev`): once the
mock Settings hold a complete Jira connection, the dev harness calls real Jira too.
Attaching a Figma link needs the file's link, which Figma only gives private /
organisation plugins (`figma.fileKey`). Shipping to a team needs a hosted proxy (and its
domain in `manifest.json` → `allowedDomains`) or an Atlassian OAuth 2.0 (3LO) app.

## Publish tab (GitHub releases)

Review changes → Release notes → Final review → Publish. An extract reads the file's local
variables and components, diffs them against the last release and publishes one commit
(the token JSON, `releases/<version>.json`, `.bluebird/releases.json` and `CHANGELOG.md`) to
the repository in Settings › **GitHub**: a pull request, or a fast-forward of the branch
with an optional tag and a short watch of the GitHub Actions run.

- **Source of truth.** The last release is stored with the Figma file *and* committed as
  `.bluebird/releases.json`. With Settings › GitHub › **Enable diff comparison** on, an
  extract reads the repository's copy and compares against whichever is newer, so a
  duplicated file or lost plugin data recovers its baseline from GitHub. The Review step
  says which copy it used and why.
- **Commit contents.** Final review shows the four files with their sizes, each openable,
  built by the same code the publish uses.
- **Teams.** "Post the changelog to Teams" posts a MessageCard to the Power Automate /
  Teams Incoming Webhook URLs in Settings › **Notifications** once the release lands; it
  is disabled, with the reason, while none is set.
- **Retries.** Dropped connections, 5xx and 429 answers are retried three times with
  backoff before they reach the designer; a bad token or a protected branch fails at once.

Settings › GitHub › **Test Connection** names the account, whether it can push, and which
release the branch holds. The audit that shaped this is in
[docs/research/tokens-studio-audit.md](docs/research/tokens-studio-audit.md).

## Extraction tab (variables → GitHub)

Branch → Extract → Review → Push. The tab reads the file's local variables and components,
compares them with the latest extraction on the branch you pick in the repository from
Settings › **GitHub**, and shows the variable changes and the components they touch before
anything is committed.

- **Files.** Every branch carries its own extractions in one folder, written in one commit:
  `extractions/<UTC stamp>.json` (the extraction itself, kept — e.g.
  `extractions/2026-11-12-0932.json`), `extractions/latest.json` (a copy of the newest one,
  which is what a compare reads) and `extractions/index.json` (who and when for the newest
  and up to 50 before it).
- **Push targets.** Push to an existing branch, or create a new one from a base branch (the
  default branch when none is picked). An empty repository needs a new branch for its first
  push. If GitHub refuses the update (a protected branch), nothing is pushed and nobody is
  notified; push to a new branch instead.
- **Pull request.** "Create pull request" also opens one from the pushed branch into the
  default branch, so it needs a different branch to come from. The commit message is the
  title; the body is the change summary, the file and who extracted it, and the Jira key
  when one is given. If a pull request for the branch is already open, the push simply
  joins it.
- **Jira and Teams.** An optional Jira key (`BB-342`) is added to the commit message and
  the pull request. Ticking Design system or Dev team posts the summary, with a link to
  the commit or pull request, to the Teams / Power Automate webhooks in Settings ›
  **Notifications**; a channel that can't be reached is reported without failing the push.
- **One extraction per push.** A push uses up the extraction it reviewed: extract again
  before pushing a second time. Each push is also added to the team History.

## MCP handoff tab

Select → Check → Generate → Ship. The tab reads the **real selection** (name, path,
variants, layer count, description) and follows it as you click around the canvas; a
selection change mid-flow returns to Select and says so. **Check** walks the selected node
once and scores it: detached instances and mostly-raw values fail (Generate stays locked),
local components, absolute positioning, unstyled text, default layer names and a missing
component description warn. **Copy prompt for Claude Code** carries the node (a Figma link
when the plugin has `figma.fileKey`, private plugins only), the `get_design_context` call,
your framework / styling / path options and the gaps the checks found as TODOs; **Copy MCP
setup** gives the `claude mcp add` line for the remote (`mcp.figma.com/mcp`) or desktop
(`127.0.0.1:3845/mcp`) Figma MCP server and the matching `mcp.json` block. The GitHub
connection comes from Settings › **MCP + Code Sync**. Code generation and the Git push are
still previews on sample data: the prompt is what hands the real work to the developer's
agent.

## Layout

```
plugin.config.json         the switchboard (validated by src/shared/config/schema.ts)
manifest.json              Figma manifest: no menu (opens Bluebird), two UIs (main, bridge — dev:live only), dev-only localhost access
src/
  shared/                  read-only for tabs
    config/                schema + loader
    bridge/                typed rpc, router, transports (postMessage, websocket, mock)
    brand/                 snapshot types, extractor (runs in Figma), generated/ CSS+TS, theme.css
    figma/                 color math, chunked traversal, paint helpers
    ui/<Component>/        one folder per Figma component set: .tsx .css figma.ts .stories.tsx .test.tsx
  features/<tab>/          one folder per tab — see docs/adding-a-tab.md
  shell/                   App, Banner, TabBar, persona/tab state, generated registry
  sandbox/main.ts          Figma-side entry
  ui/main.tsx              browser-side entry (mode detection)
dev.html + src/dev/       browser dev harness. Dev mode frames the plugin at its real window size with brand / size / fixture / persona knobs;
                          Plugin configuration sets each brand's tabs (on/off, order) and which Settings sections it manages, saved to plugin.config.json
figma/                     manifest (node ids) + snapshot: tokens.json, components.json, icons.json, logos/*.svg
scripts/figma-pull.ts      snapshot ← Figma (relay or REST)
scripts/gen-tokens.ts      snapshot → generated CSS/TS
scripts/check-tokens.ts    drift gate
.storybook/                Storybook 10 (Preact + Vite), Brand toolbar
tools/relay/server.ts      live-mode relay
tools/eslint-boundaries.js the isolation rule
tests/mocks/               figma global mock + aggregated fixture handlers
```

See [docs/adding-a-tab.md](docs/adding-a-tab.md), [docs/design-system-pipeline.md](docs/design-system-pipeline.md) and [docs/brand-variables.md](docs/brand-variables.md).
