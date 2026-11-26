# Bentley Systems — brand UI audit

Audited 2026-11-25 by agent-hyundai-bentley-siemens. Scope: Bentley Systems, the infrastructure-software company (not Bentley Motors). Sources: the open-source **iTwinUI** design system and bentley.com.

## Summary
- Bentley's product UI is **iTwinUI v3**: `@itwin/itwinui-react` 3.22.1 with `@itwin/itwinui-variables` 3.3.1. Its accent is the informational blue **`#0071B8`** (hover `#00568F`). The "call to action" button variant is green, **`#157E11`**.
- Shapes are flat and engineering-tool dense. **Every component uses a 4px radius**; only tags are pills. Fields have a mid-grey 1px border (`#8F8F8F`). Pages sit on a `#EEF0F1` backdrop with white surfaces.
- iTwinUI's own font is **Noto Sans**, so the current Bluebird placeholder already matches. Buttons use **regular weight (400)**, 14px text and a 36px default height.
- **Brand drift to know about:** bentley.com and Bentley's next-generation system **StrataKit** (`@stratakit/foundations` 1.2.0) have moved to a teal-green accent, "aurora" **`#198166` / `#156B54`**, with the Inter font and 4/8/12px radii. bentley.com's primary call to action is **near-black** (`#090A0B`).
- Neither `#0033A0` nor `#0071E3` (the current Figma values) appears in iTwinUI, StrataKit or bentley.com.

## Proposed tokens (iTwinUI v3, light theme)
```json
{
  "id": "bentleysystems",
  "theme": "light",
  "colors": { "primary": "#0071B8", "primaryHover": "#00568F", "primaryActive": "#00568F", "secondary": "#156B54", "accent": ["#198166", "#157E11", "#008AE0"], "link": "#0071B8", "focusRing": "#0071B8",
              "headerBg": "#FFFFFF", "headerText": "#242424", "pageBg": "#EEF0F1", "surface": "#FFFFFF", "border": "#C4CBCF", "textPrimary": "#242424", "textSecondary": "#595959", "textDisabled": "#A1A1A1",
              "success": "#157E11", "warning": "#8F6400", "error": "#C52B26", "info": "#0071B8",
              "neutralRamp": { "0": "#FFFFFF", "25": "#FBFBFC", "50": "#F7F8F8", "100": "#EEF0F1", "150": "#E6E9EA", "200": "#DDE1E3", "300": "#C4CBCF", "350": "#B3BCC1", "400": "#A1A1A1", "500": "#8F8F8F", "550": "#747474", "600": "#6B6B6B", "700": "#595959", "800": "#363636", "900": "#242424", "950": "#121212" } },
  "typography": { "uiFamily": "Noto Sans", "displayFamily": "Noto Sans", "monoFamily": "Noto Sans Mono", "proprietary": false, "googleFallbackUi": "Noto Sans", "googleFallbackDisplay": "Noto Sans",
                  "bodySize": 14, "bodyLineHeight": 21, "weights": { "regular": 400, "medium": 600, "semibold": 600, "bold": 700 }, "headingScale": [32, 24, 18, 16, 14, 12] },
  "radius": { "button": 4, "input": 4, "card": 4, "chip": 9999, "modal": 4 },
  "button": { "height": { "sm": 24, "md": 36, "lg": 48 }, "paddingX": 16, "minWidth": null, "fontSize": 14, "fontWeight": 400, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#0071B8", "text": "#FFFFFF", "hoverBg": "#00568F", "activeBg": "#00568F", "disabledBg": "#DDE1E3", "disabledText": "#A1A1A1" },
              "secondary": { "bg": "#FFFFFF", "text": "#242424", "border": "#8F8F8F", "hoverBg": "#F7F8F8" },
              "ghost": { "text": "#242424", "hoverBg": "#F0F0F0" },
              "focus": { "style": "solid outline", "width": 2, "offset": 1, "color": "#0071B8" } },
  "input": { "height": 36, "border": "#8F8F8F", "borderWidth": 1, "radius": 4, "placeholder": "#747474", "focusBorder": "#0071B8", "errorBorder": "#DB0A0A" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 4, "itemHeight": 36, "itemHoverBg": "#F7F8F8", "itemSelectedBg": "#E4F3FC", "itemSelectedText": "#0071B8", "shadow": "0 1px 10px rgba(0,0,0,0.25)" },
  "tabs": { "style": "underline", "activeIndicator": "#0071B8", "activeText": "#0071B8" },
  "elevation": { "card": "0 1px 5px rgba(0,0,0,0.25)", "menu": "0 1px 10px rgba(0,0,0,0.25)", "modal": "0 9px 46px rgba(0,0,0,0.25)" },
  "spacingBase": 4,
  "iconStyle": "@itwin/itwinui-icons — mostly solid 16px glyphs"
}
```

