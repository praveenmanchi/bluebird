# Tokens Studio for Figma — audit with REA, and what Bluebird took from it

**Date:** 2026-10-14 · **Subject:** [tokens-studio/figma-plugin](https://github.com/tokens-studio/figma-plugin), `packages/tokens-studio-for-figma` at `main` (plugin version 2.13.0) · **Tool:** [REA — Reverse Engineer Anything](https://github.com/morluto/rea) 6.5.0, `analyze-javascript-application`.

Tokens Studio is the most-used token plugin for Figma: it has eight years of push / pull / sync
behaviour against GitHub, GitLab, Bitbucket, Azure DevOps and its own platform. Bluebird's
**Publish** tab does a narrower job (release a design-system snapshot to one GitHub repository)
and its **MCP handoff** tab a different one (hand a selection to Claude Code / Cursor through the
Figma MCP server), but both share the problems Tokens Studio has already solved: what is the
source of truth, what does a push carry, what happens when GitHub is flaky, and what does the
designer see before anything leaves the file. This note records how the audit was run, what it
found, and which findings landed in Bluebird.

## 1. Setup

REA is installed outside the repository (it is a tool, not a dependency):

```bash
# REA, built from source (needs Node ^22.19 || ^24.11; `ps` from procps on Linux)
git clone --depth 1 https://github.com/morluto/rea ~/rea-src
cd ~/rea-src && npm ci --ignore-scripts && npm run build:cached
node scripts/rea.mjs --help          # or: npx rea-agents@latest --help

# The subject, in its own folder
git clone --depth 1 https://github.com/tokens-studio/figma-plugin ~/tokens-studio-figma-plugin

# Static reconstruction of the plugin's source tree (≈2 min, 264 MB of Evidence JSON)
node ~/rea-src/scripts/rea.mjs analyze-javascript-application \
  ~/tokens-studio-figma-plugin/packages/tokens-studio-for-figma/src --json > ts-src.json
```

`npx rea-agents setup --client claude_code` registers the same tools as an MCP server for Claude
Code (`rea setup --dry-run` previews the change); the CLI route above is what this audit used.

## 2. What REA reconstructed

REA's `JavaScriptApplicationGraph` for the `src` directory (evidence
`ev_6452a27a92c36b0788f088f846793b5ab8cf99bc01454d6e0a90bb54c212867d`):

| Measure | Value |
|---|---|
| Source files parsed | 1,593 |
| Graph nodes / edges | 17,299 / 19,875 |
| `javascript-module` nodes (source modules + exports + unresolved references) | 15,579 |
| `javascript-asset` nodes (SVG, JSON, CSS) | 1,485 |
| `endpoint` nodes (network strings) / `route` identities | 130 / 115 |
| Unresolved import references | 6,366 — 2,658 through the `@/` tsconfig alias, 2,573 relative, the rest bare packages |

Most-imported internal modules, in order: `@/constants/TokenTypes` (186), `@/types/tokens` (176),
`@/types/AsyncMessages` (150), `@/AsyncMessageChannel` (137), `@/constants/StorageProviderType`
(115), `@/selectors` (110). Reading: the plugin is organised around its **UI ↔ plugin-thread
message channel** and its **storage-provider abstraction**, which is exactly the surface Bluebird's
Publish tab maps onto (`@shared/bridge` and `src/features/publish/github`).

Bare-package hot spots: `react` (303), `react-redux` (167), `@tokens-studio/ui` (136),
`react-i18next` (101), `reselect` (99). REA's "unresolved" status for `@/…` is expected: the
path alias lives in tsconfig, which the static analyzer does not read; the relationships are
still recorded with low confidence and a stated limitation, which is what makes the graph
auditable rather than a guess.

Things REA cannot see and the source reading supplied: the two-thread split
(`src/plugin/controller.ts` registers 51 `AsyncMessageTypes` handlers; `src/types/AsyncMessages.ts`
declares 55), and runtime behaviour such as retry timing.

## 3. Findings — sync and publish

