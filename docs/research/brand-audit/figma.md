# Figma — brand audit

## Summary
There are two different Figma "looks", and the **editor UI (UI3)** matters most, because our product is a plugin that sits inside it.
- **UI3 editor:** dense **11px Inter** (variable weights 450/550). Neutral greys come from a tight scale
  (`#FFFFFF / #F5F5F5 / #E6E6E6 / #D9D9D9 / #2C2C2C / #1E1E1E`), with a single **Figma blue `#0D99FF`** for primary buttons, selection and
  focus, and **component purple `#9747FF`**. Controls are 24px high with **5px corners**. Inputs are **borderless grey fills**. Panels,
  menus and dialogs use **13px radius**, and menus are **always dark (`#1E1E1E`)**, even in light mode.
- **figma.com marketing:** monochrome. Black CTAs with an 8px radius, the proprietary **Figma Sans / Figma Mono**, and the five-colour logo.

The editor defaults to **light** and offers dark. Plugins can inherit either one through `themeColors: true`
(`--figma-color-*` variables), and the tokens below mirror those variables. **Recommendation: light UI3 values,** or ideally bind the
plugin directly to `--figma-color-*` so it follows the user's theme.

## Proposed tokens (Figma editor UI3, light)
```json
{
  "id": "figma",
  "theme": "light",
  "colors": { "primary": "#0D99FF", "primaryHover": "#007BE5", "primaryActive": "#0768CF", "secondary": "#9747FF",
              "accent": ["#FF3737", "#FF7237", "#874FFF", "#00B6FF", "#24CB71"], "link": "#007BE5", "focusRing": "#0D99FF",
              "headerBg": "#FFFFFF", "headerText": "#1A1A1A", "pageBg": "#FFFFFF", "surface": "#F5F5F5", "border": "#E6E6E6",
              "textPrimary": "#1A1A1A", "textSecondary": "#808080", "textDisabled": "#B3B3B3",
              "success": "#14AE5C", "warning": "#FFCD29", "error": "#F24822", "info": "#0D99FF",
              "neutralRamp": { "white": "#FFFFFF", "100": "#F5F5F5", "200": "#E6E6E6", "300": "#D9D9D9", "400": "#B3B3B3", "500": "#757575",
                               "600": "#444444", "700": "#383838", "800": "#2C2C2C", "900": "#1E1E1E" } },
  "typography": { "uiFamily": "Inter", "displayFamily": "Figma Sans", "monoFamily": "Figma Mono", "proprietary": false,
                  "googleFallbackUi": "Inter", "googleFallbackDisplay": "Inter Tight",
                  "bodySize": 11, "bodyLineHeight": 16, "weights": { "regular": 450, "medium": 500, "semibold": 550, "bold": 600 },
                  "headingScale": [13, 11, 9] },
  "radius": { "button": 5, "input": 5, "card": 13, "chip": 5, "modal": 13 },
  "button": { "height": { "sm": 24, "md": 24, "lg": 32 }, "paddingX": 8, "minWidth": null, "fontSize": 11, "fontWeight": 500, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#0D99FF", "text": "#FFFFFF", "hoverBg": "#007BE5", "activeBg": "#0768CF", "disabledBg": "#D9D9D9", "disabledText": "#FFFFFF" },
              "secondary": { "bg": "#FFFFFF", "text": "#1A1A1A", "border": "#E6E6E6", "hoverBg": "#F5F5F5" },
              "ghost": { "text": "#1A1A1A", "hoverBg": "#F2F2F2" },
              "focus": { "style": "1px solid outline in border-selected blue", "width": 1, "offset": 0, "color": "#0D99FF" } },
  "input": { "height": 24, "border": "#F5F5F5", "borderWidth": 0, "radius": 5, "placeholder": "#B3B3B3", "focusBorder": "#0D99FF", "errorBorder": "#DC3412" },
  "dropdown": { "menuBg": "#1E1E1E", "menuRadius": 13, "itemHeight": 24, "itemHoverBg": "#0D99FF", "itemSelectedBg": "#0D99FF", "itemSelectedText": "#FFFFFF",
                "shadow": "0 0 0.5px #0000001F, 0 10px 16px #0000001F, 0 2px 5px #00000026" },
  "tabs": { "style": "pill", "activeIndicator": "#F5F5F5", "activeText": "#1A1A1A" },
  "elevation": { "card": "0 0 0.5px #0000004D, 0 1px 3px #00000026", "menu": "0 0 0.5px #0000001F, 0 10px 16px #0000001F, 0 2px 5px #00000026",
                 "modal": "0 0 0.5px #00000014, 0 10px 24px #0000002E, 0 2px 5px #00000026" },
  "spacingBase": 4,
  "iconStyle": "Figma UI3 icons: outline line glyphs on a 24px frame (16px glyph variants), 1px stroke, colour = --figma-color-icon"
}
```
Notes on the JSON:
- Text colours are **black-alpha** in Figma: `--color-text` `#000000E5`, `-secondary` `#00000080`, `-tertiary`/`-disabled` `#0000004D`.
  They are flattened onto white above (`#1A1A1A`, `#808080`, `#B3B3B3`). The figui3 kit uses `#00000099` (≈ `#666666`) for secondary.
  The live web app uses `#00000080`.
