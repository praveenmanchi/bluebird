# Verizon — VDS (Verizon Design System, React "*-VDS" components) + VUI (`vui:` theme tokens) on verizon.com

## Summary
Verizon's UI is **black, white and one loud red**. The red is **`#EE001E`**, the colour of the live wordmark. Product UI is monochrome: **primary buttons are solid black pills** and secondary buttons are a 1 px black outline pill. Text links are black and underlined. Checkboxes are black, and **focus is a 1 px dashed black outline** offset 2 px, which is very recognisable. Red is kept for the logo, marketing tiles, quick-link pills and the selected-tab indicator (`#E10014`). Errors are **orange-brown** (`#B95319`), not red, so they don't clash with the brand. Type is **Verizon NHG** (a custom Neue Haas Grotesk), bold with tight leading and +0.5 px tracking on body text. Everything rounds generously: buttons are pills (44 px radius), inputs 8 px, marketing tiles 24 px. A 2025–26 refresh adds a neon-yellow accent `#F8FF3C` and warm "stone" neutrals.

## Proposed tokens
```json
{
  "id": "verizon",
  "theme": "light",
  "colors": { "primary": "#EE001E", "primaryHover": null, "primaryActive": null, "secondary": "#000000",
              "accent": ["#F8FF3C", "#FF3C2D", "#F8F3E9"], "link": "#000000", "focusRing": "#000000",
              "headerBg": "#FFFFFF", "headerText": "#000000", "pageBg": "#FFFFFF", "surface": "#FFFFFF", "border": "#D8DADA",
              "textPrimary": "#000000", "textSecondary": "#6F7171", "textDisabled": "#D8DADA",
              "success": "#008331", "warning": "#FFCD27", "error": "#B95319", "info": "#006FC0",
              "neutralRamp": { "black": "#000000", "gray11": "#1B1D1F", "gray20": "#333333", "gray44": "#6F7171", "gray65": "#A7A7A7",
                               "gray85": "#D8DADA", "gray95": "#F6F6F6", "white": "#FFFFFF" } },
  "typography": { "uiFamily": "Verizon-NHG-eTX", "displayFamily": "Verizon-NHG-eDS", "monoFamily": null, "proprietary": true,
                  "googleFallbackUi": "Inter", "googleFallbackDisplay": "Inter",
                  "bodySize": 16, "bodyLineHeight": 20, "weights": { "regular": 400, "medium": null, "semibold": null, "bold": 700 },
                  "headingScale": [20, 24, 32, 48, 64, 120] },
  "radius": { "button": 44, "input": 8, "card": 8, "chip": 32, "modal": null },
  "button": { "height": { "sm": 32, "md": 44, "lg": 44 }, "paddingX": 24, "minWidth": 76, "fontSize": 16, "fontWeight": 700, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#000000", "text": "#FFFFFF", "hoverBg": "#000000", "activeBg": "#6F7171", "disabledBg": "#D8DADA", "disabledText": "#FFFFFF" },
              "secondary": { "bg": "transparent", "text": "#000000", "border": "#000000", "hoverBg": "transparent" },
              "ghost": { "text": "#000000", "hoverBg": "#F5F5F4" },
              "focus": { "style": "1px dashed outline in the foreground colour (black on light, white on dark), offset 2px", "width": 1, "offset": 2, "color": "#000000" } },
  "input": { "height": 44, "border": "#000000", "borderWidth": 1, "radius": 8, "placeholder": "#716F6D", "focusBorder": "#000000", "errorBorder": "#732706" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 0, "itemHeight": 40, "itemHoverBg": null, "itemSelectedBg": null, "itemSelectedText": "#000000",
                "shadow": "none (1px #D8DADA border)" },
  "tabs": { "style": "underline", "activeIndicator": "#E10014", "activeText": "#E10014" },
  "elevation": { "card": "0 1px 2px 0 rgba(0,0,0,0.05)", "menu": "none", "modal": null },
  "spacingBase": 4,
  "iconStyle": "VDS/VUI monoline outline icons (thin stroke, 20-24 px); status icons are solid glyphs inside fields"
}
```

