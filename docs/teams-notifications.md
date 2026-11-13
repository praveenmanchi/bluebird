# Teams notifications

What Bluebird posts to a Teams channel, and what a Power Automate flow has to do with it.
The code is `src/shared/integrations/webhooks.ts` (where a post may go) and
`src/shared/integrations/card.ts` (what it says).

## Who posts

| Tab | When | `kind` | Table |
|---|---|---|---|
| Publish | "Post the changelog to Teams" ticked, after the release lands | `release` | the changes the release includes |
| Extraction | Design system / Dev team ticked on push | `extraction` | the variable changes pushed |
| History | A changelog sent for review | none (plain card) | none |

The webhook URLs live in Settings › Notifications. They are per-person secrets
(`SECRET_FIELDS`), so there is no central rollout: every designer pastes their own.

## Allowed hosts

`*.webhook.office.com` (classic Incoming Webhook connectors), `*.logic.azure.com`
(Power Automate flows created before 30 Nov 2025) and `*.environment.api.powerplatform.com`
(flows created since). The manifest's `allowedDomains` lists the same three.

New Power Platform URLs carry an explicit `:443`. `normalizeWebhook()` strips it at the
fetch, so the request Figma sees has a plain host. It is applied at the fetch, not when
Settings is read: Extraction labels the channel "Dev team" or "Design system" by comparing
the URL with the saved setting, and normalising earlier would mislabel every post.

## The trigger must allow anonymous callers

Set **Who can trigger the flow?** to **Anyone**. The URL then ends `&sig=…`, and the
signature is the only credential. A trigger set to **Any user in my tenant** answers
`401 DirectApiAuthorizationRequired`: it needs an Entra token, which needs a client secret,
which cannot live in a plugin bundle.

## The payload

A MessageCard. `title` and `text` come first and are finished prose, so a classic connector
or a flow that hasn't been restyled still shows something. Every key after them is discrete.

```json
{
  "@type": "MessageCard",
  "@context": "https://schema.org/extensions",
  "summary": "Praveen Manchi pushed an extraction to gapinc/design-tokens · tokens/update",
  "title": "Praveen Manchi pushed an extraction to gapinc/design-tokens · tokens/update",
  "text": "chore(tokens): …\n\n8 variables changed: 3 added, 3 modified, 2 removed.\n\n…\n\nOpen pull request: https://github.com/gapinc/design-tokens/pull/42",
  "themeColor": "D64045",
  "kind": "extraction",
  "actor": "Praveen Manchi",
  "repo": "gapinc/design-tokens",
  "ref": "tokens/update",
  "added": 3, "modified": 3, "removed": 2,
  "breaking": 1,
  "impacted": ["Button", "Chip", "Banner"],
  "notify": "channel",
  "changes": [
    { "name": "button/bg/primary", "kind": "removed", "from": "#0C8CE9", "to": "—",
      "usedIn": "Button, Chip, Banner", "breaking": true }
  ],
  "changesShown": 3,
  "changesTotal": 8,
  "link": "https://github.com/gapinc/design-tokens/pull/42",
  "linkLabel": "Open pull request"
}
```

