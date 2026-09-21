# Brand from Figma variables

> Build-time tokens come from `figma/tokens.json` via `npm run gen:tokens` — see
> [design-system-pipeline.md](./design-system-pipeline.md). This page covers the **runtime** path only.


`plugin.config.json → brand` names a variable collection and a mode:

```json
"brands": {
  "bridge":    { "label": "Bridge",    "source": { "collection": "Brand", "mode": "Bridge" } },
  "ikea":      { "label": "Ikea",      "source": { "collection": "Brand", "mode": "Ikea" } }
}
```

On startup the sandbox handles `brand:tokens`:

1. Finds the local collection by name, then the mode by name.
2. Resolves every variable's value in that mode (aliases followed up to 8 levels).
3. Maps names to tokens: `color/brand` → `color-brand`, `Radius / MD` → `radius-md`.
4. Returns `{ source: 'figma' | 'fallback', tokens, note? }`. Missing collection or mode → the generated CSS stays in effect and the banner shows a notice.

The UI writes tokens as `--bb-<key>` inline on `:root`, overriding the generated `[data-brand]` values. Editing a variable in the open Figma file (live mode) therefore re-skins the running UI without regenerating; `npm run figma:pull && npm run gen:tokens` makes it permanent.

## Switching brand

Change `brand.active` and rebuild (`<html data-brand>` and `generated/active.css` follow it). A brand is a mode of the Figma **Brand** collection; add the mode in Figma, pull, and add the entry here. Library (published) variables are a later step: they need the team library API and an import-by-key, which the resolver does not do yet.
