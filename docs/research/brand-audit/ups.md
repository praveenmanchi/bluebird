# UPS — brand UI audit

## Summary
ups.com is a light, white site. Its signature is the **gold pill CTA** (`#FFC400`, 40px radius, near-black `#121212` label, Roboto Medium). UPS **brown `#351C15`** is the logo, footer and gradient colour, not the button colour.
Below the gold, the site uses warm greys and a few functional colours:
- **Greys:** `#5F5753` → `#F2F1EF`.
- **Links:** blue `#0662BB`.
- **Selection:** teal `#0A8080` for tab underlines, checked checkboxes and radios.
- **Errors:** red `#DF2901`.

The header is white with a warm-grey `#F2F1EF` utility ribbon on top, and a **4px gold bar** under the active nav item. The type is plain **Roboto**, so it is free and installable in Figma.

## Proposed tokens
```json
{
  "id": "ups",
  "theme": "light",
  "colors": { "primary": "#FFC400", "primaryHover": "#FFD64C", "primaryActive": null, "secondary": "#351C15",
              "accent": ["#0A8080", "#0662BB", "#FFB500"], "link": "#0662BB", "focusRing": "#121212",
              "headerBg": "#FFFFFF", "headerText": "#121212", "pageBg": "#FFFFFF", "surface": "#FFFFFF", "border": "#DFDBD7",
              "textPrimary": "#121212", "textSecondary": "#5F5753", "textDisabled": "#BFB8AF",
              "success": "#6DAF3A", "warning": null, "error": "#DF2901", "info": "#0662BB",
              "neutralRamp": { "gray1": "#5F5753", "gray2": "#8C857E", "gray3": "#BFB8AF", "gray4": "#DFDBD7", "gray5": "#F2F1EF",
                               "gray6": "#F2EDE9", "black": "#121212", "white": "#FFFFFF" } },
  "typography": { "uiFamily": "Roboto", "displayFamily": "Roboto", "monoFamily": "monospace", "proprietary": false,
                  "googleFallbackUi": "Roboto", "googleFallbackDisplay": "Roboto",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 500, "semibold": null, "bold": 700 },
                  "headingScale": [40, 32, 24, 20] },
  "radius": { "button": 40, "input": 4, "card": 8, "chip": 4, "modal": 8 },
  "button": { "height": { "sm": null, "md": 46, "lg": null }, "paddingX": 24, "minWidth": null, "fontSize": 16, "fontWeight": 500, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#FFC400", "text": "#121212", "hoverBg": "#FFD64C", "activeBg": null, "disabledBg": "#F2F1EF", "disabledText": "#BFB8AF" },
              "secondary": { "bg": "#FFFFFF", "text": "#0662BB", "border": "#0662BB", "hoverBg": "#E3EEF9" },
              "ghost": { "text": "#0662BB", "hoverBg": null },
              "focus": { "style": "outline 1px solid", "width": 1, "offset": 4, "color": "#121212" } },
  "input": { "height": 54, "border": "#5F5753", "borderWidth": 1, "radius": 4, "placeholder": "#8C857E", "focusBorder": "#121212", "errorBorder": "#DF2901" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 8, "itemHeight": null, "itemHoverBg": "#F2F1EF", "itemSelectedBg": null, "itemSelectedText": "#0A8080",
                "shadow": "0 4px 10px rgba(18,18,18,0.3)" },
  "tabs": { "style": "underline", "activeIndicator": "#0A8080", "activeText": "#0A8080" },
  "elevation": { "card": "0 4px 12px -3px rgba(0,0,0,0.05), 0 2px 5px 0 rgba(0,0,0,0.14)",
                 "menu": "0 4px 10px rgba(18,18,18,0.3)",
                 "modal": "0 4px 32px rgba(0,0,0,0.1)" },
  "spacingBase": 4,
  "iconStyle": "UPS 'symbol' icon font, simple outline glyphs (chevrons, external-link); 3D isometric brand pictograms on marketing tiles"
}
```

### Notes behind the values
- **CSS custom properties** (`:root` in `/webassets/styles/styles.css`, an Adobe AEM Edge Delivery site):
  - Brand: `--gold #ffc400`, `--gold-light #ffd64c`, `--brown #351c15`, `--ups-black #121212`.
  - Functional: `--teal #0a8080`, `--blue #0662bb`, `--blue-darker #105497` (link hover), `--error-red #df2901`, `--green-1 #6daf3a`.
  - Warm greys `--gray-1`…`--gray-6`.
  - Type: `--body-font-family: roboto, roboto-fallback, tahoma, helvetica, arial, sans-serif`.
- **Primary CTA** (`a.button` / `.ups-cta`):
  - Shape: `border 1px solid gold`, `border-radius: 2.5rem` (40px pill), `padding: .625rem 1.5rem`.
  - Type: Roboto 500 16px, label colour `#121212`. Measured 46px tall.
  - Hover/focus: background and border change to `#FFD64C`, plus `--cta-hover-shadow` (`0 3px 7px rgb(0 0 0/8%), 0 6px 12px -2px rgb(0 0 0/9%), 0 15px 32px -3px rgb(0 0 0/10%)`).
  - `:focus-visible`: `outline: 1px solid #121212; outline-offset: 4px`.
  - Disabled: background `#F2F1EF`, text `#BFB8AF`.
  - No separate pressed colour is defined.