### iTwinUI component measurements
Measured by rendering the published `styles.css` in a local Chromium harness, light and dark themes.
| Item | Light | Dark |
|---|---|---|
| High-visibility (primary) button | `#0071B8` background and border, white text, 36px tall, padding 4px 16px, radius 4, 14px/400 | same `#0071B8`; hover `#008EE0` (token) |
| Call-to-action button | `#157E11`, hover `#0D610A` (token) | `#157E11`, hover `#1E991A` |
| Default (secondary) button | white, text `#242424`, border `1px #8F8F8F`, hover border `#6B6B6B` (token) | `#333C41`, text `#DBDBDB`, border `#707070` |
| Borderless (ghost) button | transparent, padding 4px 8px, hover `rgba(0,0,0,0.06)` | hover `rgba(255,255,255,0.065)` |
| Sizes | small 24px (padding 0 8, 12px text), default 36px, large 48px (padding 8 24, 16px text) | — |
| Disabled | `#DDE1E3` background, `#A1A1A1` text and border | `#1D2225` background, `#828282` text |
| Focus | outline `2px solid #0071B8`, offset 1px; fields use offset -2px | `#94BEFA` |
| Input | 36px, padding 4px 12px, `1px #8F8F8F`, radius 4; placeholder `#747474` at weight 300 | `#333C41` background, border `#707070` |
| Input error | bottom border `2px #DB0A0A` | `#F9A9A9` |
| Link (anchor) | `#0071B8`, underlined on hover | `#94BEFA` |
| Surface / card | white, `1px #C4CBCF`, radius 4, shadow-1 `0 1px 5px rgba(0,0,0,0.25)` | `#333C41`, border `#49555D`, shadow alpha 0.45 |
| Page backdrop | `#EEF0F1` | `#242B2E` |
| Menu | white, `1px #B3BCC1`, radius 4, shadow-2 | — |
| Tabs | 2px stripe (`--iui-size-3xs`) in accent; selected text `#0071B8` | — |
| Tag | 36px pill, `1px #8F8F8F` | — |
| Dialog | radius 4, shadow-5 `0 9px 46px`, `1px` border | — |

Token names used: `--iui-color-background-accent`, `--iui-color-background-informational(-hover|-muted)`, `--iui-color-border-foreground`, `--iui-color-text(-muted|-placeholder|-disabled)`, `--iui-component-height(-small|-large)` (24/36/48), `--iui-border-radius-1` (4px), `--iui-font-sans`, `--iui-shadow-1…5`.
Status, light theme (background / text): positive `#157E11` / `#157E11`, warning `#8F6400` / `#7A4606`, negative `#C52B26` / `#DB0A0A`, informational `#0071B8`. Muted backgrounds: `#E7F4E6`, `#F9F1E6`, `#FFEBEB`, `#E4F3FC`.
Type scale (`--iui-font-size-0…5`): 12, 14, 16, 18, 24, 32. Weights 300, 400, 600, 700; there is no 500, so "medium" maps to 600.