### Notes on values
- **Reds**:
  - `#EE001E`: the wordmark fill (decoded from the header SVG), `--custom-brand-red`, and the `vui:button--red` bg.
  - `#F50A23`: `--custom-brand-red-secondary`, `--fed-color-fg-brand`, and the quick-link pills. The logo's red-to-yellow gradient also ends on it.
  - `#E10014`: `--vui-theme-color-element-brand`, the tabs label and indicator, and the red badge. This is the slightly darker red for interactive elements and text on white.
  - `#EE0000`: the legacy VDS 3.0 `red` token.

  Use `#EE001E` for the brand/banner. There are **no hover or pressed shades of red**: VUI shows hover as a 1 px outline in the border colour and pressed as 60 % opacity. That is why `primaryHover` and `primaryActive` are null.
- **Neutrals**: product pages (VDS) use the cool VDS 3.0 greys gray-11 `#1B1D1F`, gray-20 `#333333`, gray-44 `#6F7171`, gray-65 `#A7A7A7`, gray-85 `#D8DADA` and gray-95 `#F6F6F6`; `#757676` also appears on breadcrumbs. The homepage's newer VUI theme uses **warm** greys:
  - element-secondary `#716F6D`
  - low-contrast `rgba(170,168,163,.4)`
  - visible `#DDDAD4`
  - stone `#F8F3E9`
  - elevated dark `#333332`

  Pick one family per theme. The JSON uses the cool VDS ramp because the shop/product pages are built with it.
- **Status** (VUI feedback, element / tonal text / tonal bg):
  - success `#008331` / `#004B1C` / `#A4E6BD`
  - error `#B95319` / `#732706` / `#FFCAAA`
  - info `#006FC0` / `#003E6C` / `#AAD8F9`
  - warning `#FFCD27` / `#685106` / `#FFE797`

  Savings text is green `#008331`. Badges come in red `#E10014`, yellow `#FFCD27`, green, orange `#B95319`, blue `#006FC0`, neon `#F8FF3C`, stone `#F8F3E9`, grey `#716F6D`/`#DDDAD4`, black and white.
- **Buttons**:
  - **Large**: 44 px, padding 11/24 (`.6875rem 1.5rem`; the 12 px pad loses 1 px to the border), radius 44, 16/20 **700** in NHG-DS, tracking 0.5 px, min-width 76 (`4.75rem`).
  - **Small**: 32 px, padding 7/16, radius 32, 12/16 700 in NHG-eTX, no min-width. Measured live: "Sign In" in the shop gnav.
  - **Primary**: `#000000` bg and border, white label (`--vui-theme-color-button-primary-*`). **Hover** keeps the colours and adds a 1 px outline/box-shadow, so the edge reads as 2 px. **Pressed**: VDS uses `#6F7171`; VUI uses 60 % opacity. **Disabled**: VDS greys out to `#D8DADA` (measured: a disabled secondary has `#D8DADA` border and text); VUI uses 17 % opacity.
  - **Secondary**: transparent, black label, 1 px black border; same outline hover.
  - **Marketing variants**: red fill/white text, white/red outline, neon-yellow `#F8FF3C` with black text. All are pills.
- **Focus**: `--vui-theme-color-interactive-focusring: #000000`, `outline: dashed .0625rem`, offset `.125rem`. Live on a `vui:button` it measured `1px dashed #000000`, offset 2 px. VDS 3.0 uses the same (`--outline-focus: var(--color-primary) dashed 0.0625rem`). On dark surfaces it turns white.
- **Inputs** (`vui:input`): field 44 px, padding 12, **radius 8**, white bg, a 1 px inset `#000000` border that becomes **2 px on focus**, plus the dashed focus outline. Control text 16/20, label 12/16, helper/status 12/16 in eTX. Placeholder `#716F6D`. **Error**: bg `#FFCAAA`, border `#732706`, an error icon, status text `#B95319`. Success: bg `#A4E6BD`, border `#004B1C`. Older pages (store locator) still use a 40 px, 1 px black, 4 px-radius search input. The header search is a 48 px pill (radius 30) with a 1 px `#A7A7A7` border.
- **Dropdown/menu** (gnav "Sign in" menu, opened live without signing in):
  - Panel: square white with a 1 px `#D8DADA` border and no shadow.
  - Items: 40 px high, 16/400 black text, 12 px vertical padding, no item bg.
  - Not captured: item hover/selected colours and the VDS `select` menu.
