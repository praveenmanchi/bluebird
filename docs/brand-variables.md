# Brand from Figma variables

> Build-time tokens come from `figma/tokens.json` via `npm run gen:tokens` — see
> [design-system-pipeline.md](./design-system-pipeline.md). This page covers the **runtime** path only.


`plugin.config.json → brand` names a variable collection and a mode:

```json
"brands": {
  "bridge":    { "label": "Bridge",    "source": { "collection": "Brand UI", "mode": "Bridge" } },
  "ikea":      { "label": "Ikea",      "source": { "collection": "Brand UI", "mode": "Ikea" } }
}
```

On startup the sandbox handles `brand:tokens`:

1. Finds the collection by name — the open file's own first, then the file's enabled libraries
   (`src/shared/brand/collection.ts`) — then the mode by name. A product file that uses the
   design system only has Brand UI through its library: the sandbox imports that collection's
   variables by key (remote references, no layer changes; once per plugin run), which needs the
   `teamlibrary` permission in `manifest.json`. The a11y scan reads its palette the same way.
2. Resolves every variable's value in that mode (aliases followed up to 8 levels).
3. Maps names to tokens: `color/brand` → `color-brand`, `Radius / MD` → `radius-md`.
4. Returns `{ source: 'figma' | 'fallback', tokens, note? }`. Missing collection or mode, or a failed library request → the generated CSS stays in effect and the banner shows a notice.

The UI writes tokens as `--bb-<key>` inline on `:root`, overriding the generated `[data-brand]` values. Editing a variable in the open Figma file (live mode) therefore re-skins the running UI without regenerating; `npm run figma:pull && npm run gen:tokens` makes it permanent.

## Switching brand

Change `brand.active` and rebuild (`<html data-brand>` and `generated/active.css` follow it). A brand is a mode of the Figma **Brand UI** collection; add the mode in Figma, publish the library, pull, and add the entry here. `npm run tokens:check` fails when an entry names a collection or mode that `figma/tokens.json` does not have.
