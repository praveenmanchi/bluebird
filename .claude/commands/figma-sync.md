---
description: Find what changed in Figma and update the code to match.
argument-hint: "[ComponentName ...]"
allowed-tools: Bash(npm run figma:diff*), Bash(npm run figma:pull*), Bash(npm run gen:tokens), Bash(npm run tokens:check*), Bash(npm run test*), Bash(npm run typecheck), Bash(npm run lint*), Read, Edit, Grep, Glob
---

Bring the code back in line with the live Figma file.

**Never run `npm run figma:pull` before the diff.** It overwrites `figma/*.json` in place,
which destroys the baseline the diff compares against. Pull only in step 4, to accept.

1. Run the diff. With arguments, pass each as `--component <Name>`:

   `npm run figma:diff` — or `npm run figma:diff -- --component A --component B`

   Exit code 2 means the *pull* failed, not that anything drifted. Tell the user to start
   `npm run dev:relay` and open the bridge page in Figma, or to re-run with `--rest` and
   `FIGMA_TOKEN` set. Do not continue.

2. Read `figma/drift.json`. Summarise for the user, grouped by component, highest impact first:

   `prop-*` › `node-added` / `node-removed` › `binding-*` › `raw-changed` / `derived-*` › `variable-*`

   Call out every finding with `"confidence": "heuristic"` — those renames are a guess and may
   really be a delete plus an add. Note any finding where `"read": false`: the change currently
   reaches no code at all. **Stop here and get the user's go-ahead before editing.**

3. Apply, component by component, leaves before the screens that compose them:

   - `prop-added` / `prop-renamed` / `prop-type-changed` → update the `props` map in the
     component's `figma.ts`, then its `*Props` interface and the component body. If the Figma
     property has no code counterpart, put it in `propGaps` with the reason instead of inventing
     a prop. A new variant needs a story (`parameters.figma.variant`) or the coverage test fails.
   - `binding-added` / `binding-rebound` → read the new `var(--bb-…)` named in `vars`, and delete
     any `figmaGaps` entry the rebind just made obsolete.
   - `derived-changed` with `"read": false` → Figma moved a size, padding or gap and nothing in
     code reads it. Wire the token up, or add it to `derivedGaps` in the component's `figma.ts`
     with a reason (e.g. the frame is fixed-width only for the variant sheet while code hugs).
   - `node-added` / `node-removed` → add or remove the markup and its CSS block.
   - `set-id-changed` → fix `setId` in `figma.ts` **and** the entry in `figma/manifest.json`,
     or the next pull snapshots a different node.

   Never write a raw hex or px into component CSS — `no-raw-values` rejects it. Every visual
   value comes from `var(--bb-…)`.

4. `npm run figma:pull` — accept the new snapshot now that the code matches it.

5. `npm run gen:tokens && npm run tokens:check`, then `npm run test && npm run typecheck && npm run lint`.

   - `derived-token-unused` / `derived-token-drifted` → step 3 missed one. Wire it up or excuse it
     in `derivedGaps`. Reach for `npm run tokens:check -- --write-baseline` only as a last resort;
     it accepts the value as debt, so say why in the commit message.
   - `figma-prop-unmapped` → add the key to `props`, or to `propGaps`.
   - `figma-token-unused` → the component must read the token the Figma set binds.

   Loop until clean.

6. Report: components touched, findings closed, findings deferred and why. Do not commit unless
   the user asks.
