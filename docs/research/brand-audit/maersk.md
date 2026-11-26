# Maersk — brand UI audit

## Summary
Maersk's product UI is the public **Maersk Design System (MDS)**. Interactive elements are mostly black, not navy: the primary button is **near-black `#141414` with white text**. **Maersk Blue `#42B0D5`** is the secondary appearance, the focus colour and the tab underline. The navy `#00243D` is a supporting brand colour only (deep info shade, carousel dot), not a UI token.
The UI is light, white and grey with a neutral grey ramp. Radius is a modest 6px. Buttons use Maersk Text at **regular weight 400**, so they read lighter than most systems. Headings use **Maersk Headline Light (300)** at large sizes, which is the most recognisable part of the look.
The focus style is a 1px blue border plus a soft 3px pale-blue `#D1ECF5` halo. Tabs have a 3px Maersk Blue underline. Tags are pills (20px radius). Cards have a border and no shadow.

## Proposed tokens
```json
{
  "id": "maersk",
  "theme": "light",
  "colors": { "primary": "#141414", "primaryHover": "#363636", "primaryActive": "#4C4C4C", "secondary": "#42B0D5",
              "accent": ["#00243D", "#1686BD", "#003E62", "#EA5D4B"], "link": "#0077B2", "focusRing": "#42B0D5",
              "headerBg": "#FFFFFF", "headerText": "#141414", "pageBg": "#F7F7F7", "surface": "#FFFFFF", "border": "#D4D4D4",
              "textPrimary": "#141414", "textSecondary": "#6A6A6A", "textDisabled": "#8A8A8A",
              "success": "#40AB35", "warning": "#FFD029", "error": "#B80012", "info": "#005986",
              "neutralRamp": { "0": "#FFFFFF", "50": "#F7F7F7", "100": "#F0F0F0", "200": "#E2E2E2", "300": "#D4D4D4", "400": "#B3B3B3",
                               "500": "#8A8A8A", "600": "#6A6A6A", "700": "#4C4C4C", "800": "#363636", "900": "#141414" } },
  "typography": { "uiFamily": "Maersk Text", "displayFamily": "Maersk Headline", "monoFamily": null, "proprietary": true,
                  "googleFallbackUi": "Source Sans 3", "googleFallbackDisplay": "Barlow",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [80, 50, 40, 26, 20] },
  "radius": { "button": 6, "input": 6, "card": 12, "chip": 20, "modal": 16 },
  "button": { "height": { "sm": 32, "md": 40, "lg": 48 }, "paddingX": 16, "minWidth": null, "fontSize": 16, "fontWeight": 400, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#141414", "text": "#FFFFFF", "hoverBg": "#363636", "activeBg": "#4C4C4C", "disabledBg": "#8A8A8A", "disabledText": "#FFFFFF" },
              "secondary": { "bg": "#FFFFFF", "text": "#141414", "border": "#D4D4D4", "hoverBg": "#F0F0F0" },
              "ghost": { "text": "#141414", "hoverBg": "#F0F0F0" },
              "focus": { "style": "1px border #42B0D5 + 3px solid halo #D1ECF5 (box-shadow spread)", "width": 3, "offset": 0, "color": "#D1ECF5" } },
  "input": { "height": 40, "border": "#D4D4D4", "borderWidth": 1, "radius": 6, "placeholder": "#6A6A6A", "focusBorder": "#42B0D5", "errorBorder": "#B80012" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 6, "itemHeight": 40, "itemHoverBg": "#F0F0F0", "itemSelectedBg": "#F0F0F0", "itemSelectedText": "#141414",
                "shadow": "0 3px 5px -1px rgba(0,0,0,0.04), 0 1px 18px 0 rgba(0,0,0,0.03), 0 6px 10px 0 rgba(0,0,0,0.03)" },
  "tabs": { "style": "underline", "activeIndicator": "#42B0D5", "activeText": "#141414" },
  "elevation": { "card": "none",
                 "menu": "0 3px 5px -1px rgba(0,0,0,0.04), 0 1px 18px 0 rgba(0,0,0,0.03), 0 6px 10px 0 rgba(0,0,0,0.03)",
                 "modal": "0 3px 5px -1px rgba(0,0,0,0.04), 0 1px 18px 4px rgba(0,0,0,0.03), 0 6px 10px 8px rgba(0,0,0,0.03)" },
  "spacingBase": 4,
  "iconStyle": "MDS icon set (@maersk-global/icons), thin outline line icons at 20/24px"
}
```

