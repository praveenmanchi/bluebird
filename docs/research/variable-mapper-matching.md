# Variable Mapper: accurate matching logic

Researched and built 2026-11-06. Tested on `naqp6r4h5V4KUgTTmwe9U5` (1,633 variables). The logic below is in `src/features/varmapper`; "Not built yet" lists what isn't.

## Short answer

**We can't call Figma's Check designs.** It has no API. The help page and developer docs don't mention one, and `@figma/plugin-typings` 1.142.0 (the latest) has no lint or check symbol. It also needs an Organization or Enterprise plan, and it runs on one page at a time.

**We can copy how it works, and the Plugin API exposes what we need.** Figma says Check designs uses no AI. It ranks by value similarity, variable naming and hierarchy, and usage. It only labels a row "Match" when the value is exactly equal. The Mapper can do all of this and go further, because it can check every bind after writing it.

**Accuracy is two separate problems:**

| Question | Can it be certain? | How |
|---|---|---|
| Will this variable keep the layer looking the same? | Yes, always | Compare in the layer's active mode, then read back after binding |
| Is this the variable the designer meant? | No, only likely | Rank by context, show confidence, let the designer confirm |

The second problem is the larger one. On average **25 variables share the exact same value** as any given layer. `#FFFFFF` on text has 63 candidates in this file. Value alone can't choose between them.

## What the test found

### The current logic can change how a design looks

`match.ts` scores a variable by its best value in **any** mode, so a match in another brand counts as exact. Of 41 values the Login page calls exact, 7 would change colour if bound:

| Layer | Hard-coded | Recommended | Matched in | Value it would really get |
|---|---|---|---|---|
| Title | `#FFFFFF` | `Background` | Ikea | `#333333` |
| Login (frame) | `#FAFAFA` | `surface/overlay` | AkzoNobel | `#383838` at 77% |

### Ranking is close to random on some pages

Method: take properties that designers already bound, treat each as hard-coded, and check whether the ranker picks the variable they chose. Accessibility and Jira were not used to tune anything.

| Accessibility + Jira, 2,484 properties | Right first pick | Right in top 3 |
|---|---|---|
| Random pick | 7% | n/a |
| Current rules | 16% | 30% |
| Value + name + layer path | 39% | 69% |
| **Plus neighbouring bound layers** | **86%** | **92%** |

The last row was re-run with the shipped `match.ts` and `rank.ts`, bundled and run inside Figma: 2,140 and 2,294 of 2,484.

Molecules, used for tuning, reached 89% first pick (current rules 2%). 4% of the current rules' first picks on the two unseen pages would change the value, and 6% across all three pages.

### Confidence can be measured

The gap between the first and second candidate's score predicts whether the pick is right. From the shipped code, on the same 2,484 properties:

| Label | Share of properties | Right first pick |
|---|---|---|
| Exact | 68% | 93% |
| Check | 32% | 72% |

### Other findings

- **Usage must stay a tie-breaker.** Weighting page-wide usage heavily dropped Molecules from 41% to 9%, because popular variables beat the right one. Local usage among neighbours is what helps.
- **`inferredVariables` works differently from its docs.** The docs and typings say it returns a variable only when exactly one matches. In practice it returned up to 78, and it includes variables from other libraries. It's still useful as Figma's own check of value equality.
- **"Prefer Semantics" doesn't match real usage.** All 231 bound properties counted on Login use Brand UI. Semantics has one mode, so binding it wouldn't follow a brand switch.
- **Skipping instances cost nothing on Login.** All 21 overridden paints were already bound, so this is low priority.

## The logic

### 1. Collect, per layer

Read every bindable field and capture the context the rest depends on:

- the field and its correct scope
- the active mode per collection, from `node.resolvedVariableModes`
- layer name and ancestor names
- which variables nearby layers already use

### 2. Gate: rules that are never traded off

A candidate must pass all of these to be called **Exact**:

1. Same type as the field.
2. Scope allows this field and this node type.
3. Value is identical **in the layer's active mode**, through the full alias chain, including alpha.
4. It belongs to the chosen Dual File source and can be imported.
5. It isn't a colour primitive, when the source has anything else. That means a raw, single-mode colour, or a name starting with a mode (`akzonobel/color/…`). These never follow a brand switch, and they are often the only "exact" colour: `#FAFAFA` matched only `akzonobel/color/neutral/50`.

When a layer has no mode for a collection, use that collection's default mode, which is what Figma does.

### 3. Rank what passed

```
score = name score + neighbour score

name score
  +3  name fits the role (text fill: fg/text, stroke: border, gap: gap/space)
  -3  a state word the layer doesn't carry (hover, disabled, error)
  +2  per word shared with the layer or its nearest ancestors, capped at 4 hits
  +0.5 name includes "default"
  -0.05 per word in the name

neighbour score, from the nearest ancestor with 3+ other bindings
  +6  x share of neighbours in the same first name segment  (jira/)
  +6  x share in the same first two segments                (jira/surface/)
  +3  x log2(1 + times this variable has this role nearby)
```

Library Analytics usage is only worth adding as a final tie-breaker. It needs Enterprise and the `library_analytics:read` scope.

### 4. Label