### bentley.com and StrataKit (the direction the brand is heading)
| | bentley.com (live) | StrataKit 1.2.0 (npm) |
|---|---|---|
| Accent | "aurora": `--color-bg-accent-base #198166`; text, border and focus ring `#156B54`; nav highlight `#156B54` (3px bar) | `--stratakit-color-bg-accent-base` oklch(54% .1 170) = `#188166`; strong `#146B54` |
| Font | "Inter Web"; mono "JetBrains Mono" | "InterVariable", "Noto Sans"; mono "IBM Plex Mono" |
| Radius | buttons and inputs 4, cards 8–12, pills 9999 | sm 4 / md 8 / lg 12 |
| Primary CTA | `btn--primary-black`: `#090A0B`, white text, 48px, padding 4px 32px, radius 4, 16px/400; on the hero `btn--primary-white` `#FBFCFD` with `1px #CED1D5` border | — |
| Neutrals | page `#FBFCFD`, surface `#FFFFFF`, text `#111213` / `#474C53` / `#6B737D`, disabled `#ACB1B7`, borders `#D4D7DA` / `#E1E3E6` | page dark `#1F2023`, light `#FBFCFD` |
| Status | positive `#228403`, attention `#9A6803`, severe `#C74801`, critical `#DF1B41`, info `#0570DD` | similar hues in oklch |
| Header | white floating bar, 60px, radius 12 inside a 16px gutter; nav items 15px/500 | — |
| Theme | light, with a `data-theme="system"` dark set | the README's example uses `colorScheme="dark"`; dark-first |

**Recommendation.** Use iTwinUI blue `#0071B8` as Bluebird's interactive primary: it is what Bentley's shipped iTwin products use today. Carry the brand's aurora green `#156B54` as `secondary` (badges, highlights, persona accent). If Bentley says they have adopted StrataKit, swap the primary to `#198166` (hover `#156B54`), the font to Inter, and card radius to 8.

## Theme and logo
- iTwinUI's default is light (`data-iui-theme="light"`), and dark is fully supported. Many iTwin viewers and StrataKit run dark. Proposed Bluebird banner: white (`#FFFFFF`) with `#242424` text, matching the iTwinUI header. An alternative is near-black `#111213` with the aurora 3px highlight, matching bentley.com in dark mode.
- Logo: black "Bentley" wordmark with a ® on light backgrounds (bentley.com header). No reversed/white rule or clear-space rule was found publicly, so it is not verified. Use a white wordmark on dark banners only if Bentley's brand team confirms.

## Not verified
- iTwinUI pressed/active colour: there is no separate pressed token; hover is reused.
- iTwinUI hover was not captured in the static harness. The hover values above come from tokens.
- Menu item height (36) and selected-item colours are inferred from list-item CSS and the component height. Medium confidence.
- Bentley logo usage rules.

## Sources
- https://www.npmjs.com/package/@itwin/itwinui-variables (3.3.1, `index.css`) — design-system tokens: colours, sizes, fonts, shadows, light/dark/high-contrast. Confidence **high**.
- https://www.npmjs.com/package/@itwin/itwinui-react (3.22.1, `styles.css`) — component CSS, measured in a local Chromium harness for buttons, inputs, anchor, surface, menu, tabs, tag, dialog. **High**.
- https://github.com/iTwin/iTwinUI — source repository of the above. **High**.
- https://itwinui.bentley.com/docs/button — docs site (dark theme; demos not reachable by DOM query, so not measured). **Medium**.
- https://www.npmjs.com/package/@stratakit/foundations (1.2.0) — next-generation tokens (accent, Inter, radii). **High** for values; **medium** for how widely it is adopted.
- https://www.bentley.com/ and https://www.bentley.com/software/microstation/ — live computed style and CSS variables (`--aurora-*`, `--gray-*`, `--color-*`, buttons, header, inputs). **High**.

## Differs from current Figma
| | Figma now | Proposed | Note |
|---|---|---|---|
| primary | `#0033A0` | `#0071B8` | `#0033A0` is not in any Bentley source checked. `#0071B8` is iTwinUI's accent. |
| secondary | `#0071E3` | `#156B54` | `#0071E3` is close to Apple's link blue, not Bentley's. Aurora green is Bentley's current brand accent (bentley.com, StrataKit). |
| font | Noto Sans | Noto Sans (iTwinUI); Inter if StrataKit | Already correct for iTwinUI. |
| radius | AkzoNobel copy | 4px everywhere, pill tags | |
| button | — | 36px, regular weight, 1px border | |
