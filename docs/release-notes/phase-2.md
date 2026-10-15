# Design Studio (Beta 2.0) · Phase 2 release notes

**Build:** 13 October 2026 · branch `claude/loving-dirac-daw9zh`
**For:** designers in the testing group
**Figma plugin id:** 1686669081925353511

## Summary

The UX AI agents run for real inside Figma, UX AI understands typography and colour styles, and both tabs answer with whichever AI provider you pick: Claude, OpenAI or Gemini.

## New in this build

### UX AI agents are live
Six agents read your selection, the current frame, its section or the whole page and stream findings as they go:

- **Accessibility**: WCAG 2.2 contrast for every text run (in each brand mode you tick), non-text contrast for borders, 24px target size, text spacing on fixed boxes, unnamed images and icons, control sets without a focus state. Fixes rebind the fill or stroke to the nearest Brand UI token that passes.
- **Design system**: detached instances (Figma's own `detachedInfo`), raw fills and strokes with the token they equal, off-scale or hand-typed spacing and radii, text without a style.
- **Content**: lorem ipsum, filler, fake people, placeholder data and grey image boxes; the model writes realistic copy for the placeholders.
- **Spelling & grammar** and **UX writing**: every text layer, de-duplicated and reviewed in batches by the model, with the corrected text as the fix.
- **Localization**: German, French and Arabic expansion against each text box (W3C pseudo-localisation table), directional icons to mirror for RTL, hard-coded US dates, times, currency and units, sentence fragments.

Setup chooses the rule pack, brand modes and **Review / Suggest / Auto-fix**. Results can be applied one by one or all safe ones at once, written as **Dev Mode annotations**, drawn as a **report frame** next to the scope, copied as a Jira-ready list or downloaded as Markdown + JSON. **Run all** runs the agents in sequence. The Voice view talks to the agent about its run and acts on what you agree to.

### Pick your AI provider
Settings › AI Agent Assistance has **Answer with**: Claude, OpenAI or Gemini, each with its own Default Model and key. The chosen provider answers UX AI and runs the model-backed agents; when it has no key the first provider with a key steps in and the footer pill says so. Model lists follow the providers' docs as of 13 October 2026.

### More library files, with styles
Dual File Mode keeps its two slots and gains **Add another library file**. Every file is read with its own key or File 1's, and the loader now reads published text and colour styles too. UX AI answers typography questions with the real type ramp (family, size, line height, weight) and shows the Color Artifact for the top colour variable in every brand mode.

## Known limits

- SSO is not connected. Access codes only.
- Jira and MCP tabs still run on sample data.
- Resizing a target or swapping a detached instance back is advised, not applied.
- Speech recognition depends on the host browser; the Figma desktop app usually has none, so type to the agent.
- Reading variables over REST still needs an Enterprise plan; colour styles cover files without variables.

## Research

`docs/research/ux-ai-agents-research.md` holds the provider request shapes, the Figma API notes, the competitor review and the expansion tables this build follows.