| Label | Meaning | Bind all? |
|---|---|---|
| Exact | Passed the gate, high confidence | Yes |
| Check | Passed the gate, medium or low confidence | Only after a designer picks a variable |
| Near | Value will change, shown as old → new | No, row button says Change value |
| No match | Nothing suitable | Nothing to bind |

High confidence needs a score gap of 4 or more, and the top candidate must score at least 2. A lone candidate has no gap to measure, so without the score check any single match would count as high confidence.

Near must never count as a match. It's a design change, so the row has to say so.

### 5. Bind, then prove it

1. Confirm the layer still holds the checked value (this exists today).
2. Bind.
3. Read back the rendered value and `variable.resolveForConsumer(node)`.
4. If an Exact bind changed the value, restore that layer and report it as skipped.

This is what makes value accuracy a guarantee, because it catches anything the earlier steps missed.

## How Figma behaves

Tested on a temporary frame, since removed:

- Binding a colour variable replaces the paint's opacity with the variable's alpha. A paint at 50% bound to an opaque variable renders at 100%, so opacity is compared with the variable's alpha and nothing double-counts.
- `node.fills` and number fields read back the rendered value straight after binding, so the read-back needs no `resolveForConsumer`.
- `resolvedVariableModes` lists collection ids, which `getVariableCollectionByIdAsync` turns into names. A collection it doesn't list uses its default mode.

## Grouping

Rows are split by property, value and mode. Only an Exact recommendation splits them further, by variable. Splitting Check or Near rows on a guess gave look-alike rows: `Font weight 500` showed three times.

## Not built yet

| Item | Why it's left |
|---|---|
| Font family | The first non-number, non-colour value: needs a string path through matching and bind |
| Effects, and mixed text through `getStyledTextSegments` | Different bind calls, and rows need design |
| Text styles | Check designs suggests them, and a full style match beats binding size and line height one at a time. Needs design |
| Repeatable benchmark script | It runs inside Figma, so it needs a dev-only way to load it. The one used here was a throwaway bundle |
| Alias resolving per collection in [normalize.ts](../../src/shared/libraries/normalize.ts) | Right for this file. A single-mode collection aliasing a multi-mode one would show the default value, and the read-back would catch it |
| Library Analytics tie-breaker | Needs Enterprise and `library_analytics:read` |

## Real check: a fully hard-coded frame

Page header on Login, under these rules: 66 values, active mode Bridge, no bound neighbours.

| Label | Values |
|---|---|
| Exact | 1 |
| Check | 28 |
| Near | 30 |
| No match | 7 |

This is the worst case for the ranker, so few rows reach Exact and most need a designer. It's the data shown on the Figma screens. The Near and Check candidates are far better than before: `#FAFAFA` now suggests `login/text/body`, not `text/secondary`.

## Limits of these numbers

- **86% needs neighbours.** A fully hard-coded frame falls back to name and path: 39% first pick, 69% in the top 3. That's the case to design the Medium and Low rows around.
- **One file.** It has unusually clear names (`jira/…`, `a11y/…`) and repeats screens per brand, which helps. Client files could score lower, so thresholds should be rechecked on one.
- **The "right answer" is the designer's past choice.** Some misses are equally valid or a leftover name, such as `Background` against `a11y/surface/panel`, or the misspelt `Boader`.
- **The "Current rules" row was re-created in a test script.** The old `match.ts` itself wasn't run, though the rules are the same.
- **Not yet run through a real bind from the plugin.** The read-back is unit-tested against Figma's measured behaviour.

## Still to test

- How `resolvedVariableModes` reports a library collection in a consuming file. This file holds its own variables, so that path hasn't run.
- Non-Enterprise files. The REST variables endpoints are Enterprise only, and the Plugin API's library list has no values (`name`, `key`, `resolvedType` only), so values would need `importVariableByKeyAsync`.
- A client file, to recheck the thresholds.

## Sources

- [Check designs in Figma](https://help.figma.com/hc/en-us/articles/39592284074263-Check-designs-in-Figma)
- [Check designs launch post](https://forum.figma.com/product-updates-3/check-designs-catch-what-s-off-ship-what-s-right-54551)
- [Figma staff on suggestion scope](https://forum.figma.com/report-a-problem-6/why-is-a-variable-not-in-the-file-being-suggested-in-check-design-56216)
- [Variable](https://developers.figma.com/docs/plugins/api/Variable/), [resolveForConsumer](https://developers.figma.com/docs/plugins/api/properties/Variable-resolveforconsumer/), [VariableScope](https://developers.figma.com/docs/plugins/api/VariableScope/)
- [inferredVariables](https://developers.figma.com/docs/plugins/api/properties/nodes-inferredvariables/), [resolvedVariableModes](https://developers.figma.com/docs/plugins/api/properties/nodes-resolvedvariablemodes/), [boundVariables](https://developers.figma.com/docs/plugins/api/properties/nodes-boundvariables/)
- [Working with Variables](https://developers.figma.com/docs/plugins/working-with-variables/)
- [Variables REST endpoints](https://developers.figma.com/docs/rest-api/variables-endpoints/), [Library analytics endpoints](https://developers.figma.com/docs/rest-api/library-analytics-endpoints/)
