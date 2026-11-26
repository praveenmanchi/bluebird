# GitHub — brand audit

## Summary
GitHub's product UI is built on **Primer** (`@primer/primitives` v11.10.0, `@primer/react`). It is recognisable by a **green primary
button** (`#1F883D`) next to grey "default" buttons, a **blue accent** (`#0969DA`) for links, focus and selection, cool blue-grey
neutrals (`#1F2328` text, `#D1D9E0` borders, `#F6F8FA` muted surfaces), 6px corners, 14px body text, Octicons, and a **coral
underline** (`#FD8C73`) on the active tab. The font stack now starts with **Mona Sans VF**, which is open source and on Google Fonts.
Light and dark are both first-class. Dark (`#0D1117` canvas) is what developers associate with GitHub, but light is the default.

**Recommendation for the plugin panel: Primer light**, with the dark Primer header (`#25292E`) as the brand banner. Light matches
Figma's default light UI, keeps the green CTA at its intended contrast, and the dark banner keeps the "GitHub" feel. The full dark set
is given below in case a dark mode is preferred (the earlier quick value was dark).

## Proposed tokens (Primer light — recommended)
```json
{
  "id": "github",
  "theme": "light",
  "colors": { "primary": "#1F883D", "primaryHover": "#1C8139", "primaryActive": "#197935", "secondary": "#0969DA",
              "accent": ["#8250DF", "#FD8C73"], "link": "#0969DA", "focusRing": "#0969DA",
              "headerBg": "#25292E", "headerText": "#FFFFFF", "pageBg": "#FFFFFF", "surface": "#F6F8FA", "border": "#D1D9E0",
              "textPrimary": "#1F2328", "textSecondary": "#59636E", "textDisabled": "#818B98",
              "success": "#1A7F37", "warning": "#9A6700", "error": "#D1242F", "info": "#0969DA",
              "neutralRamp": { "0": "#FFFFFF", "1": "#F6F8FA", "2": "#EFF2F5", "3": "#E6EAEF", "4": "#E0E6EB", "5": "#DAE0E7", "6": "#D1D9E0",
                               "7": "#C8D1DA", "8": "#818B98", "9": "#59636E", "10": "#454C54", "11": "#393F46", "12": "#25292E", "13": "#1F2328" } },
  "typography": { "uiFamily": "Mona Sans VF", "displayFamily": "Mona Sans", "monoFamily": "ui-monospace (SFMono-Regular, Menlo, Consolas)", "proprietary": false,
                  "googleFallbackUi": "Mona Sans", "googleFallbackDisplay": "Mona Sans",
                  "bodySize": 14, "bodyLineHeight": 21, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 600 },
                  "headingScale": [40, 32, 20, 16] },
  "radius": { "button": 6, "input": 6, "card": 6, "chip": 999, "modal": 12 },
  "button": { "height": { "sm": 28, "md": 32, "lg": 40 }, "paddingX": 12, "minWidth": null, "fontSize": 14, "fontWeight": 500, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#1F883D", "text": "#FFFFFF", "hoverBg": "#1C8139", "activeBg": "#197935", "disabledBg": "#95D8A6", "disabledText": "#EAF7ED" },
              "secondary": { "bg": "#F6F8FA", "text": "#25292E", "border": "#D1D9E0", "hoverBg": "#EFF2F5" },
              "ghost": { "text": "#25292E", "hoverBg": "#F2F3F5" },
              "focus": { "style": "solid outline, inset (plus 3px inset white ring on filled buttons)", "width": 2, "offset": -2, "color": "#0969DA" } },
  "input": { "height": 32, "border": "#D1D9E0", "borderWidth": 1, "radius": 6, "placeholder": "#59636E", "focusBorder": "#0969DA", "errorBorder": "#CF222E" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 12, "itemHeight": 32, "itemHoverBg": "#F2F3F5", "itemSelectedBg": "#ECEEF0", "itemSelectedText": "#1F2328",
                "shadow": "0 0 0 1px #D1D9E040, 0 6px 12px -3px #25292E0A, 0 6px 18px 0 #25292E1F" },
  "tabs": { "style": "underline", "activeIndicator": "#FD8C73", "activeText": "#1F2328" },
  "elevation": { "card": "0 1px 1px 0 #1F23280A, 0 1px 2px 0 #1F232808", "menu": "0 0 0 1px #D1D9E040, 0 6px 12px -3px #25292E0A, 0 6px 18px 0 #25292E1F",
                 "modal": "0 0 0 1px #D1D9E000, 0 40px 80px 0 #25292E3D" },
  "spacingBase": 4,
  "iconStyle": "Octicons (@primer/octicons): outline, 16px and 24px grids"
}
```
Notes on the JSON:
- `ghost.hoverBg`, `itemHoverBg`, `itemSelectedBg` and `disabledText` are the Primer alpha tokens flattened onto white
  (`#818B981A`, `#818B9826`, `#FFFFFFCC`). If the Figma variables accept alpha, use the token values as they are.
- The selected menu item also has a 4px `#0969DA` bar on its left edge (ActionList `selected` pattern).
- `bold` is 600 because Primer has no 700 weight token (`base-text-weight-*` = 300/400/500/600).
- Tab label weight: active tab is 600, inactive is 400 in `#59636E`. The coral bar is 2px, under the label.