### Notes behind the values
- **Primary is black.** The token `--mds_brand_appearance_primary_default_background-color` is `rgb(20,20,20)`. A live `<mc-button>` measured `bg #141414`, text white, hover `#363636`, pressed `#4C4C4C`. maersk.com uses the same black buttons ("Read updates", "Get started").
- **Secondary appearance** (`appearance="secondary"`) is `#42B0D5` with **dark text `#141414`**, not white. Hover is `#60BDDC`, active `#78C8E2`. Its weak background is `#E2F3F9`.
- **Outlined neutral button:** the border is `rgba(20,20,20,0.18)`, which is ≈`#D4D4D4` on white. Hover adds a `rgba(20,20,20,0.06)` background (≈`#F0F0F0`). The **plain** (ghost) variant uses the same hover.
- **Disabled** buttons are the normal button at `opacity: 0.5` on the host (`--mds_brand_appearance_state_disabled_opacity: 0.5`). `#8A8A8A` above is that black at 50% on white. It is derived, not a token.
- **Button sizes:** `fit="small|medium|large"` gives heights 32/40/48 with horizontal padding 12/16/24 (including the 1px border). Font is 14/16/16 px, weight 400.
- **Input** (`mc-input`): a 40px field, border 1px `#D4D4D4`, radius 6, white fill. Focus measured `border #42B0D5` + `box-shadow 0 0 0 3px #D1ECF5`. The placeholder measured `#6A6A6A`. Error colour comes from the token `error_default_border-color #B80012`; I did not see the error state rendered.
- **Select menu** (`mc-select` opened): the popover is radius 6 with shadow "low". Options are 40px high with a `#F0F0F0` hover background.
- **Tabs** (`mc-tab-bar`): the active tab has a `::after` bar, 3px high, `#42B0D5`. Text stays `#141414`.
- **Card:** `1px #D4D4D4` border, radius 12, white, no shadow. **Tag:** 24px high, radius 20, `#F0F0F0` background. **Checkbox:** 20px, radius 4, checked `#141414`. **Switch:** 36×20 track, checked `#141414`. **Modal:** radius 16, shadow "high".
- **Status background/text pairs** (weak variants): success `#DCF6D9`/`#133310`, warning `#FFF1C2`/`#4D3E0C`, error `#FCDDE0`/`#370005`, info `#E2F3FB`/`#00243D`. Status *text* colours are success `#328529`, warning `#806814`, error `#B80012`, info `#005986`.
- **Typography:** Maersk Headline headings run 80/50/40/26/20 px. Sizes 40 and above use **weight 300**, the smaller ones 400. Body text is 16/24, small 14/20, x-small 12/16. maersk.com measured: hero H1 50px/300, section H2 40px/300, card H3 20px/400, body 16/24. The fonts are proprietary (served from `@maersk-global/fonts`). Suggested Google fallbacks: Source Sans 3 (UI) and Barlow Light 300 (display). These are my judgement, not a Maersk statement.
- **Header:** maersk.com's nav and tracking panel are white with `#141414` text, and the hero runs dark under a transparent header. I recommend a **white banner with the dark logo**. If Bluebird needs a coloured banner, use `#141414` (MDS "inverse") or the brand navy `#00243D` with the white logo.
- **Dark theme** exists (`maersk/dark`): body `#141414`, text `#F0F0F0`, primary inverts to white, links become `#42B0D5`.

### Logo
MDS ships two logo variants as tokens (`--mds_brand_appearance_static_logo_url`):
- **Light theme:** black wordmark next to the `#42B0D5` rounded square with the white seven-pointed star.
- **Dark theme:** **white wordmark**, same blue square and white star. So a reversed (white) wordmark on dark backgrounds is official.

The star square always stays Maersk Blue. MDS publishes no clear-space rule.

## Sources
| What | URL | Type | Confidence |
|---|---|---|---|
| All colour, radius, shadow, typography and state tokens | https://designsystem.maersk.com/@maersk-global/mds-design-tokens/maersk/light/css/design-tokens-px.css | Design-system tokens (official CDN) | high |
| Dark theme and dark logo | https://designsystem.maersk.com/@maersk-global/mds-design-tokens/maersk/dark/css/design-tokens-px.css | Design-system tokens | high |
| Font families and weights | https://designsystem.maersk.com/@maersk-global/fonts/maeu/fonts.css | Design-system assets | high |
| Button / input / select / tabs / card / tag / checkbox / switch / modal (sizes, padding, hover, pressed, focus) | https://designsystem.maersk.com/@maersk-global/mds-components-core/index.bundle.esm.min.js — official web components rendered in my own headless Chromium; `getComputedStyle` read inside the shadow DOM | Live computed style of the official components | high |
| Header, live buttons, headings, body text | https://www.maersk.com/ | Live computed style (Playwright) | medium (header sat under the hero; my second headless run stalled, and I did not retry with a spoofed browser) |
| How MDS assets are loaded from the CDN | a public GitHub sample (VinishKumar1/incident-copilot `frontend/index.html`) | Third-party usage example | used only to find the CDN URLs |
| Google font fallbacks | — | Judgement | low |

npm: the `@maersk-global/*` packages are on GitHub Packages (`npm.pkg.github.com`), not the public registry. The CDN copy above is the same set of files.

## Differs from current Figma
- **Current:** primary `#00243D`, secondary `#42B0D5`.
- **Secondary `#42B0D5`:** correct. It is the MDS secondary, focus and brand colour. Note that MDS puts **dark text (`#141414`) on `#42B0D5`, not white**.
- **Primary `#00243D`:** this is *not* the MDS primary. MDS's primary/CTA colour is **near-black `#141414`** (hover `#363636`, pressed `#4C4C4C`). `#00243D` only appears as the deepest info shade (`info_weakest_on-background-color`) and as a carousel dot on maersk.com.
- **Recommendation:**
  - Set primary to `#141414` and keep secondary `#42B0D5`.
  - Optionally keep `#00243D` as an accent or for the banner.
  - Use the blue border + `#D1ECF5` halo for focus.
  - Change the button font weight to **400**.
  - Set radius to **6px**: buttons and inputs.
  - Set radius to **12px**: cards.
  - Set radius to **20px**: tags.