- **Secondary CTA** (`.outline` / `.ups-cta-secondary`): transparent or white background, **2px** `#0662BB` border, `#0662BB` text. Hover changes border and text to `#105497` with background `#418ED926` (≈`#E3EEF9` on white) plus the hover shadow.
- **Tertiary** (`.accent`): text-only `#0662BB` with a chevron, hover `#105497`, radius 4.
- **Inputs:**
  - Base inputs have a 2px `#8C857E` border, radius 4, padding 12, placeholder `#8C857E`, and focus `outline 1px #8C857E`.
  - The `.ups-form` floating-label input is 54px tall with a 1px `#5F5753` border and radius 4. Focus is `box-shadow: 0 0 0 1px currentColor` (`#121212`). Error is a 2px `#DF2901` border with the label in red at weight 500.
  - Checkbox/radio: 24px, 1px `#5F5753` border, radius 4. Checked = **teal `#0A8080`**.
- **Tabs block:**
  - Divider `1px #DFDBD7`. Inactive text `#5F5753`, weight 400.
  - Active tab: **4px teal underline** (`::after`, radius 1px), text teal, weight 500.
  - Tab dropdown: toggle hover `rgb(27 25 24 / 8%)`.
- **Header:**
  - Height 120px (160 with the alert bar). The 40/56px **utility ribbon is `#F2F1EF`**, the nav area is white.
  - Nav link colour `#5F5753`. Active/hover indicator is a **4px gold `#FFC400` bar**, radius 1.
  - Menus are white panels with shadow `0 4px 10px rgba(18,18,18,.3)`. The sticky header shadow is `2px 0 10px rgba(18,18,18,.1)`.
- **Footer:** `background: var(--brown)` = `#351C15`, text `#BFB8AF`, white headings.
- **Cards:** radius 8 (small inner elements 4). Shadow `0 4px 12px -3px rgba(0,0,0,.05), 0 2px 5px rgba(0,0,0,.14)`; on hover it lifts to `0 15px 32px -3px …`.
- **Type scale:**
  - Desktop (≥770px) headings h1 40 / h2 32 / h4 24 / h3 20 px. All are **weight 400**, line-height `1em + 8px`.
  - Body 16/24, small 14, xs 12.
  - Measured home H2 40px/400, body `#121212` 16/24.
- **Status colours:** UPS publishes only the error red. The success green `#6DAF3A` is a palette value whose use I did not see. Warning is not defined anywhere (null). Info = link blue (my assumption).
- **Brand gold:** UPS's print gold is PMS 123 / `#FFB500`, but the web CSS uses `#FFC400`. I kept `#FFB500` as an accent so print-matched assets have a place.

### Logo
- **Seen:** the UPS shield (gold on brown) on white headers and on the brown footer.
- **Not verified:** UPS's brand portal is not public, so the reversal and clear-space rules are unknown. Treat the shield as full colour only and do not recolour it.
- **Recommendation:** a **white banner with the full-colour shield**, or a brown `#351C15` banner (UPS's own dark surface) with the full-colour shield.

## Sources
| What | URL | Type | Confidence |
|---|---|---|---|
| Live site (blocked) | https://www.ups.com/us/en/home — Akamai returns "Access Denied" (`application/blank`) to headless Chromium and curl. Not bypassed. | — | — |
| Rendered page, computed styles (buttons, body, headings, header shadow, links) | https://web.archive.org/web/20261124185735/https://www.ups.com/us/en/home (24 Nov 2026 capture), rendered in my own Playwright | Archived live site, computed style | medium-high (capture is one day old; header nav fragments did not load) |
| `:root` tokens, button / input / form / checkbox rules | https://web.archive.org/web/2026id_/https://www.ups.com/webassets/styles/styles.css | Site CSS (archived) | high |
| Fonts | https://web.archive.org/web/2026id_/https://www.ups.com/webassets/styles/fonts.css (Roboto 400/500/700) | Site CSS | high |
| Header, ribbon, nav indicator, menu shadow | https://web.archive.org/web/2026id_/https://www.ups.com/webassets/blocks/header/header.css | Site CSS | high |
| Tabs | https://web.archive.org/web/2026id_/https://www.ups.com/webassets/blocks/tabs/tabs.css | Site CSS | high |
| Cards, footer | `.../webassets/blocks/cards/cards.css`, `.../webassets/blocks/footer/footer.css` (same archive prefix) | Site CSS | high |
| Public design system / tokens | none found (npm, GitHub) | — | — |
| Modal radius/shadow, dropdown item metrics, warning colour | not found; values above are inferred from header menus | Inference | low |

## Differs from current Figma
- **Current:** primary `#351C15` (brown), secondary `#FFB500` (gold).
- **Swap them.** On ups.com the **action colour is gold `#FFC400`** (CTA background with `#121212` text). Brown `#351C15` is the brand surface: logo, footer and gradients.
  - Primary → `#FFC400` (hover `#FFD64C`), with **dark text, not white**.
  - Secondary → `#351C15`.
  - The gold's exact web hex is `#FFC400`, not `#FFB500`.
- **Also change:**
  - Font: Noto Sans → **Roboto**.
  - Button radius → **40px pill**, button height ~46px.
  - Input radius → 4px.
  - Card radius → 8px.
  - Accents: teal `#0A8080` for selection/tabs, blue `#0662BB` for links and secondary buttons.
  - Focus: 1px `#121212` outline with a 4px offset.
- **Banner:** should be white, or brown with the full-colour shield. Not gold.