- **Inputs have no border.** The field is a `#F5F5F5` fill (`--figma-color-bg-secondary`). On focus it gets a 1px `#0D99FF` outline.
  `input.border` therefore repeats the fill colour, with `borderWidth` 0.
- **Menus are dark in both themes:** `--color-bg-menu` `#1E1E1E`, text `#FFFFFF`, highlighted item `#0D99FF` (`--color-bg-menu-selected`).
  The live CSS also defines `--color-bg-menu-hover` `#2C2C2C`. In UI3 that is the "submenu open" grey, and the pointer/keyboard
  highlight is blue. Item padding is 4px 16px 4px 12px, and items have a 5px radius inside a 13px menu.
- Inter variable weights 450/550 are what UI3 renders. In a Figma file use Inter **Regular 400 / Medium 500 / Semi Bold 600** if
  variable weights aren't available. Letter-spacing is +0.055px at 11px.
- Type sizes: UI3 body large 13 / medium 11 / small 9. Line height is 16px at 11px (1.4545).
- `secondary` `#9747FF` is the component purple (`--color-bg-component`). That is the most "Figma-editor" second hue. The alternative is
  the neutral inverse `#2C2C2C`. `accent` holds the five current logo colours.
- `primary.disabledText` is `--color-text-ondisabled` (white on `#D9D9D9`).
- Tabs ("Design / Prototype" in the right panel) show the active tab as a subtle `#F5F5F5` rounded fill with default text, and inactive
  tabs in secondary text. I took this from the UI3 kit and observation, not from a live measurement. **Confidence: medium.**

## Dark alternative (UI3 dark) — values that change
bg `#2C2C2C`, secondary `#383838`, tertiary `#444444`, border `#444444`, text `#FFFFFF`, secondary text `#FFFFFFB2` (≈ `#D5D5D5` on
`#2C2C2C`), tertiary/disabled `#FFFFFF66`. Brand `#0C8CE9` → hover `#0A6DC2` → pressed `#105CAD`, with text-brand `#7CC4F8` and
selected `#394360`. Danger is `#E03E1A`, success `#198F51`, warning `#F3C11B`, disabled `#757575`, menus still `#1E1E1E`, component `#8A38F5`.
The plugin title bar and header in dark is `#2C2C2C`.

