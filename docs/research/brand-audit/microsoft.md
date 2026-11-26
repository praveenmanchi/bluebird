# Microsoft — Fluent 2 (Fluent UI React v9 web theme)

## Summary
Fluent 2 is compact and calm. Controls are **32 px** high with small **4 px** radii. Buttons use 14 px **semibold** Segoe UI with a 96 px min-width. Inputs are distinctive: a light grey 1 px box (`#D1D1D1`) with a **darker bottom edge** (`#616161`), and the bottom becomes a 2 px brand-blue underline on focus. Brand blue `#0F6CBD` is used sparingly (primary button, selected tab indicator, focus underline). Most chrome is neutral greys `#242424` → `#FAFAFA`. Focus is a high-contrast **black 2 px ring** with an inner white ring, not blue. Selected tabs have a 3 px rounded blue underline. Surfaces lift with soft two-layer shadows (`shadow4`, `shadow16`). Icons are the Fluent UI System Icons: regular (outline) by default and filled when selected. microsoft.com (marketing) is a looser variant: 40 px, 8 px-radius CTAs in `#0078D4`, a white 54 px header, and Segoe UI Variable.

## Proposed tokens
```json
{
  "id": "microsoft",
  "theme": "light",
  "colors": { "primary": "#0F6CBD", "primaryHover": "#115EA3", "primaryActive": "#0C3B5E", "secondary": "#0078D4",
              "accent": ["#F25022", "#7FBA00", "#00A4EF", "#FFB900"], "link": "#115EA3", "focusRing": "#000000",
              "headerBg": "#FFFFFF", "headerText": "#262626", "pageBg": "#FAFAFA", "surface": "#FFFFFF", "border": "#D1D1D1",
              "textPrimary": "#242424", "textSecondary": "#424242", "textDisabled": "#BDBDBD",
              "success": "#107C10", "warning": "#F7630C", "error": "#C50F1F", "info": "#0F6CBD",
              "neutralRamp": { "14": "#242424", "26": "#424242", "38": "#616161", "44": "#707070", "70": "#B3B3B3", "74": "#BDBDBD",
                               "78": "#C7C7C7", "82": "#D1D1D1", "88": "#E0E0E0", "92": "#EBEBEB", "94": "#F0F0F0", "96": "#F5F5F5", "98": "#FAFAFA", "100": "#FFFFFF" } },
  "typography": { "uiFamily": "Segoe UI", "displayFamily": "Segoe UI Variable Display", "monoFamily": "Consolas", "proprietary": true,
                  "googleFallbackUi": "Open Sans", "googleFallbackDisplay": "Open Sans",
                  "bodySize": 14, "bodyLineHeight": 20, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [16, 20, 24, 28, 32, 40, 68] },
  "radius": { "button": 4, "input": 4, "card": 4, "chip": 4, "modal": 8 },
  "button": { "height": { "sm": 24, "md": 32, "lg": 40 }, "paddingX": 12, "minWidth": 96, "fontSize": 14, "fontWeight": 600, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#0F6CBD", "text": "#FFFFFF", "hoverBg": "#115EA3", "activeBg": "#0C3B5E", "disabledBg": "#F0F0F0", "disabledText": "#BDBDBD" },
              "secondary": { "bg": "#FFFFFF", "text": "#242424", "border": "#D1D1D1", "hoverBg": "#F5F5F5" },
              "ghost": { "text": "#424242", "hoverBg": "#F5F5F5" },
              "focus": { "style": "2px black ring drawn inside the border (1px border + 1px inset #000000) with 1px inner #FFFFFF", "width": 2, "offset": 0, "color": "#000000" } },
  "input": { "height": 32, "border": "#D1D1D1", "borderWidth": 1, "radius": 4, "placeholder": "#707070", "focusBorder": "#0F6CBD", "errorBorder": "#D13438" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 4, "itemHeight": 32, "itemHoverBg": "#F5F5F5", "itemSelectedBg": "#FFFFFF", "itemSelectedText": "#242424",
                "shadow": "0 0 2px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.14)" },
  "tabs": { "style": "underline", "activeIndicator": "#0F6CBD", "activeText": "#242424" },
  "elevation": { "card": "0 0 2px rgba(0,0,0,0.12), 0 2px 4px rgba(0,0,0,0.14)", "menu": "0 0 2px rgba(0,0,0,0.12), 0 8px 16px rgba(0,0,0,0.14)", "modal": "0 0 8px rgba(0,0,0,0.12), 0 32px 64px rgba(0,0,0,0.14)" },
  "spacingBase": 4,
  "iconStyle": "Fluent UI System Icons: regular (outline) default, filled for selected/active; 20 px in 32 px controls"
}
```

