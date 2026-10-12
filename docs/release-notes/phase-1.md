# Design Studio (Beta 2.0) · Phase 1 release notes

**Build:** 12 October 2026 · branch `feat/publish-tab-github`
**For:** designers in the Phase 1 testing group
**Figma plugin id:** 1686669081925353511

## Summary

First build handed to designers. Seven tabs, two personas, five brands behind access codes. The plugin now reads your brand variables from the design-system library, so it works in product files, not only in the library file itself.

## New in this build

### Works in product files
The plugin finds the **Brand UI** variable collection in the open file first, then in the file's enabled libraries. Brand colours, radii and type now resolve in any file that uses the design system. The Accessibility scan names colours in tokens the same way. The manifest asks for the `teamlibrary` permission to do this.

### Brand-managed Settings
A brand can preset Settings sections for everyone, such as the GitHub repository, Storybook URL, Jira site or default AI model. Preset fields show as locked in the plugin. Keys, tokens, webhooks and file keys are never preset. Each person enters their own.

### Per-brand tabs
Each brand can show a different set of tabs in its own order. Unchanged for testers unless your brand has customised it.

### Plugin configuration page (developers)
A page in the browser dev harness edits per-brand tabs and managed Settings and writes them to the plugin config. It prompts for a rebuild so the next build ships the change.

### Usage analytics page (developers, sample data)
A dashboard in the dev harness shows tab usage, Jira throughput and designer activity on generated data. Design only. No real telemetry is collected.

## Tabs in this build

| Tab | Persona | State |
|---|---|---|
| Accessibility | both | live scan of selection or page |
| Design tokens | Design System | live variable and token audit |
| Publish | both | live extract, release stored in file, optional GitHub push |
| UXAI | both | live chat, needs a Claude API key |
| Jira board | Product Designer | sample data |
| MCP handoff | Product Designer | sample data |
| UX AI agents | both | sample data |

## Fixed since the last internal build

- Brands pointed at a collection name that no longer existed after the Figma file reorganisation. They now point at **Brand UI** and the token check fails the build if a brand names a missing collection or mode.
- The UXAI Answer screen matches the redrawn frame. The Sources bar was removed.
- Chat input expands to show the selected sources.
- Both Figma extractors walk the new Foundations, Atoms, Molecules, Organisms and Pages tiers.

## Known limits

- **SSO** shows provider buttons but is not connected. Access codes only.
- **Jira live mode** needs a local proxy. Testers see sample tickets.
- **OpenAI and Gemini** keys are accepted but unused. Only Claude answers.
- **Email notifications** are stored, not sent.
- **Publish to GitHub** needs a personal access token and a repository in Settings. Nothing is pushed without them.

## Install

See [phase-1-tester-note.md](../phase-1-tester-note.md). Short version: clone, `npm install`, `npm run build`, import `manifest.json` in Figma desktop.

## Build facts

| Check | Result |
|---|---|
| Typecheck, lint | clean |
| Tests | 204 files, 1364 passing |
| UI bundle | 1149.4 KB of a 1150 KB budget |
| Sandbox | 149 KB |
