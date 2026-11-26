# Vanguard — brand UI audit

Audited 2026-11-25 (agent-vanguard-optum-anthropic). investor.vanguard.com and corporate.vanguard.com loaded normally in headless Chromium. Most values are **live computed styles**, plus the shipped CSS of Vanguard's internal design system **Constellation** (`c11n-*` classes and `c11n-web-v1-*` web components). Constellation has no public docs site or npm package (design.vanguard.com does not resolve), so component specs below are read from the production CSS (~965 KB captured).

## Summary
- Light, white UI with **near-black `#040505`** for text, the secondary CTA and outlines, and **Vanguard red `#C20029`** kept for the primary CTA ("Log in", "Open an account", "Buy").
- **Pill buttons, square everything else.** Buttons have a 2rem/80px radius and a 2px border. Inputs, selects, cards and menus have 0 radius.
- Buttons **invert on hover**: red or black fills turn white with a black border and black text, and outline buttons fill black.
- Proprietary geometric **FF Mark** (400/700/800/900) everywhere. Headlines are very heavy (800–900) at large sizes, and body copy is 17px.
- Focus is a crisp **2px `#0F62C5` outline with 2px offset** (plus a white 2px outline at 4px offset on dark fills). Links are bright blue `#145BFF`.

## Proposed tokens
```json
{
  "id": "vanguard",
  "theme": "light",
  "colors": { "primary": "#C20029", "primaryHover": "#96151D", "primaryActive": "#660026", "secondary": "#040505", "accent": ["#145BFF", "#007873", "#FFAF00", "#F6001E"], "link": "#145BFF", "focusRing": "#0F62C5",
              "headerBg": "#FFFFFF", "headerText": "#040505", "pageBg": "#FFFFFF", "surface": "#FFFFFF", "border": "#CBCECE", "textPrimary": "#040505", "textSecondary": "#717777", "textDisabled": null,
              "success": "#1D9F22", "warning": "#FFAF00", "error": "#BA3D21", "info": "#145BFF",
              "neutralRamp": { "0": "#FFFFFF", "50": "#F5F6F6", "100": "#E8E9E9", "200": "#CBCECE", "500": "#717777", "700": "#3F4444", "900": "#040505" } },
  "typography": { "uiFamily": "FF Mark", "displayFamily": "FF Mark", "monoFamily": null, "proprietary": true, "googleFallbackUi": "Figtree", "googleFallbackDisplay": "Figtree",
                  "bodySize": 17, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": null, "semibold": null, "bold": 700 }, "headingScale": [68, 57, 28, 24, 23] },
  "radius": { "button": 9999, "input": 0, "card": 0, "chip": 9999, "modal": null },
  "button": { "height": { "sm": 32, "md": 48, "lg": 64 }, "paddingX": 32, "minWidth": 144, "fontSize": 17, "fontWeight": 400, "textTransform": "none", "borderWidth": 2,
              "primary": { "bg": "#C20029", "text": "#FFFFFF", "hoverBg": "#FFFFFF", "activeBg": null, "disabledBg": null, "disabledText": null },
              "secondary": { "bg": "#FFFFFF", "text": "#040505", "border": "#040505", "hoverBg": "#040505" },
              "ghost": { "text": "#145BFF", "hoverBg": null },
              "focus": { "style": "outline 2px #0F62C5, offset 2px (white 2px outline at 4px offset on dark fills)", "width": 2, "offset": 2, "color": "#0F62C5" } },
  "input": { "height": 48, "border": "#040505", "borderWidth": 1, "radius": 0, "placeholder": "#717777", "focusBorder": "#0F62C5", "errorBorder": "#BA3D21" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 0, "itemHeight": 48, "itemHoverBg": null, "itemSelectedBg": null, "itemSelectedText": "#040505", "shadow": "0 0 4px 1px rgba(4,5,5,0.06), 0 1px 1px 0 rgba(4,5,5,0.06), 0 2px 4px 0 rgba(4,5,5,0.08), 0 4px 8px 0 rgba(4,5,5,0.12)" },
  "tabs": { "style": "underline", "activeIndicator": null, "activeText": "#F5F6F6" },
  "elevation": { "card": "0 1px 1px 0 rgba(4,5,5,0.18), 0 0 4px 1px rgba(4,5,5,0.06)", "menu": "0 0 4px 1px rgba(4,5,5,0.06), 0 1px 1px 0 rgba(4,5,5,0.06), 0 2px 4px 0 rgba(4,5,5,0.08), 0 4px 8px 0 rgba(4,5,5,0.12)", "modal": null },
  "spacingBase": 4,
  "iconStyle": "thin outline line icons (header: My saves / Search / Support / Log in), custom set; filled black circle icon buttons in carousels"
}
```