### Notes on values
- **Brand ramp (web)**: background `#0F6CBD`, hover `#115EA3`, pressed `#0C3B5E`, selected `#0F548C`. Dark theme brand bg is `#115EA3` and foreground/link `#479EF5`.
- **Buttons**: padding 5 px × 12 px and border 1 px on every appearance. *Secondary* ("default" appearance) is white with a `#D1D1D1` border that turns `#C7C7C7` on hover, with `#F5F5F5` bg. *Outline* is transparent with a `#D1D1D1` border. *Subtle* (ghost) is transparent `#424242` text and turns `#F5F5F5` with `#242424` text on hover. *Transparent* gets no bg on hover and brand-colour text. Sizes: small 24 px (padding 3/8, 12 px text, radius 2, min-width 64), medium 32, large 40 (padding 8/16, 16 px text, radius 6, min-width 96).
- **Disabled**: bg `#F0F0F0`, text `#BDBDBD`, border `#E0E0E0`.
- **Focus**: Fluent uses black `#000000` (`colorStrokeFocus2`) with a white inner ring `#FFFFFF` (`colorStrokeFocus1`). On primary it shows as a 1 px black border, a 1 px black inset and a 2 px white inset (measured). In dark mode the colours swap.
- **Input**: 1 px `#D1D1D1` box and a bottom border `#616161` (`colorNeutralStrokeAccessible`). Hover changes these to `#C7C7C7` and `#575757`. Focus shows a 2 px `#0F6CBD` bottom underline (`colorCompoundBrandStroke`). Error border is `#D13438` and error text `#BC2F32`. Text 14 px. Filled variants use `#FAFAFA` or `#F5F5F5` bg.
- **Dropdown/Menu**: trigger is the same as the input with a chevron. The listbox/menu is white, radius 4, padding 4, shadow16, min-width 160. Options are 32 px (20 px line plus 6 px vertical padding), radius 4, padding-x 8, hover `#F5F5F5`, pressed `#E0E0E0`. Selection shows a checkmark only. Menu selected-state bg `#EBEBEB` (`colorNeutralBackground1Selected`).
- **Tabs (TabList)**: transparent tabs, 14 px. The selected tab is semibold `#242424` with a **3 px** `#0F6CBD` underline with rounded ends. On hover the indicator is `#D1D1D1`. A vertical variant exists. *Medium* confidence: from Fluent docs; the Storybook TabList story did not load in headless.
- **Checkbox**: 16 px, radius 2, 1 px `#616161` border, `#0F6CBD` fill when checked. **Switch**: 40×20 pill, `#0F6CBD` when on. **Radio**: 16 px, `#0F6CBD` dot.
- **Links**: `#115EA3`, hover `#0F548C` with underline, pressed `#0C3B5E`. No underline at rest inside apps; underlined inline in body text.
- **Cards**: white, radius 4 (medium card; 6 px for large), `shadow4`, no border. Dialog: radius 8 and `shadow64`.
- **Status**: solid fills success `#107C10`, warning `#F7630C`, danger `#C50F1F`. Text-safe foregrounds success `#0E700E`, warning `#BC4B09`, danger `#B10E1C`. Fluent has no separate "info" hue; the informative MessageBar is neutral, so info = brand.
- **Type ramp (Fluent 2)**: caption 12/16, body1 14/20, subtitle2 16/22 600, subtitle1 20/28 600, title3 24/32 600, title2 28/36 600, title1 32/40 600, large title 40/52 600, display 68/92 600. **Open Sans** was designed by the same designer as Segoe UI (Steve Matteson) and is the closest Google font. Selawik, Microsoft's own open fallback, is not on Google Fonts.
- **Logo**: the four-square logo colours are `#F25022`, `#7FBA00`, `#00A4EF` and `#FFB900`, listed as accents (**low** confidence: well-known brand values, not measured). Microsoft permits a one-colour white logo on dark or coloured grounds. The clear-space rule is in the Microsoft brand guidelines, **not verified**.

