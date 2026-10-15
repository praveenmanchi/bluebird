# UX AI / UX AI agents: research notes

Date: 2026-10-13. Scope: Bluebird Figma plugin (Preact + TypeScript), tabs "UX AI" (chat grounded in library files read over the Figma REST API) and "UX AI agents" (review agents that write results back into Figma). Three BYOK providers called directly from the plugin: Anthropic, OpenAI, Google Gemini.

Verification legend: **[fetched]** = official page read in this session; **[probe]** = live HTTP test run in this session; **[search]** = official page seen only through search snippets; **[secondary]** = third-party source; **[unverified]** = recalled, not re-checked today.

---

## 1. Current model IDs and REST request shapes

### 1.1 Anthropic Messages API

- Endpoint: `POST https://api.anthropic.com/v1/messages` [fetched: https://platform.claude.com/docs/en/api/messages].
- Headers: `x-api-key: <key>`, `anthropic-version: 2023-06-01` (the SDK's default value), `content-type: application/json` [fetched: same page; https://platform.claude.com/docs/en/cli-sdks-libraries/sdks/typescript]. Browser callers must add `anthropic-dangerous-direct-browser-access: true`; without it the API returns an authentication error saying CORS requests must include that header [secondary: https://simonwillison.net/2024/Aug/23/anthropic-dangerous-direct-browser-access, https://github.com/ChatGPTNextWeb/NextChat/issues/5452]. The TS SDK equivalent is `new Anthropic({ apiKey, dangerouslyAllowBrowser: true })` [fetched: TypeScript SDK page].
- **CORS [probe]:** `OPTIONS /v1/messages` with `Origin: null` returned `access-control-allow-origin: *`, `access-control-allow-headers: content-type, authorization, x-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, ...`, `access-control-max-age: 600`. A Figma plugin iframe (null origin) can call it directly.
- Body (required: `model`, `max_tokens`, `messages`; `system` is a top-level string or array of text blocks, not a message role) [fetched]:
  ```json
  {"model":"claude-sonnet-5-5","max_tokens":4096,
   "system":"You are a UX reviewer...",
   "output_config":{"effort":"low"},
   "messages":[{"role":"user","content":"..."}]}
  ```
  - `max_tokens` is required (min 0; 0 only pre-warms the cache); max varies per model (128K on all current models) [fetched: messages page; models overview]. For non-streaming calls keep it moderate (a few thousand) to avoid timeouts.
  - Up to 100,000 messages per request; consecutive same-role turns are merged; a trailing assistant message (prefill) returns 400 on 4.6+ [fetched: messages page, errors page].
  - Thinking: on Opus 5.5 / Fable 5.1 thinking is always on and `thinking:{type:"disabled"}` is a 400; on Sonnet 5.5 the lowest setting is `thinking:{type:"between_tools"}`; Haiku 5.5 accepts `disabled`. Simplest for a plugin: omit `thinking` and steer cost with `output_config.effort` (`low`..`max`) [fetched: https://platform.claude.com/docs/en/api/errors].
  - Forced `tool_choice` (`any`/`tool`) is a 400 on Opus 5.5, Sonnet 5.5, Fable 5.1; use `auto` + instructions, or structured outputs via `output_config.format` [fetched: errors page]. Structured outputs is the documented JSON mode; the deprecated name was `output_format` [claude-api skill reference, cached 2026-10-06].
- Response: `{id, type:"message", role:"assistant", model, content:[{type:"text", text}], stop_reason, stop_sequence, usage:{input_tokens, output_tokens}}`. Read text by filtering `content` for `type === "text"` (thinking blocks may precede it); check `stop_reason` (`end_turn`, `max_tokens`, `refusal`, ...) [fetched: TS SDK page; errors page].
- Error body: `{"type":"error","error":{"type":"...","message":"..."},"request_id":"req_..."}` [fetched: errors page].
- **Model IDs** [fetched: https://platform.claude.com/docs/en/docs/about-claude/models/overview, 2026-10-13]:

| ID | Tier | Context / max out | Default effort | Price in/out per MTok |
|---|---|---|---|---|
| `claude-fable-5-1` | most capable | 1M / 128K | high | $10 / $50 |
| `claude-opus-5-5` | default | 1M / 128K | medium | $4 / $20 |
| `claude-sonnet-5-5` | speed+intelligence | 1M / 128K | high | $2 / $10 |
| `claude-haiku-5-5` | cheapest/fastest | 1M / 128K | medium | from $0.10 / $0.50 |

  Legacy IDs still served: `claude-fable-5`, `claude-opus-5`, `claude-opus-4-8`, `claude-opus-4-7`, `claude-opus-4-6`, `claude-opus-4-5`, `claude-sonnet-5`, `claude-sonnet-4-6`, `claude-haiku-4-5` [fetched]. Dateless IDs from 4.6 on are pinned snapshots (never append dates). `GET /v1/models` returns `max_input_tokens`, `max_tokens`, `capabilities`, `line` for a live model picker [fetched]. Suggested plugin defaults: `claude-sonnet-5-5` for agents, `claude-haiku-5-5` for spelling/placeholder passes, `claude-opus-5-5` for the chat tab.

### 1.2 OpenAI

platform.openai.com / developers.openai.com were unreachable from this sandbox; everything below is [search] or [secondary].

- Chat Completions: `POST https://api.openai.com/v1/chat/completions`, header `Authorization: Bearer <key>`, body `{model, messages:[{role:"system"|"developer"|"user"|"assistant", content}], max_completion_tokens, temperature?, response_format?, reasoning_effort?}`. Read text at `choices[0].message.content`; check `choices[0].finish_reason` (`stop` | `length` | ...); usage in `usage.prompt_tokens` / `completion_tokens` [secondary: https://www.mintlify.com/openai/openai-ruby/api/chat; https://promptfoo.dev/docs/providers/openai].
- Output limit: use `max_completion_tokens`. `max_tokens` "is now deprecated in favor of max_completion_tokens, and is not compatible with o-series models"; the new field counts visible plus reasoning tokens [search: https://community.openai.com/t/why-was-max-tokens-changed-to-max-completion-tokens/938077]. Reasoning models reject non-default `temperature` [secondary: https://forum.popclip.app/t/required-api-changes-for-gpt-5-x-reasoning-models/3661].
- `reasoning_effort`: values are model-dependent among `none, minimal, low, medium, high, xhigh`; `gpt-5.5` defaults to `medium` [search: https://developers.openai.com/docs/guides/reasoning]. Use `low`/`none` for cheap review passes.
- JSON: `response_format: {type:"json_object"}` (valid JSON only; prompt must mention JSON) or `{type:"json_schema", json_schema:{name, schema, strict:true}}` (strict needs every property `required` and `additionalProperties:false`) [search: https://developers.openai.com/docs/guides/structured-outputs; secondary: https://docs.deno.com/examples/openai_structured_output/, https://www.respan.ai/articles/openai-structured-outputs-vs-json-mode]. A refusal or `finish_reason:"length"` returns 200 with non-schema content; guard the parse.
- Responses API: `POST /v1/responses`, body `{model, input (string | message array), instructions, max_output_tokens, reasoning:{effort}, text:{format:{type:"json_schema", name, schema, strict}}}`. Response has `output[]`; message items carry `content[]` with `{type:"output_text", text}`; SDKs expose `output_text`; truncation shows as `incomplete_details.reason === "max_output_tokens"` [secondary mirrors: https://docs.electronhub.ai/api-reference/responses.md, https://api-docs.deepseek.com/api/create-response, https://docs.getbifrost.ai/api-reference/openai-integration/count-input-tokens]. Prefer Responses for GPT-5.4+: since GPT-5.4, Chat Completions runs tool calls only with reasoning off, and `gpt-5.5-pro` is Responses-only [secondary: https://www.ml4devs.com/articles/openai-responses-api-vs-chat-completions/]. Chat Completions itself is not deprecated (the Assistants API shut down 2026-08-26) [same source].
- **CORS: uncertain.** The official SDK blocks browsers unless `dangerouslyAllowBrowser: true` [search: https://developers.openai.com/api/reference/typescript]. I could not probe api.openai.com (proxy denied). One blog claims OpenAI omits `Access-Control-Allow-Origin` for browser origins [secondary: https://horadecodar.com.br/?p=45706]; many BYOK browser apps nonetheless call it directly, and the SDK's `x-stainless-*` headers (not the endpoint) are a documented preflight failure cause [secondary: https://github.com/ollama/ollama-js/issues/93]. Action: use plain `fetch` with only `Authorization` + `Content-Type`, and ship a Settings "Test connection" button that surfaces a CORS failure clearly.
- **Model IDs (2026):**

| ID | Status | Source |
|---|---|---|
| `gpt-5.5`, `gpt-5.5-pro` | current; recommended for production (Apr 2026) | [search: https://platform.openai.com/docs/changelog; https://developers.openai.com/docs/guides/reasoning] |
| `gpt-5.4`, `gpt-5.4-mini` | current, lower cost/latency | [search: reasoning guide] |
| `gpt-5.1` (`gpt-5.1-2025-11-13`) | deprecated | [search: https://platform.openai.com/docs/models/gpt-5.1] |
| `gpt-5` | shutdown listed 2026-12-11 (grouping in snippet ambiguous) | [search: https://developers.openai.com/api/docs/deprecations] |
| `gpt-5-mini`, `gpt-5-nano` | exist per aggregators only | [secondary: https://www.sim.ai/models/openai/gpt-5] |
| `gpt-4.1` (`gpt-4.1-2025-04-14`), `gpt-4.1-mini` | available; `gpt-4.1-mini` shutdown 2026-12-11; `gpt-4.1-nano` shutdown 2026-10-23 | [search: https://platform.openai.com/docs/models/gpt-4.1; deprecations page] |
| `gpt-4o` | still in API; `gpt-4o-2024-05-13` shuts 2026-10-23; `chatgpt-4o-latest` removed 2026-02-17 | [search: https://developers.openai.com/api/docs/models/gpt-4o; deprecations] |
| `o3-mini`, `o4-mini` | shutdown 2026-10-23 | [search: deprecations page] |
| `gpt-5.6-sol/terra/luna`, "GPT-6" | appeared in one snippet; **unverified**, do not hardcode | [search snippet only] |

  Recommendation: default `gpt-5.5` (chat) and `gpt-5.4-mini` (agents), and populate the picker from `GET /v1/models` at runtime.

### 1.3 Google Gemini

- Endpoint: `POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`. Auth: header `x-goog-api-key: <key>` (official quickstart) or `?key=` query param (older docs; the header keeps the key out of URLs/logs) [search: https://ai.google.dev/gemini-api/docs/generate-content/text-generation, https://ai.google.dev/tutorials/get_started_web].
- Body:
  ```json
  {"systemInstruction":{"parts":[{"text":"You are..."}]},
   "contents":[{"role":"user","parts":[{"text":"..."}]}],
   "generationConfig":{"temperature":0.2,"maxOutputTokens":2048,
     "responseMimeType":"application/json",
     "responseSchema":{...}}}
  ```
  `systemInstruction.role` is ignored [search: https://docs.cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini]. `responseMimeType:"application/json"` turns on JSON mode; `responseSchema` takes an OpenAPI-3.0 subset, while `responseJsonSchema` (Gemini 2.5+) accepts full JSON Schema and is mutually exclusive with `responseSchema` [search: https://ai.google.dev/gemini-api/docs/json-mode; secondary: https://github.com/vercel/ai/pull/18325, https://sttp-ai.softwaremill.com/gemini/structured-outputs.html]. `text/x.enum` returns a single enum value [search: Firebase structured-output docs].
- Response: `candidates[0].content.parts[].text` (concatenate parts; skip parts flagged `thought` on thinking models [unverified]), `candidates[0].finishReason` (`STOP`, `MAX_TOKENS`, `SAFETY`...), `usageMetadata.{promptTokenCount,candidatesTokenCount,totalTokenCount}` [unverified field names, consistent with Vertex reference above].
- **CORS [probe]:** `OPTIONS ...:generateContent` with `Origin: null` and `Access-Control-Request-Headers: content-type, x-goog-api-key` returned `200`, `access-control-allow-origin: null` (echoed), `access-control-allow-headers: content-type, x-goog-api-key`, `access-control-max-age: 3600`. Works from a null-origin plugin iframe. Requesting non-Google headers in the preflight (e.g. `authorization`, `x-api-key`) returned 403, so send only the two headers above. Note a 2026 forum claim that unrestricted keys are no longer accepted [secondary: https://discuss.ai.google.dev/t/how-to-prevent-unauthorised-usage/176796]; HTTP-referrer restrictions will break null-origin calls, so advise users to restrict by API instead.
- **Model IDs:**

| ID | Status | Source |
|---|---|---|
| `gemini-2.5-pro`, `gemini-2.5-flash`, `gemini-2.5-flash-lite` | deprecated; shutdown listed Oct 16, 2026 (Vertex Oct 20); already 404 "no longer available to new users" for new projects | [search: https://discuss.ai.google.dev/t/gemini-2-5-pro-returns-no-longer-available-to-new-users-contradicts-official-deprecation-date-oct-16-2026/176380] |
| `gemini-3.1-pro-preview` | current Pro (released 2026-02-19); no stable Pro ID found | [search: https://ai.google.dev/gemini/docs/changelog; https://ai.google.dev/gemini-api/docs/interactions/gemini-3] |
| `gemini-3-flash-preview` | used in docs examples; free tier | [search: https://ai.google.dev/gemini-api/docs/gemini-3] |
| `gemini-3.1-flash-lite` | stable (May 2026) | [secondary: https://claw.aguidetocloud.com/google/gemini-api/models/] |
| `gemini-3.5-flash` | GA; behind alias `gemini-flash-latest` | [search: official changelog] |
| `gemini-3.6-flash`, `gemini-3.5-flash-lite` | GA per "latest models" page | [search: https://ai.google.dev/gemini-api/docs/latest-model] |
| `gemini-3.5-pro` | **unconfirmed** | conflicting blogs |

  Gemini 3 models: 1M input, 64K output [search: Gemini 3 guide]. Recommendation: default `gemini-3.5-flash`, offer `gemini-3.1-pro-preview`, drop all 2.5 IDs, and fetch `GET /v1beta/models` for the picker.

### 1.4 Comparison table

| | Anthropic | OpenAI (Chat Completions / Responses) | Gemini |
|---|---|---|---|
| Endpoint | `POST api.anthropic.com/v1/messages` | `POST api.openai.com/v1/chat/completions` / `/v1/responses` | `POST generativelanguage.googleapis.com/v1beta/models/{m}:generateContent` |
| Auth header | `x-api-key` + `anthropic-version: 2023-06-01` + `anthropic-dangerous-direct-browser-access: true` | `Authorization: Bearer` | `x-goog-api-key` (or `?key=`) |
| System prompt | top-level `system` | `messages[0].role:"system"`/`"developer"` / `instructions` | `systemInstruction.parts[].text` |
| Output cap | `max_tokens` (required) | `max_completion_tokens` / `max_output_tokens` | `generationConfig.maxOutputTokens` |
| JSON mode | `output_config.format` (structured outputs) or prompt | `response_format:{type:"json_object"|"json_schema"}` / `text.format` | `generationConfig.responseMimeType:"application/json"` + `responseSchema`/`responseJsonSchema` |
| Read text | `content.filter(b=>b.type==="text").map(b=>b.text).join("")` | `choices[0].message.content` / `output[].content[].text` where `type==="output_text"` | `candidates[0].content.parts.map(p=>p.text).join("")` |
| Stop/finish | `stop_reason` (`end_turn`,`max_tokens`,`refusal`) | `finish_reason` (`stop`,`length`) / `status`+`incomplete_details` | `finishReason` (`STOP`,`MAX_TOKENS`,`SAFETY`) |
| CORS from null origin | yes [probe] | likely but unverified | yes [probe] |
| 400 | `invalid_request_error` (bad body, prefill, thinking config, spend limit) | invalid params (e.g. `max_tokens` on reasoning model, temperature) | `INVALID_ARGUMENT` (bad schema/field) |
| 401 | `authentication_error` (bad/expired key) | invalid key | key missing/invalid |
| 403 | `permission_error` (key lacks access) | region/org not allowed | `PERMISSION_DENIED`: key restricted (referrer/API), API not enabled, or model restricted to existing users |
| 404 | `not_found_error` (wrong path/model) | model not found/retired | model retired or "no longer available to new users" |
| 429 | `rate_limit_error` (may lack `retry-after` when a spend cap is hit) | rate limit or quota exhausted | `RESOURCE_EXHAUSTED` (free-tier RPM/TPD) |
| 5xx | 500 `api_error`, 504 `timeout_error`, 529 `overloaded_error` | 500/503 | 500/503 `UNAVAILABLE` |

Anthropic column [fetched: https://platform.claude.com/docs/en/api/errors]; others [unverified/secondary]. Retry 429/5xx with exponential backoff honoring `retry-after`.

---

## 2. Figma Plugin API capabilities for review agents

Docs root: https://developers.figma.com/docs/plugins/. Pages marked † were confirmed via search snippets today; others are the canonical reference URLs [unverified this session].

- **Text reading** †: `TextNode.characters`, `fontName`, `fontSize` may be `figma.mixed` when ranges differ; use `getStyledTextSegments(["fontName","fontSize","textStyleId","fills", ...])` to get per-range segments with `start`/`end` [https://developers.figma.com/docs/plugins/working-with-text, https://developers.figma.com/docs/plugins/api/properties/TextNode-getstyledtextsegments/]. Replacing `characters` on a mixed-style node collapses styling; snapshot segments first and reapply with `setRange*` [secondary: https://forum.figma.com/ask-the-community-7/preserving-mixed-text-styles-when-replacing-text-via-plugin-api-55166].
- **Fonts** †: `await figma.loadFontAsync(fontName)` is mandatory before changing `characters`, `fontSize`, `fontName`, etc.; for mixed nodes load every font from `getRangeAllFontNames(0, len)` [https://developers.figma.com/docs/plugins/api/properties/figma-loadfontasync]. Missing fonts throw; catch and report per node.
- **Truncation/overflow** †: `textAutoResize` (`NONE`|`HEIGHT`|`WIDTH_AND_HEIGHT`|`TRUNCATE` legacy), `textTruncation: "DISABLED"|"ENDING"`, `maxLines`. Ellipsis only applies when `textAutoResize === "NONE"` or together with `maxHeight`/`maxLines` [https://developers.figma.com/docs/plugins/api/properties/TextNode-texttruncation/]. Localization agent: compare `absoluteRenderBounds` of text vs. parent to detect clipping.
- **Variables** †: `node.boundVariables` (field → `VariableAlias`), `figma.variables.getVariableByIdAsync(id)`, `node.setBoundVariable(field, variable)`, `figma.variables.setBoundVariableForPaint(paint, "color", variable)` returns a new paint (assign it back to `fills`) [https://developers.figma.com/docs/plugins/api/figma-variables]. Library: `figma.teamLibrary.getAvailableLibraryVariableCollectionsAsync()` → `getVariablesInLibraryCollectionAsync(key)` → `figma.variables.importVariableByKeyAsync(key)`; rejects if the user lacks library access; `getVariableById` may "succeed" but binding fails until imported [https://developers.figma.com/docs/plugins/api/properties/figma-variables-importvariablebykeyasync, https://developers.figma.com/docs/plugins/api/properties/figma-teamlibrary-getvariablesinlibrarycollectionasync]. Requires `"permissions": ["teamlibrary"]` in the manifest [unverified]. Imported variables report `scopes` as `ALL_SCOPES` (long-standing bug) and are read-only [secondary: https://forum.figma.com/t/variables-imported-with-importvariablebykeyasync-always-have-scopes-set-to-all-scopes/56906].
- **Styles**: `textStyleId`, `fillStyleId`, `strokeStyleId`, `effectStyleId` (string or `figma.mixed`); resolve with `figma.getStyleByIdAsync(id)`; enumerate with `figma.getLocalTextStylesAsync()` / `getLocalPaintStylesAsync()` [https://developers.figma.com/docs/plugins/api/figma, https://developers.figma.com/docs/plugins/api/properties/figma-getstylebyidasync/]. Token agent: flag raw fills with neither `boundVariables.fills` nor `fillStyleId`.
- **Annotations (Dev Mode)** †: `node.annotations: Annotation[]` with `label`, `labelMarkdown`, `properties` (e.g. `[{type:"fills"}]`), `categoryId`; categories via `figma.annotations.getAnnotationCategoriesAsync()`, `addAnnotationCategoryAsync({label, color})`; supported on Frame, Instance, Component, Text, shapes and vectors; writes are typically guarded by `figma.editorType === "dev"` in docs [https://developers.figma.com/docs/plugins/api/Annotation, https://developers.figma.com/docs/plugins/api/figma-annotations]. Good write-back target for findings per node.
- **Selection / viewport**: `figma.currentPage.selection` (settable), `figma.viewport.scrollAndZoomIntoView(nodes)` to jump to a finding [https://developers.figma.com/docs/plugins/api/figma-viewport]. `figma.on("selectionchange")` to re-run.
- **Geometry** †: `absoluteBoundingBox` vs `absoluteRenderBounds` (includes shadows/strokes; `null` when not rendered, e.g. clipped text) [https://developers.figma.com/docs/plugins/updates/2021/11/03/version-1-update-38]. Use render bounds for touch-target checks (>= 44x44 / 24x24 WCAG 2.5.8).
- **Prototype**: `node.reactions: Reaction[]` (`trigger`, `actions`), set via `setReactionsAsync` [https://developers.figma.com/docs/plugins/api/Reaction]. Use to detect interactive elements without hover/focus states.
- **Detached instances** †: `instance.detachInstance()` returns a `FrameNode`; since Sept 2023 that frame carries `detachedInfo: {type:"local", componentId} | {type:"library", componentKey}`, persisting even if the component was deleted [https://developers.figma.com/docs/plugins/api/DetachedInfo, https://developers.figma.com/docs/plugins/updates/2023/09/14/version-1-update-77/]. It is absent for nodes detached before that update or copied afterwards, so keep heuristics: a FRAME whose name matches a library component name or `Property=Value` pattern, has no `mainComponent`, and whose child structure matches a published component; also frames containing nested INSTANCEs of a component set's parts. Figma staff confirm there is otherwise no marker [secondary: https://forum.figma.com/t/how-to-find-detached-nodes/10755/6].
- **Drawing a report frame**: `figma.createFrame()`, set `layoutMode = "VERTICAL"`, `primaryAxisSizingMode`/`counterAxisSizingMode = "AUTO"`, `itemSpacing`, `paddingTop/Right/Bottom/Left`, `layoutWrap`; `figma.createText()` then `loadFontAsync({family:"Inter", style:"Regular"})` before `characters`; `appendChild`; `resize()` is a no-op on auto-sized axes [https://developers.figma.com/docs/plugins/api/FrameNode, https://developers.figma.com/docs/plugins/updates/2019/12/04/version-1-update-8]. Place the frame next to the reviewed frame using `absoluteBoundingBox`.
- **Dynamic page loading** †: `"documentAccess": "dynamic-page"` is required for new plugins; sync accessors are gone: use `figma.getNodeByIdAsync`, `getStyleByIdAsync`, `getLocalTextStylesAsync`, `page.loadAsync()` before `page.children`, `figma.loadAllPagesAsync()` before whole-document scans; Figma ships an eslint ruleset for migration [https://developers.figma.com/docs/plugins/migrating-to-dynamic-loading, https://developers.figma.com/docs/plugins/accessing-document/].
- **Notify** †: `figma.notify(msg, {timeout, error, button:{text, action}, onDequeue})`; `error:true` effectively sets timeout to Infinity, so pass a timeout explicitly [https://developers.figma.com/docs/plugins/api/properties/figma-notify; secondary: https://forum.figma.com/ask-the-community-7/figma-notify-error-figma-notify-error-does-not-timeout-30540].
- **Networking** †: the main thread has a Figma `fetch` (WHATWG-like) [https://developers.figma.com/docs/plugins/making-network-requests]; the main thread has no browser APIs, so this fetch is relayed through the plugin iframe [https://developers.figma.com/docs/plugins/how-plugins-run]. Plugin iframes have a **null origin**, so the target must answer `Access-Control-Allow-Origin: *` (or echo `null`); `networkAccess` only lets the request leave, CORS decides whether you can read the reply [https://developers.figma.com/docs/widgets/making-network-requests; secondary: https://forum.figma.com/report-a-problem-6/cors-issue-while-calling-api-through-figma-plugin-42209]. Manifest: `"networkAccess": {"allowedDomains": ["https://api.anthropic.com", "https://api.openai.com", "https://generativelanguage.googleapis.com", "https://api.figma.com"], "reasoning": "...", "devAllowedDomains": [...]}`; `["none"]` blocks all, `["*"]` allows all (discouraged in review), a trailing `/` matches a path prefix; off-list requests fail with a CSP error [https://developers.figma.com/docs/plugins/manifest]. Note: `"none"` is invalid in `devAllowedDomains` [secondary: https://forum.figma.com/t/incorrect-documentation-for-network-access-in-plugin-manifest/67313].

---

## 3. Figma REST API for library files

Base `https://api.figma.com`. Auth: `X-Figma-Token: <PAT>` or `Authorization: Bearer <oauth>` [unverified]. Scopes page: https://developers.figma.com/docs/rest-api/scopes (`files:read`/`file_read` are deprecated; migrate to granular scopes) [search].

| Endpoint | Returns | Scope | Tier |
|---|---|---|---|
| `GET /v1/files/:key?version=&ids=&depth=&geometry=paths&plugin_data=&branch_data=` | `name, lastModified, version, document` (full tree), `components`, `componentSets`, `styles` maps (metadata keyed by node id) | `file_content:read` | 1 [search: https://developers.figma.com/docs/rest-api/file-endpoints] |
| `GET /v1/files/:key/nodes?ids=&depth=&geometry=` | only the requested subtrees (+ancestor path) with their `components`/`styles` | `file_content:read` | 1 |
| `GET /v1/files/:key/meta` | name, thumbnail, editorType, last modified, creator, folder | `file_metadata:read` | 1 [unverified] |
| `GET /v1/images/:key?ids=&format=png|jpg|svg|pdf&scale=&use_absolute_bounds=` | `{images:{nodeId:url}}`; URLs expire (~30 days) | `file_content:read` | 1 [secondary] |
| `GET /v1/files/:key/components`, `/component_sets` | published components / sets: `key, node_id, name, description, containing_frame` | `library_content:read` | 3 [search: scopes page; tier unverified] |
| `GET /v1/files/:key/styles` | published style **metadata only**: `key, node_id, style_type (FILL/TEXT/EFFECT/GRID), name, description` – no colors or font values; follow up with `/v1/files/:key/nodes?ids=<node_id,...>` and read `fills` / `style` from the returned nodes | `library_content:read` | 3 |
| `GET /v1/files/:key/variables/local` | `variableCollections` + `variables` with `valuesByMode`, scopes, codeSyntax | `file_variables:read` | Enterprise full members only [search: https://developers.figma.com/docs/rest-api/variables-endpoints] |
| `GET /v1/me`, `GET /v1/files/:key/versions` | identity / version list | `current_user:read` / `file_versions:read` [unverified] | |

Practical: `ids` + `depth` keep the file call small (1M-node design systems time out otherwise); `GET /v1/files/:key` with `depth=1` lists pages, then `/nodes` per page or component. Non-Enterprise fallback for tokens: let the plugin main thread read variables locally from the open library file via `figma.variables.getLocalVariablesAsync()` and cache them in `figma.clientStorage` for the chat tab.

Rate limits (new scheme effective 2025-11-17): limits depend on the user's seat, the endpoint tier, and the resource's plan [search: https://developers.figma.com/docs/rest-api/rate-limits]. Help-center table: Dev/Full seats Tier 1 = 10/15/20 req/min on Starter/Pro/Org, Tier 2 = 25/50/100, Tier 3 = 50/100/150; View/Collab seats get ~6 Tier-1 requests per **month** [search: https://help.figma.com/hc/en-us/articles/34963238552855]. 429s carry `Retry-After`, `X-Figma-Plan-Tier`, `X-Figma-Rate-Limit-Type`; multi-day `Retry-After` values on paid plans are widely reported in 2026 [secondary: https://forum.figma.com/report-a-problem-6/rest-api-rate-limits-pro-plan-with-full-seat-still-getting-x-figma-rate-limit-type-low-and-multi-day-retry-after-51333]. Cache aggressively (`clientStorage`, keyed by file `version`) and show the seat/plan hint on 429.

---

## 4. Market analysis

Figma's own AI (Config 2026, June 24–25): upgraded Figma agent that builds reusable "skills" from prompts and connects to GitHub, Slack, Notion, Atlassian; Figma Make (closed beta May 28, 2026: chat edits, annotations, PR creation); First Draft, Replace content, Add interactions; user-promptable generative plugins and AI shaders (open beta, Full seat); Figma Motion; code layers; 20–30+ Weave image tools [secondary: https://analyticsindiamag.com/ai-news/figma-unveils-ai-agents-and-code-native-design-tools-at-config-2026, https://forum.figma.com/product-updates-3/everything-announced-at-config-2026-55221, https://six2eight.com/blog/figma-config-2026]. Gap: Figma's agent is generative and horizontal; it does not ship opinionated a11y/content/token *review* agents, is tied to Figma's model choice, and generative plugins are per-seat Figma AI, not BYOK.

| Space | Tool | What it does | Pricing (2026, conflicting sources) | Gap |
|---|---|---|---|---|
| A11y | Stark | WCAG contrast, vision sim, focus order, full-page audits, annotations | free tier; Premium ~$198/user/yr (others say ~$5/mo); Launch team $2,500/yr [secondary: https://toolradar.com/tools/stark/pricing, https://www.g2.com/products/stark-stark/pricing] | no LLM reasoning about context/alt text; expensive for teams |
| A11y | axe for Designers (Deque) | free AI-assisted contrast/label/target checks | free [secondary: https://muz.li/blog/best-figma-plugins-for-designers-in-2026/] | fundamentals only |
| A11y | Able, Contrast, A11y Color Contrast Checker, Include (eBay) | contrast / ARIA annotations | free | single-purpose |
| Attention / UX | Attention Insight | predictive heatmaps, clarity score | trial + paid [secondary: https://www.protopie.io/blog/best-figma-plugins] | not actionable per node |
| AI UX | UX Pilot | AI wireframes/UI + "UX review" | free + credits; Pro ~$29/mo [secondary: https://www.f22labs.com/blogs/15-best-figma-ai-plugins-for-ui-ux-designers/] | generation-first; no write-back |
| AI UI | Musho, Magician | generate UI, copy, icons | Magician free 20 uses/mo, Pro $8–12/mo [secondary: f22labs, https://blog.uxtweak.com/best-figma-plugins/] | not review |
| Automation | Automator | no-code action chains | free [unverified] | not AI |
| Lint | Design Lint (OSS), Roller | detect/fix unstyled fills/text; Roller fixes styles | free / freemium [unverified] | styles-centric, no variables, no multi-brand |
| Tokens | Tokens Studio | token management/sync | free; Pro ~$9–12/mo [secondary: f22labs, uxtweak] | authoring, not auditing |
| Content | Content Reel (Microsoft) | fill placeholders with realistic data | free; users report it currently crashes [secondary: https://www.figma.com/community/plugin/731627216655469013/content-reel] | fills, does not *find* lorem ipsum |
| Writing | Figma built-in spell check; Writer/Spellchecker-style plugins | spelling/grammar | built-in free [unverified for plugins] | no UX-writing voice/tone, no fixes written back |
| L10n | Lokalise, Crowdin, Phrase | push strings, pull translations, screenshots, pseudo-localization (Phrase works unauthenticated) | TMS subscriptions [secondary: https://lokalise.com/product/apps/design-tools/figma/, https://support.phrase.com/hc/en-us/articles/5709627523356, https://crowdin.khanacademy.org/blog/tag/figma] | need a TMS account; no overflow analysis |
| L10n | figma-static-localizer (OSS) | dictionary swap, RTL, font substitution [secondary: https://github.com/thoughteer/figma-static-localizer] | free | manual |

**Prioritized differentiators for Bluebird**

1. Findings written back as Dev Mode `annotations` (category per agent) plus an optional on-canvas report frame, with "jump to node" via `scrollAndZoomIntoView`.
2. One-click fixes: rebind raw colors/spacing to the nearest library variable (`importVariableByKeyAsync` + `setBoundVariableForPaint`), replace placeholder text, apply spelling/UX-writing corrections with mixed-style preservation.
3. Multi-brand awareness: resolve tokens per collection/mode and check the selection against the *selected* brand mode.
4. Provider-agnostic BYOK with runtime model lists (`/v1/models`, `/v1beta/models`) and per-agent model tiers (cheap model for spelling/placeholders, strong model for a11y/UX writing).
5. Library-grounded chat: answers cite component/style names and keys from REST data, with file-version caching to respect rate limits.
6. Deterministic pre-checks before the LLM (contrast math, target size, `textTruncation`, missing `fillStyleId`/`boundVariables`, regex lorem-ipsum) so AI only explains and prioritizes; lowers cost and false positives.
7. Pseudo-localization preview per language (expansion tables below) using real `textAutoResize`/`maxLines` to predict overflow, plus RTL mirroring report.
8. Structured JSON output per provider (`output_config.format` / `json_schema` / `responseSchema`) with schema validation and node-id round-tripping.
9. Review scoping: selection, page, or published components only; incremental re-run on `selectionchange`.
10. Severity + WCAG/criterion mapping and exportable report (annotations, frame, Markdown).
11. Privacy controls: strip text content option, send only node metadata; keys in `figma.clientStorage` never in document `pluginData`.
12. Detached-instance detection combining `detachedInfo` with name/structure heuristics.

**Pitfalls**: LLM false positives on contrast and target size (compute locally, let the model only comment); `loadFontAsync` failures for missing/variable fonts and `figma.mixed` collapsing styles; Figma REST 429s with day-long `Retry-After`; provider 429/overload (529) needing backoff and provider fallback; CORS surprises (OpenAI unverified; Gemini key referrer restrictions); `max_tokens` too low truncating JSON (check `stop_reason`/`finish_reason`); dynamic-page async migration; `error:true` notifications never closing; API keys must live in `clientStorage` (per user, per machine) and never in `setPluginData`/shared storage; 2.5-generation Gemini IDs disappearing on 2026-10-16.

---

## 5. Pseudo-localization expansion factors and RTL

W3C "Text size in translation" (figures attributed to IBM's design guidelines; translated length as % of English) [search: https://www.w3.org/International/articles/article-text-size/]:

| English length (chars) | Expected translated length |
|---|---|
| up to 10 | 200–300% |
| 11–20 | 180–200% |
| 21–30 | 160–180% |
| 31–50 | 140–160% |
| 51–70 | 151–170% as printed on the W3C page (likely a typo for 130–150%; verify) |
| over 70 | 130% |

Per-language averages (secondary, vary by source): German +10–35% (often quoted as ~+30%), French +15–25%, Arabic about +20–25% in most tables, though some sources list Arabic as shrinking 20–30% [secondary: https://simplelocalize.io/tools/text-expansion-calculator/, https://www.globalizationpartners.com/?p=91379, https://designinternet-qaeusw1green.americanexpress.com/guidelines/internationalization/localization, https://sbarnea.com/p/statistics-regarding-localized-text/]. Buttons/labels (2 words) can grow 50–100% while paragraphs grow 10–15% [secondary: https://simplelocalize.io/blog/posts/text-expansion-ui-localization/]. Practical rule for the agent: pad by the W3C bucket for the string length, then apply the language factor; flag any `textAutoResize:"NONE"` node, `maxLines` node or fixed-width auto-layout child whose padded width exceeds its box.

Pseudo-locale practice: Android `en-XA` (expanded accented Latin) and `ar-XB` (RTL) [secondary: https://www.globalizationpartners.com/?p=91379]; Microsoft `qps-ploc` (expanded), `qps-plocm` (mirrored RTL), `qps-ploca` [unverified: https://learn.microsoft.com/en-us/globalization/methodology/pseudolocalization]; Google's "fakebidi" adds Unicode RTL marks so English reads as RTL for layout testing, because `dir="rtl"` on English text produces false alarms [https://opensource.googleblog.com/2011/06/pseudolocalization-to-catch-i18n-errors.html]. Pseudo text should keep BiDi cases such as numbers embedded in RTL strings and carry resource IDs [https://learn.microsoft.com/en-us/archive/blogs/mohamedg/pseudo-localization].

RTL considerations for the agent: mirror layout direction (auto-layout `HORIZONTAL` order, alignment start/end), mirror directional icons (back/forward, progress) but not logos, clocks, media controls or checkmarks; numbers and Latin product names stay LTR inside RTL runs; punctuation and brackets must use bidi-aware rendering; Arabic/Hebrew need fallback fonts (Phrase's pseudo-translate requires two installed fonts for Arabic/Asian) [https://support.phrase.com/hc/en-us/articles/5709627523356]; Arabic glyphs are taller, so check line height and `maxLines` clipping, not only width.
