# Adding a tab

A tab is a folder under `src/features/<id>/`. The id is lowercase kebab-case and must match the key in `plugin.config.json → tabs`.

```
src/features/<id>/
├── manifest.ts          { id, namespace }
├── messages.ts          message types ('<id>:something') + zod schemas + result types
├── state.ts             tab-local signals (never imported by other tabs)
├── mock.ts              fixture handlers for ?mode=mock and tests
├── ui/Tab.tsx           entry component (export `Tab`)
├── ui/…                 tab-only components
├── sandbox/handler.ts   export `handlers: HandlerMap` (runs inside Figma)
└── __tests__/
```

## Steps

1. Copy `src/features/a11y` and rename. Change `id`/`namespace` in `manifest.ts` and every message prefix in `messages.ts`.
2. Register fixtures: add one line in `tests/mocks/handlers.ts`.
3. Add the tab to `plugin.config.json`:
   ```json
   "tabs":     { "<id>": { "enabled": true, "label": "My Tab", "icon": "tag" } },
   "personas": { "product-designer": { "tabs": ["a11y", "<id>"] } }
   ```
4. `npm run gen` (also runs on `dev`/`build`) regenerates the registries.

## Rules enforced by lint

- A tab imports from `@shared/*` and its own folder only.
- A tab never imports another tab or `src/shell`.
- `src/shared` never imports from `src/features` or `src/shell`.

If something two tabs need does not exist in `shared/`, add it there deliberately. Shared changes affect every tab, so they get tests.

## Sandbox handler contract

```ts
export const handlers: HandlerMap = {
  '<id>:do-thing': async (payload, ctx) => {
    const input = schema.parse(payload)      // validate at the boundary
    ctx.emit('<id>:progress', { … })         // optional streaming
    return result                            // serialisable
  },
}
```

Throwing inside a handler becomes an `{ ok: false, error }` response; the UI receives a `BridgeError`.

## UI contract

```tsx
const rpc = useRpc()
const result = await rpc.call<Result>('<id>:do-thing', payload)
const off = rpc.on<Progress>('<id>:progress', (p) => …)
```

Long scans: use `traverse()` from `@shared/figma/traverse` so the plugin yields between batches.

## Accuracy suite (ground truth)

Unit tests prove a rule does what we meant. The ground-truth page proves it matches what a designer sees. The Figma page **Accessibility · Ground truth** holds labelled cases, one frame each, named `<id> · <title> ▸ <expected>` where `<expected>` is a comma-separated list of `none · contrast · contrast:aaa · assumed · nontext · target · unmeasurable`.

```bash
npm run dev:relay        # once
# In Figma desktop: re-run the plugin (Cmd+Opt+P) after any sandbox change, then
# npm run dev:live, then run the plugin in Figma (it opens the live bridge panel), and
# make the ground-truth page the current page.
npm run gt               # runs the real a11y:scan and compares every case
```

`scripts/ground-truth.ts` talks to the relay; the pure comparison lives in `tests/ground-truth/judge.ts` and is unit tested. Add a case by drawing it on the page and naming the frame — nothing in code changes. When a rule changes, this is the gate.