## Live verification (Playwright, 2026-11-25)
- **Fluent 2 components** (react.fluentui.dev Storybook iframes, headless):
  - Primary button: `#0F6CBD` → hover `#115EA3`, 32 px, padding 12, 14/600, radius 4, min-width 96.
  - Default button: white with 1 px `#D1D1D1` → hover `#F5F5F5`/`#C7C7C7`.
  - Subtle button: `#424242` → hover `#F5F5F5`.
  - Input: 32 px, radius 4, `#D1D1D1` box with `#616161` bottom → hover `#C7C7C7`/`#575757`.
  - Dropdown listbox: white, radius 4, `0 0 2px rgba(0,0,0,.12), 0 8px 16px rgba(0,0,0,.14)`, option hover `#F5F5F5`.
  - Tag: `#F5F5F5`, 32 px, radius 4.
  - Theme tokens dumped from npm `@fluentui/react-theme@9.2.3` (`webLightTheme` / `webDarkTheme`).
- **microsoft.com/en-us** (marketing):
  - Header `header.uhf-header`: `#FFFFFF`, 54 px, text `#262626`, Segoe UI Variable Text.
  - Blue CTA "Get offer": `#0078D4` → hover `#006DC1`, 40 px, padding 16, 15/600, radius 8. Focus is a 3 px dotted white outline offset -6.
  - White CTA: `#FFFFFF` → hover `#D7D2CB`. Headings h1 62/500 `#0E1726`. Header links `#0067B8`.
  - Chat pills radius 16, `#E6EFFD` bg.
  - No cookie banner was shown to the US locale.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| All colour, radius, type, shadow, stroke tokens | npm `@fluentui/react-theme@9.2.3` (`webLightTheme`, `webDarkTheme`) | high |
| Button, input, dropdown, tag sizes and states | Live computed style, https://react.fluentui.dev/ Storybook (iframe stories) | high |
| Tabs indicator, checkbox/switch, card radius | Fluent 2 docs (https://fluent2.microsoft.design/) and v9 component styles, not measured | medium |
| Header, marketing CTA, Segoe UI Variable | Live computed style, https://www.microsoft.com/en-us | high (marketing site) |
| Logo colours, logo reversal / clear space | Microsoft brand convention, guideline page not fetched | low |
- https://www.npmjs.com/package/@fluentui/react-theme
- https://react.fluentui.dev/
- https://fluent2.microsoft.design/
- https://www.microsoft.com/en-us

## Differs from current Figma
- **Primary `#0F6CBD`**: matches Fluent 2 `colorBrandBackground` exactly. Add hover `#115EA3` and pressed `#0C3B5E`. Note that microsoft.com marketing CTAs use the older communication blue `#0078D4` instead.
- **Secondary `#107C10`** is Fluent's **success** green (`colorStatusSuccessBackground3`, also Xbox green). Using it as a brand secondary will clash with success states. Fluent has no brand secondary; the secondary button is neutral (white with a `#D1D1D1` border). Suggest secondary `#0078D4` (Microsoft blue as used on microsoft.com), or the neutral `#242424`.
- From the AkzoNobel copy-over, change: radius to 4 (8 on dialogs); controls to 32 px; button text to **semibold 600**; input with a darker bottom border; **black** focus ring; font Noto Sans → **Open Sans**; 3 px underline tabs.
- **Banner**: microsoft.com and Fluent apps use a neutral/white header. If a coloured banner is kept, `#0F6CBD` with the white logo fits Fluent better than green.
