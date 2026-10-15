# Bluebird · Phase 1 designer testing

Plugin name in Figma: **Design Studio (Beta 2.0)**. Branch `feat/publish-tab-github`, build of 12 October 2026.

Thank you for testing. This round is about whether the plugin fits how you already work in Figma, not about polish. Anything that confuses you for more than ten seconds is a finding.

## Install (Figma desktop app, about five minutes)

You need Node 20 or newer. Then, in a terminal:

```bash
git clone <repo-url> bluebird && cd bluebird && npm install && npm run build
```

1. Open Figma desktop → **Plugins → Development → Import plugin from manifest…**
2. Pick `manifest.json` from the folder you just cloned.
3. In any design file: **Plugins → Development → Design Studio (Beta 2.0) → Open Bluebird**.

The plugin opens at 480 × 640. Drag the bottom-right corner to resize, or use the size toggle in the banner.

If your team lead installed it for you, skip to **Sign in**.

## Sign in

Each brand has its own access code. Enter yours on the login screen and accept the terms.

| Brand | Access code |
|---|---|
| Bridge | `BRIDGE-2026` |
| Ikea | _verify `IKEA-2026` against the config hash, then fill in_ |
| Richemont | _verify `RICHEMONT-2026` against the config hash, then fill in_ |
| Disney | _verify `DISNEY-2026` against the config hash, then fill in_ |
| Fiskars | _verify `FISKARS-2026` against the config hash, then fill in_ |

Bridge is confirmed: `npm run access-code -- BRIDGE-2026` prints the hash stored for that brand. The other four follow the same `<BRAND>-2026` pattern but are not yet confirmed here. Run the script for each and check the printed hash against `accessCodeHash` in `plugin.config.json` before handing them out.

The **Sign in with SSO** buttons are visible but not connected yet. They show a message pointing you back to the access code. That is expected.

First sign-in plays a short onboarding tour. You can replay it later from Settings.

## What is live and what is a preview

Test the live features against a real file. Look at the preview features for layout, wording and flow, but do not expect them to react to your document.

| Tab | Status | Notes |
|---|---|---|
| Accessibility | **Live** | Scans the selection or page. Contrast, target size, non-text contrast, text alternatives. Reads your brand palette from the Brand UI variables, local or via the enabled library. |
| Design tokens | **Live** | Design System persona only. Audits variables and token usage in the open file. |
| Publish | **Live extract, local release** | Extracts tokens and release notes from the file and stores the release in the file. Pushing to GitHub needs a personal access token in Settings. Try it only if you have a test repository. |
| UXAI | **Live, needs a key** | Chat grounded in the configured library files. Needs a Claude API key in **Settings → AI Agent Assistance**. Without a key the tab explains what to add. |
| Jira board | **Preview** | Shows sample tickets. The live connection needs a local proxy that testers do not have. |
| MCP handoff | **Preview** | Select → Check → Generate → Ship flow on sample data. Selecting a frame and opening a link are real. |
| UX AI agents | **Preview** | Six agents with sample results. Clicking a finding selects the layer it points at. |

Which tabs you see depends on the persona you pick: **Product Designer** or **Design System**.

## What to try

1. Sign in, finish the tour, switch between the two personas.
2. Open a product file that uses your brand library. Run an Accessibility scan on one screen and on a whole page. Check that the colours in findings are named in tokens, not hex values.
3. Open Settings. Fill in only what you have. Use **Test Connection** where it exists.
4. Resize the window to the smallest size you would actually use. Note anything that breaks.
5. Walk through the Jira, MCP and Agents previews as if the data were real. Tell us where the flow loses you.
6. If you have a Claude key, ask UXAI two or three questions you would really ask a design-system colleague.

## How to report

For each finding, one line each:

- **Where**: tab and screen, brand, persona.
- **What happened** and **what you expected**.
- **Screenshot** of the plugin, with the Figma layer selected if it matters.

Post in the testing channel or add to the shared sheet. Crashes and anything that blocks you come first.

## Known limits in this build

- SSO is not connected. Access codes only.
- Jira, MCP and Agents tabs run on sample data.
- OpenAI and Gemini keys are accepted in Settings but not used. Only Claude answers.
- Publish writes to GitHub only when you configure a repository and token. Nothing is pushed otherwise.
- Email notifications are stored but not sent. There is no mail service yet.
- Re-run the plugin (**Cmd+Opt+P**) if it stops responding after a long session.

## Privacy

Access codes are hashed. API keys and tokens stay in your Figma client storage on your machine and are never written into the plugin or the repository. UXAI sends your question plus the matching library context to Anthropic using your own key.