## Measured live (Playwright, headless Chromium, 2026-11-25)
- **figma.com/login (the web-app bundle):** `:root` resolves the UI3 token set. `--color-bg` `#fff`, `-secondary` `#f5f5f5`,
  `-tertiary` `#e6e6e6`, **`--color-bg-brand` `#0d99ff`** (hover `#007be5`, pressed `#0768cf`), `--color-bg-selected` `#e5f4ff`,
  `--color-border` `#e6e6e6`, `--color-border-strong` `#2c2c2c`, `--color-border-selected` `#0d99ff`, `--color-bg-component` `#9747ff`,
  `--color-bg-menu` `#1e1e1e`, `--color-bg-menu-selected` `#0d99ff`, `--color-bg-menu-hover` `#2c2c2c`, `--color-text-brand` `#007be5`,
  danger/success/warning `#f24822`/`#14ae5c`/`#ffcd29`, `--color-text-danger` `#dc3412`, `--text-body-medium-font-size` `.6875rem` (11px),
  `--radius-medium` `.3125rem` (5px), `--radius-large` `.8125rem` (13px). The UI font is `Inter, ui-sans-serif, system-ui, …`.
  "Figma Sans" and "Figma Mono" also appear in the app.
  The login page itself scopes a monochrome override (`--color-bg-brand` `#2c2c2c` inside the auth card). That is page-specific,
  not the editor default. The app picks its theme with a class, not `prefers-color-scheme`, so the dark values could not be read live.
  They come from figui3 (below).
- **figma.com (marketing):** body uses `figmaSans, "figmaSans Fallback", "SF Pro Display", system-ui`. Weights are light variable
  values (320/330/400/480). The h1 is 64px/400 at -0.64px. The header is white. The primary CTA is **black `#000000`, white text, 8px
  radius, 46px high, 22px padding**, with hover at black 85%. CSS variables include `--fig-theme-btn-primary-bg:#000000`,
  `--fig-radius-*` (2/4/8/12/16/24/28px) and `--global-font-mono: "figmaMono"`. Marketing is deliberately monochrome, so do **not**
  use it for the plugin theme.
- **figma.com/using-the-figma-brand:** the logo SVG fills are `#FF3737`, `#FF7237`, `#874FFF`, `#00B6FF`, `#24CB71` (current
  five-colour mark).

## Logo
The Figma brand page allows the **black-and-white logo** and the **coloured logo**, and lets you use them to link to Figma. A white
mark on a dark banner is the black-and-white variant. No numeric clear-space value is in the page text. On a coloured banner, prefer
the single-colour white mark over the coloured logo.

## Sources
- https://www.npmjs.com/package/@rogieking/figui3 (v11.9.0, `src/core/styles/foundations.css`, `buttons-and-combos.css`,
  `menu-items-and-separators.css`, `dialog-surfaces.css`). This is a UI3 web-component kit by Rogie King, a Figma designer advocate.
  It gives the light/dark `--figma-color-*` values, sizes, radii, elevations and button/input/menu specs.
  **Semi-official design-system code. Confidence: medium-high.** The light values match the live app CSS exactly.
- https://www.npmjs.com/package/@create-figma-plugin/ui (v3.2.1, `lib/css/theme.css`): the older UI2 fallbacks for the same
  `--figma-color-*` names, used only to cross-check. **Confidence: medium.**
- https://www.figma.com/login: UI3 token values, UI font and radii. **Live computed style. Confidence: high (light only).**
- https://www.figma.com/ and https://www.figma.com/pricing/: marketing fonts, CTA and variables. **Live computed style. Confidence: high.**
- https://www.figma.com/using-the-figma-brand/: logo colours and logo usage. **Brand guidelines plus live SVG. Confidence: high.**
- I could not measure the editor canvas UI itself (it needs a login), and I did not try. Tabs, focus offset and the button label
  weight (500 vs 550) are therefore **medium confidence**.

## Differs from current Figma
Figma is a **new brand**. It is not yet in the Figma file, and no earlier quick value was given.
- Base the theme on the **editor** (primary `#0D99FF`, secondary component purple `#9747FF`), **not** the black-and-white marketing site.
- Fonts: the UI is **Inter**, which is free and installable, so no fallback is needed. "Figma Sans" is proprietary and only for
  marketing/display. Inter Tight is the closest free display match.
- Shape and density differ strongly from the AkzoNobel-copied defaults: 24px controls, 5px radius, borderless filled inputs,
  13px panel/menu radius, 11px body text and dark menus.