- **Tabs** (`vui:tabs`): an underline style. The **4 px** indicator is `#E10014` with rounded ends, and the selected label is `#E10014`. On hover the indicator appears in `currentColor`. Tab min-height 44–48, text 16/20 or 20/24. Focus puts a dashed outline on the label.
- **Checkbox**: a white box with a 1 px black border (2 px variant exists) that becomes **solid black** with a white check when selected, and has a 44 px hit area. Error state uses `#FFCAAA` and `#732706`.
- **Links**: black, underlined (1 px bottom border on `StyledAnchor-VDS`), 16/20 with +0.5 px tracking. On dark surfaces they are white.
- **Cards/tiles**: product tiles on the shop page are white with radius 8 and `0 1px 2px rgba(0,0,0,.05)`. Homepage marketing tiles are radius **24** with a **2 px red `#EE001E` border**, or are filled red. Brand-category cards are radius 16 with a 2 px border.
- **Type**:
  - Faces: `Verizon-NHG-DS` / `Verizon-NHG-eDS` (display) and `Verizon-NHG-eTX` (text), loaded at 300, 400 and 700. The gnav uses aliases (`BrandFont-Display` / `BrandFont-Text`). All are **proprietary** (custom Neue Haas Grotesk).
  - Scale: body 16/20 (+0.5 px), small 14/18, micro 12/16 and 11/16; titles 20/24, 24/28, 32/36 (h1 on shop), 64/60, and feature 120/108 (homepage hero). Only **400 and 700** are used.
  - Google fallback: **Inter**, the closest open neo-grotesque to Neue Haas Grotesk / Helvetica. Arimo is metric-compatible but plainer.
- **Header**: white throughout. A utility row (Personal in red / Business, phone, support links in 14 px), then a 122 px main gnav with the red wordmark, black 16/700 nav items, the pill search, "Sign in" and the cart, divided by a light grey rule. There is no coloured nav bar, so brand colour comes only from the logo and red pills.
- **Spacing**: 4 px base (`vui:u-padding-6x` = 24 px), grid gap 12 px, content well max-width 1232 px.
- **Logo**: the header uses the red `#EE001E` wordmark on white (class `gnav20-logoWhiteBg`, which implies a separate version for dark/coloured backgrounds). Hero banners set white type on red. A reversed white wordmark on the red banner is plausible but **not verified** against Verizon's brand rules. Clear space was not found.

## Sources
- `https://www.verizon.com/` (live, Playwright headless, 2026-11-25): `:root` VUI theme tokens (`--vui-theme-color-*`, `--vui-text_*`), `vui:` component rules (button, input, tabs, checkbox), the logo SVG, the header, and the gnav menu opened. **High**.
- `https://www.verizon.com/smartphones/` (live): VDS React components (`StyledButton-VDS`, `StyledAnchor-VDS`, `StyledInput-VDS`, typography, tiles), the cool grey palette and the disabled state. **High**.
- `https://www.verizon.com/stores/` (live): the legacy search input and the `--fed-color-*` tokens. **High**.
- `https://www.verizon.com/home/internet/` (live): small-button hover and focus (dashed outline measured). **High**.
- `@evolv-delivery/vds-components@1.2.7` (npm, `https://registry.npmjs.org/@evolv-delivery/vds-components/-/vds-components-1.2.7.tgz`; repo `github.com/evolv-ai/env-integrations`): a **third-party** web-component kit "built to be compatible with VDS 3.0". It confirms the VDS colour tokens (gray-11…gray-95, red `#EE0000`), button radius 2.75 rem/2 rem, padding, min-width, the `#6F7171` pressed state and the dashed focus. **Medium** (third-party, consistent with the live measurements).
- Verizon's official VDS packages are **not public**: `@vds/*`, `@vds-core/*` and `@vds-tokens/*` all return 404 on npm. `designsystem.verizon.com` and `vds.verizon.com` do not resolve.
- Dropdown item hover/selected, select menu and modal radius: **unknown**. Logo reversal rule: **not verified**. Google font match: my own judgement, **medium**.

## Differs from current Figma
New brand: there is no Verizon mode in the Figma file yet. Proposed primary is `#EE001E` (brand red) and secondary is `#000000`. In Verizon's product UI the main CTA is black, not red. Red is for brand moments (the banner and logo) and the selected-tab indicator (`#E10014`).