### Notes on the values
- **Primary button.** `#C20029` fill, white label, 2px `#C20029` border, 80px radius. On hover it turns **white with a 2px `#040505` border and `#040505` text**, which is measured. There is no darker-red hover. `colors.primaryHover` `#96151D` is the darker red used on corporate.vanguard.com preference buttons, and `primaryActive` `#660026` is the deepest red in the Constellation brand-art ramp (`#FF5050 → #F6001E → #C20029 → #660026`). Use them for non-button red states only. White on `#C20029` = 6.3:1.
- **Black button.** "Compare services" and "View all Vanguard funds" are filled `#040505` and invert to white on hover. This is the most common filled button on the page, so `secondary` = `#040505`.
- **Outline button.** Transparent with a 2px `#040505` border and `#040505` text, and it fills `#040505` (white text) on hover.
- **Text/ghost action.** Bold 17px `#145BFF` with no underline. It turns `#040505` on hover.
- **Sizes.** The Constellation CSS defines small 2rem (32px, padding 0 1rem), medium 3rem (48px) and large 4rem (64px, padding 0 2rem, min-width 9rem). Marketing hero CTAs measured 68px tall at 17px/400. Corporate site buttons are 49px with 26px side padding and 24px radius. **md 48 is inferred** from the icon-button medium size and was not measured on a label button. Disabled colours were not found.
- **Inputs (`c11n-input__input`).** 48px, 1px `#040505` border, **0 radius**, 17px text, `0 1rem` padding. Focus adds a 2px `#0F62C5` outline at 2px offset. Error border `#BA3D21`, and the error hint text/icon is `#BA3D21`. The live header search measured 48px, 1px `#040505`, square, placeholder `#717777`.
- **Select / dropdown.** The select box is 48px, 1px `#040505` and square. The menu (`c11n-menu__menu`) is white with a **1px `#040505` border**, square corners and a soft 4-layer shadow. Group separators are 2px `#E8E9E9`. Items are 17px with padding 10/14px (≈48px rows). **Hover underlines the label rather than tinting the row.** The selected style was not found.
- **Tabs.** The fund profile sub-nav (`c11n-web-v1-tab`) sits on a dark `#3F4444` bar with 44px-tall `#F5F6F6` labels at 14px/700. The active indicator was not captured (the component renders in shadow DOM), so `style: underline` is an assumption.
- **Cards.** `c11n-card` is white, square, with a `0 1px 1px rgba(4,5,5,.18), 0 0 4px 1px rgba(4,5,5,.06)` shadow. The bordered variant uses 1px `#CBCECE`. Colour variants: red `#FFEDED`, turquoise `#DEF5F0` (border `#007873`), yellow `#FFF7DE`.
- **Status.** Positive change `#1D9F22`, negative change and errors `#BA3D21`. The progress/slider track is turquoise `#007873` on `#DEF5F0`. Yellow `#FFAF00`/`#BF8200` appears in patterns. `warning` = `#FFAF00` and `info` = link blue are **inferred**; no explicit warning or info tokens were found.
- **Surfaces.** The page is white, with alternate bands in `#F5F6F6` (the "Investing for everything it's worth" strip) and `#F4F4F4` on fund pages. The header is white with a 1px light-grey divider and two rows (logo/utility icons, then nav at 15px).
- **Typography.** `"FF Mark", Arial, sans-serif`. Loaded weights are 400/700/800/900, plus FF Mark Narrow and Thorndale (serif) declared but unused on these pages. Body is 17/24–25.5. The marketing H1 is 92/96 at 800. H2 is 57–68 at 800. H3 is 28/32 at 900, and the corporate H3/H4 is 24/32 bold. The small caption is 11px uppercase `#717777`. **Figtree** is the suggested free fallback: geometric, with a double-storey "a", close to FF Mark's proportions. Treat it as a judgement call.
- **Logo.** The red serif wordmark "Vanguard" sits on white, followed by a grey divider and a "Personal investors" label. A reversed version on red or black was not verified on these pages, and no clear-space rule was found publicly.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Button colours, sizes, hover/focus, link colour, body/heading type | Live `getComputedStyle` + hover/focus (Playwright, own Chromium) on https://investor.vanguard.com/ | High |
| Corporate button variant, fonts loaded, `--c11n-*` vars | Live, https://corporate.vanguard.com/ | High |
| Input, select, menu, card, button size specs, status/turquoise/yellow colours, focus outline | Production Constellation CSS (`.c11n-scope …` rules) captured from investor.vanguard.com | High (values) / Medium (role mapping) |
| Fund-page tab bar | Live, https://investor.vanguard.com/investment-products/mutual-funds/profile/vfiax | Medium |
| Active-tab indicator, disabled button colours, modal radius, warning/info roles | Not found | Low / unknown |
| Third-party summary (FF Mark, primary red) cross-check | https://www.shadcn.io/design/vanguard (community-curated) | Low |
| Google fallback font | Judgement | Low |

## Differs from current Figma
- **This is a new brand** with no Figma mode yet. The earlier quick value of primary `#C20029` is **confirmed**: it is the live red CTA fill.
- No secondary was given before. Use **`#040505` (near-black)**. Vanguard's UI is effectively red + black + white. Blue `#145BFF` is only for text links, and `#0F62C5` only for focus.
- Do not copy the AkzoNobel defaults. Use pill buttons with 2px borders and invert-on-hover, square inputs/cards/menus with 1px black borders, FF Mark → Figtree, and 17px body.