## Dark alternative (Primer dark) — values that change
```json
{
  "theme": "dark",
  "colors": { "primary": "#238636", "primaryHover": "#29903B", "primaryActive": "#2E9A40", "secondary": "#1F6FEB", "link": "#4493F8", "focusRing": "#1F6FEB",
              "headerBg": "#151B23", "headerText": "#F0F6FC", "pageBg": "#0D1117", "surface": "#151B23", "border": "#3D444D",
              "textPrimary": "#F0F6FC", "textSecondary": "#9198A1", "textDisabled": "#656C76",
              "success": "#3FB950", "warning": "#D29922", "error": "#F85149", "info": "#4493F8",
              "neutralRamp": { "0": "#010409", "1": "#0D1117", "2": "#151B23", "3": "#212830", "4": "#262C36", "5": "#2A313C", "6": "#2F3742",
                               "7": "#3D444D", "8": "#656C76", "9": "#9198A1", "10": "#B7BDC8", "11": "#D1D7E0", "12": "#F0F6FC", "13": "#FFFFFF" } },
  "button": { "primary": { "bg": "#238636", "text": "#FFFFFF", "hoverBg": "#29903B", "activeBg": "#2E9A40", "disabledBg": "#105823", "disabledText": "#709B7B" },
              "secondary": { "bg": "#212830", "text": "#F0F6FC", "border": "#3D444D", "hoverBg": "#262C36" },
              "ghost": { "text": "#F0F6FC", "hoverBg": "#1F232A" } },
  "input": { "border": "#3D444D", "placeholder": "#9198A1", "focusBorder": "#1F6FEB", "errorBorder": "#DA3633" },
  "dropdown": { "menuBg": "#010409", "itemHoverBg": "#1F232A" },
  "tabs": { "activeIndicator": "#F78166", "activeText": "#F0F6FC" }
}
```
In dark, menus/overlays use `#010409` with a `#3D444D` 1px ring (`--shadow-floating-small`).

## Measured live (Playwright, headless Chromium, 2026-11-25)
- `github.com/login`, light: body `#FFFFFF`, text `#1F2328`, Mona Sans VF 14px/21px. Primary "Sign in" `#1F883D` → hover `#1C8139`.
  It is 40px high (large) with 16px padding, 6px radius, 14px/500, and a 1px `#1F232826` border. Keyboard focus is `outline: 2px solid #0969DA`
  at `outline-offset: -2px`, plus a 3px inset white box-shadow. Secondary "Continue with Google" is `#F6F8FA` with a `#D1D9E0` border
  and `#25292E` text. The input is 40px high with a 6px radius and a 1px `#D1D9E0` border. On focus the border turns `#0969DA` with a
  1px inset `#0969DA` ring. Links are `#0969DA` with no underline.
- `github.com/login`, dark: body `#0D1117`, primary `#238636` → hover `#29903B`, focus `#1F6FEB`, input border `#3D444D`.
  All match the token files exactly.
- `github.com/microsoft/vscode` (logged out): the marketing header is **`#000000`**, 68px, with pill nav buttons (24px radius).
  The logged-in app header could not be measured because I did not log in. Primer's `--header-bgColor` token is `#25292E` (light) and
  `#151B23F2` (dark). The current logged-in AppHeader is visually light (`#F6F8FA`), so `#25292E` is the classic "GitHub header" choice.

## Logo
The Invertocat and wordmark may appear only in **white, black**, or in a few cases grey or green. White on a dark banner is allowed.
Use the highest-contrast option. Do not recolour, modify or put the logo on busy backgrounds. No numeric clear-space rule is
published on github.com/logos. Use of the trademark needs GitHub's written permission.

## Sources
- https://www.npmjs.com/package/@primer/primitives (v11.10.0: `dist/css/functional/themes/light.css`, `dark.css`, `internalCss/*` for
  the neutral ramp, `functional/size/*`, `functional/typography/*`). Colours, sizes, radii, type and shadows come from the **design-system
  tokens. Confidence: high.**
- https://www.npmjs.com/package/@primer/react (Overlay 12px radius plus `shadow-floating-small`; UnderlineNav). **Design-system code. Confidence: high.**
- https://primer.style (Primer docs; patterns for the ActionList selected bar, Label pill and Octicons). **Docs. Confidence: high.**
- https://github.com/login and https://github.com/microsoft/vscode: buttons, inputs, focus, header and fonts in light and dark.
  **Live computed style. Confidence: high.**
- https://github.com/logos: logo colour rules. **Brand guidelines. Confidence: high.**

## Differs from current Figma
GitHub is a **new brand**. It is not yet in the Figma file. The earlier quick value was "dark theme, primary/400-brand style".
- Primer's **primary action colour is green `#1F883D`**, not blue. Blue `#0969DA` is the accent (links, focus, selection, checked controls).
  I propose primary = green and secondary = blue.
- On theme: the recommendation above is **light** (Primer light with the `#25292E` dark banner), not dark. The dark set is fully specified
  if dark is still wanted. Its primary would then be `#238636` and its accent `#1F6FEB` / `#4493F8`.
- Font: replace the Noto Sans placeholder with **Mona Sans**. It is free (OFL) and on Google Fonts, so no fallback is needed.
  Noto Sans is in fact in Primer's own fallback stack.