| Key | Notes |
|---|---|
| `themeColor` | `D64045` when anything breaks, else `0C8CE9`. |
| `kind` | `extraction` or `release`, so one flow can serve both tabs. Absent on the plain History card. |
| `actor` | Display name only, no email. Omitted when unknown (Publish doesn't know who published). |
| `ref` | The branch pushed to, or the release version. |
| `breaking` | How many changes break consumers (removals and renames). |
| `notify` | `channel` when `breaking > 0`, else `none`. The flow decides what tagging means. |
| `changes[].from` / `to` | `—` for a side that doesn't exist (an added variable has no `from`). When the modes moved by different values there is no single pair, so both are `—`; don't try to reconstruct one. |
| `changes[].usedIn` | Already joined with `, `; `—` when nothing uses it. No `join()` needed. |
| `changes` | At most 15 rows (`MAX_CARD_CHANGES`), breaking rows first, so the cap never hides one. Use `changesShown` / `changesTotal` for "…and N more". |
| `changes`, `changesShown`, `changesTotal` | Omitted entirely when there is nothing to tabulate. The flow must tolerate their absence. |
| `link`, `linkLabel` | Omitted when there is no link. The link is also the last paragraph of `text`. |

Renaming a key breaks every flow built on it. `src/shared/integrations/card.test.ts` and the
Teams tests in `src/features/publish/__tests__/github.test.ts` pin the contract.

## What Teams renders

From posts to a live channel on 14 Nov 2026:

| Feature | Result |
|---|---|
| Adaptive Cards 1.5, including `Table` | renders |
| `backgroundImage` on a `bleed` Container | renders; the title stays real text over the image |
| base64 `data:` URI images | render |
| Table columns 6 : 3 : 4 | fit |
| Four roughly equal columns | wrap ("Change" breaks to "Chan/ge") |
| `bleed` | left and right only; add `"spacing": "None"` to close the top gap (not confirmed) |
| MessageCard `potentialAction` buttons | dropped silently, so Bluebird no longer sends them |
| MessageCard `[label](url)` | printed with the brackets, so the link is a bare URL |
| `msteams.entities` mentions | plain text, no tag, for a user, channel or everyone |

Teams appends its own footer, "&lt;name&gt; used a Workflow template to send this card",
naming the flow's owner. The card cannot remove it.

The largest card posted was 14.7 KB, 8.4 KB of it the logo. The payload ceiling is commonly
given as about 28 KB but has not been confirmed.

Measured offline, not posted: a worst-case payload (15 rows of 90-character names, six long
component names in each `usedIn`, 80 impacted components, a 40-entry changelog) is 18.9 KB,
of which the table is 7 KB and `text` 7.8 KB. `text` is not capped: Publish puts the whole
changelog section in it, so a large release sent to a classic Incoming Webhook could pass the
ceiling before a flow ever sees it. A flow card that leaves out `text` and keeps the 15 rows
plus the 8.4 KB logo should land around 20 KB.

## Building the flow

1. Trigger: **When a Teams webhook request is received**, *Who can trigger* = **Anyone**.
2. **Parse JSON** with a schema generated from the sample payload above. Mark `changes`,
   `changesShown`, `changesTotal`, `actor`, `link` and `linkLabel` as not required.
3. **Select** from `coalesce(body('Parse_JSON')?['changes'], json('[]'))` mapping each item
   to a `TableRow` (below), then put `@{body('Select')}` into the card's `rows`.
4. Breaking banner: a **Condition** on `breaking` greater than 0. Adaptive Cards can't
   compute a Container `style` from a value, so the flow posts one of two cards.
5. Tagging: a **Condition** on `notify` equal to `channel`.
   - `@channel` / `@team`: the mention option on **Post card in a chat or channel**.
   - A named person: **Get an @mention token for a user** needs an email, and `actor` is a
     display name. That needs either an email field per person in Settings › Notifications
     or an Entra lookup by display name, which breaks on duplicate names.
6. Banner assets: a flat `#0048b7` PNG as the `backgroundImage` (98 bytes) and the logo
   exported from the Figma file at 4× as a base64 `Image`. Export the logo from the file;
   pasting a 7 KB base64 string through a chat truncates it silently.

### Card template

```json
{
  "type": "AdaptiveCard",
  "$schema": "http://adaptivecards.io/schemas/adaptive-card.json",
  "version": "1.5",
  "msteams": { "width": "Full" },
  "body": [
    {
      "type": "Container", "bleed": true, "spacing": "None",
      "backgroundImage": { "url": "data:image/png;base64,…", "fillMode": "Repeat" },
      "items": [{ "type": "TextBlock", "text": "@{body('Parse_JSON')?['title']}", "wrap": true, "weight": "Bolder", "size": "Medium", "color": "Light" }]
    },
    {
      "type": "FactSet",
      "facts": [
        { "title": "Repository", "value": "@{body('Parse_JSON')?['repo']} · @{body('Parse_JSON')?['ref']}" },
        { "title": "Changes", "value": "@{body('Parse_JSON')?['added']} added, @{body('Parse_JSON')?['modified']} modified, @{body('Parse_JSON')?['removed']} removed" },
        { "title": "Breaking", "value": "@{body('Parse_JSON')?['breaking']}" }
      ]
    },
    {
      "type": "Table", "firstRowAsHeaders": true, "showGridLines": false,
      "columns": [{ "width": 6 }, { "width": 3 }, { "width": 4 }],
      "rows": "@{body('Select')}"
    }
  ],
  "actions": [{ "type": "Action.OpenUrl", "title": "@{body('Parse_JSON')?['linkLabel']}", "url": "@{body('Parse_JSON')?['link']}" }]
}
```

`rows` needs a header row first: prepend
`{ "type": "TableRow", "cells": [Variable, Change, Used in] }` with `union()`, or switch
`firstRowAsHeaders` off. Each row the Select maps:

```json
{
  "type": "TableRow",
  "cells": [
    { "type": "TableCell", "items": [
      { "type": "TextBlock", "text": "@{item()?['name']}", "wrap": true },
      { "type": "TextBlock", "text": "@{item()?['from']} → @{item()?['to']}", "isSubtle": true, "size": "Small", "spacing": "None", "wrap": true }
    ] },
    { "type": "TableCell", "items": [{ "type": "TextBlock", "text": "@{item()?['kind']}", "wrap": true }] },
    { "type": "TableCell", "items": [{ "type": "TextBlock", "text": "@{item()?['usedIn']}", "wrap": true, "size": "Small" }] }
  ]
}
```

The Figma kit for these cards is file `fOEaptO1fzQsMYPpeuP7LJ` ("UI"), Page 1. Its
`Style=…` and `Color=…` variant names are the Figma → Adaptive Card conversion contract.
"Powered by" is drawn at 8 pt, but the smallest Adaptive Card size is `Small` (12 px), so it
renders about 50% larger than designed.

## Not verified

- Nothing has run inside the Figma sandbox yet. Node ignores `manifest.json`, so the new
  `allowedDomains` entry and the `:443` stripping are reasoning about Figma's allowlist, not
  an observation. To check: rebuild, reload the plugin, paste a Power Platform URL into
  Settings › Notifications and push one real extraction. A failure shows up as a
  network-access error at the fetch.
- The payload ceiling (see above).
- Whether `"spacing": "None"` closes the banner's top gap.