| # | Tokens Studio behaviour (file) | Bluebird before | Bluebird after |
|---|---|---|---|
| S1 | **The repository is the source of truth.** `useChangedState` diffs local tokens against `remoteData` pulled from the provider; `checkRemoteChangeForGitHub` compares the stored `commitSha` with the branch head (`app/store/providers/github/github.tsx`). | The baseline lived only in the Figma file's plugin data. Settings › GitHub had an "Enable diff comparison" switch promising a compare "against the last pushed version on GitHub" that no code read. | Every release commits `.bluebird/releases.json` (history + baseline snapshot). With diff comparison on, an extract reads it and uses whichever copy is newer; the Review step says "compared with v3.0.0 from ds-site on GitHub" and explains when the repository is behind, missing the file or unreadable. Test Connection reports what the branch holds. |
| S2 | **Retry with backoff** around every Octokit call: 3 attempts, 100 ms doubling, on 5xx / 429 / 408 / network (`utils/retryWithBackoff.ts`, used in `GithubTokenStorage`). | One attempt; a transient 502 surfaced as "GitHub answered with an error". | `createGithubClient` retries 3 times (400 ms doubling) on network failures, 5xx and 429 only; 4xx fail at once. The final message names the status and the attempt count. |
| S3 | **Show what the push carries before pushing.** `PushDialog` has Commit / Diff / JSON tabs; `ChangedStateList` groups changes per token set with old → new values. | Final review listed the changes but not the files; the commit was invisible until it landed. | Final review gains **Commit contents**: the four files (tokens, release record, release store, changelog) with sizes, each openable in a Code Snippet, built by the same pure `commitFiles()` the publish uses, and an honest "added above the existing entries" note for the changelog. |
| S4 | **Only what changed is written** (`GitSyncOptimizer` filters files by `changedState`; deleted sets are deleted). | Bluebird writes four small files per release, so this does not apply; noted for when the token file is split per collection. | — |
| S5 | **Provider-aware error messages** (`categorizeError`: credential / connectivity / parsing per provider). | Already had `GithubError` kinds with one sentence each. | Kept; transient errors now say how many times GitHub was asked. |
| S6 | **Branch selection per push** (`BranchSelector`, `PushDialog`'s branch field, create-branch-from-changes). | Branch fixed in Settings; the pull-request path makes its own `release/<version>` branch. | Unchanged — the release branch convention is deliberate. Candidate follow-up: let Final review override the base branch. |
| S7 | **Credentials in `clientStorage`, provider choice in shared plugin data** so teammates are prompted to the same provider (`developer-knowledgebase/storage-providers-and-credentials.md`). | Same split: token in `figma.clientStorage`, release store in document plugin data. | Same, plus the repository copy (S1). |
| S8 | **Notify after a push**: the success dialog deep-links to "Create pull request" on the provider. | A "Post the changelog to Teams" checkbox that nothing read, while Settings › Notifications already stored Power Automate / Teams webhooks. | A **Notify Teams** pipeline step posts a MessageCard (title, changelog, link) to every configured webhook after the release lands; the checkbox is disabled, with a reason, when no webhook is set. The manifest allows `*.webhook.office.com` and `*.logic.azure.com`. |

### Format note

Tokens Studio writes DTCG (`$value` / `$type`) token sets plus `$themes.json` and
`$metadata.json` (`SystemFilenames`, `TokenFormatStoreClass`). Bluebird's `tokens.json` is its own
shape (collection → variable → value per brand mode) and is consumed by the docs-site CI, so it
was left alone. Emitting a Tokens Studio / DTCG multi-file set next to it is the obvious next
step for interoperability with Style Dictionary and Tokens Studio itself.

## 4. Findings — MCP

Tokens Studio ships no MCP server or client (`grep -ri mcp` finds only an agent-planning note),
so this part of the audit used the plugin's **inspection** code as the reference instead:
`Inspector`, `InspectorDebugView` and the `tokens` selectors read real node data (`boundVariables`,
styles, `detachedInfo`) and show it per selection. Bluebird's MCP tab, by contrast, rendered a
fixture selection and fixture checks whatever was on the canvas.

| # | Finding | Bluebird after |
|---|---|---|
| M1 | The handoff must describe the **real selection**. | `mcp:selection` reads the first selected layer (name, page › ancestors, type, variants, layer count, component description) and follows `shell:selection`; a selection change mid-flow returns to Select and says so. |
| M2 | Readiness has to be **measured, not drawn**. | `mcp:check` walks the node once and `evaluate()` (pure, unit-tested) scores it: detached instances and mostly-raw values fail; local components, absolute positioning, unstyled text, default layer names and a missing description warn. The meter is 100 − 25 per fail − 8 per warning. |
| M3 | The prompt is the product: it must carry what the developer's agent needs. | `buildPrompt()` names the node (a Figma URL when the plugin has `figma.fileKey`; private plugins only), the `get_design_context` call, the description, the options and the gaps the checks found as TODOs. **Copy MCP setup** gives the `claude mcp add` line (remote or desktop server) and the `mcp.json` block. |
| M4 | Connection status should come from Settings, not a fixture. | `mcp:status` reports Settings › MCP + Code Sync (repository, base branch, token present and valid) and the Ship step's "Connect GitHub" state names what is missing. |
| M5 | Code generation and the Git push remain previews. | Kept on fixtures, labelled as the output shape; the Generate summary uses the real counts (library components reused, hardcoded values). |

## 5. Verification

`npm run verify` (typecheck, lint, tokens:check, vitest, build). New tests:
`src/features/publish/__tests__/github.test.ts` (retry, repository baseline, commit preview, Teams),
`src/features/publish/__tests__/Tab.test.tsx` (Commit contents, Teams option, GitHub baseline copy),
`src/features/mcp/__tests__/handler.test.ts` (selection, inventory, `evaluate`, status) and
`src/features/mcp/__tests__/Tab.test.tsx` (live selection, checks, MCP setup, prompt).
