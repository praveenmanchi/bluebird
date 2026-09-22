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
npm run dev:relay      # WebSocket relay for live mode (port 4001)
npm run build          # dist/index.html + dist/bridge.html + dist/code.js, enforces size budget
npm run test           # vitest
npm run storybook      # component workshop with a Brand switcher → http://localhost:6006
npm run figma:pull     # refresh figma/*.json from the Figma file (relay, or --rest)
npm run gen:tokens     # figma/*.json → generated CSS/TS
npm run tokens:check   # Figma ↔ code drift gate
npm run verify         # typecheck + lint + tokens:check + test + build
```

## Loading the plugin in Figma (desktop app)

1. `npm run build`
2. Figma → Plugins → Development → Import plugin from manifest… → pick `manifest.json`
3. Run **bluebird → Open Bluebird**. Re-run with `Cmd+Opt+P` after each sandbox change.

## Live mode (UI in your browser, real Figma document)

```
browser  ─►  ws://127.0.0.1:4001 relay  ─►  bridge page inside Figma  ─►  sandbox  ─►  document
```

1. `npm run dev:relay` (add `-- --token abc` for a shared secret)
2. `npm run dev:sandbox` and `npm run dev` in two more terminals
3. In Figma: **bluebird → Dev: connect to browser (live mode)**. Leave that small panel open.
4. Open `http://localhost:5173/?mode=live` (append `&token=abc` if you set one)

Sandbox changes still need a plugin re-run in Figma (`Cmd+Opt+P`). UI changes hot-reload in the browser.

## Layout

```
plugin.config.json         the switchboard (validated by src/shared/config/schema.ts)
manifest.json              Figma manifest: two UIs (main, bridge), dev-only localhost access
src/
  shared/                  read-only for tabs
    config/                schema + loader
    bridge/                typed rpc, router, transports (postMessage, websocket, mock)
    brand/                 snapshot types, extractor (runs in Figma), generated/ CSS+TS, theme.css
    figma/                 color math, chunked traversal, paint helpers
    ui/<Component>/        one folder per Figma component set: .tsx .css figma.ts .stories.tsx .test.tsx
    ui/legacy/             primitives without a bound Figma counterpart yet
  features/<tab>/          one folder per tab — see docs/adding-a-tab.md
  shell/                   App, Banner, TabBar, persona/tab state, generated registry
  sandbox/main.ts          Figma-side entry
  ui/main.tsx              browser-side entry (mode detection)
dev.html + src/dev/       browser dev harness: frames the plugin at its real window size with brand / size / fixture / persona knobs
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
