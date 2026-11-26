# Hertz — brand UI audit

Audited 2026-11-25 (agent-gev-hertz-omnicom).
- From this network, `hertz.com` redirects to the **legacy "rentacar" site** (EN/IN locale). That site rendered and was measured live.
- The current US site (`hertz.com/us/en`) is an AEM + React app behind Imperva/Incapsula bot protection, and its body stayed empty in headless Chromium. **I did not try to bypass it.**
- The React bundle it served does contain Hertz's in-house MUI-based design system, **"Vulcan"** (`vulcan-aem` clientlibs). It exports `hertzTheme`, `dollarTheme` and `thriftyTheme`; the theme object has `themeName:"Hertz"`.
- The tokens below come from that **Hertz theme object** (palette, typography, shape, component settings), checked against the legacy site's computed styles.

## Summary
- **Hertz Yellow `#FFCC00`** with **black** is the identity (2009 identity: a black wordmark in a yellow parallelogram). Yellow is the hero CTA and the brand bar/footer colour, always with black text.
- The default button colour in Vulcan is **neutral black** (`MuiButton defaultProps color:"neutral"`), so most buttons are black pills. Yellow is reserved for the main CTA.
- A **deep teal `#2F7185`** is the secondary/interactive colour: links, text buttons, input focus, checkboxes, radios, switches, icons.
- **Pill buttons** (radius 64) at 44/56/80px, **Open Sans** everywhere, 4px fields and menus, 8px cards, 16px modals, and yellow tab indicators on **uppercase tabs**.
- Light UI: white surfaces, `#F5F5F5` secondary background, text `#45484A`. Header elements carry a **yellow 4–6px border bar** (legacy header: white with a 4px yellow bottom rule).

## Proposed tokens
```json
{
  "id": "hertz",
  "theme": "light",
  "colors": { "primary": "#FFCC00", "primaryHover": "#FFDE56", "primaryActive": "#FDBF17", "secondary": "#2F7185", "accent": ["#000000", "#FCE92C", "#DBA208"], "link": "#2F7185", "focusRing": "#2F7185",
              "headerBg": "#FFCC00", "headerText": "#000000", "pageBg": "#F5F5F5", "surface": "#FFFFFF", "border": "#D9D9D9", "textPrimary": "#45484A", "textSecondary": "#767676", "textDisabled": "#D9D9D9",
              "success": "#088764", "warning": "#E68938", "error": "#CD2026", "info": "#007BC3",
              "neutralRamp": { "0": "#FFFFFF", "100": "#F5F5F5", "300": "#D9D9D9", "500": "#9D9EA3", "700": "#767676", "900": "#45484A", "1000": "#000000" } },
  "typography": { "uiFamily": "Open Sans", "displayFamily": "Open Sans", "monoFamily": null, "proprietary": false, "googleFallbackUi": "Open Sans", "googleFallbackDisplay": "Open Sans",
                  "bodySize": 16, "bodyLineHeight": 22, "weights": { "regular": 400, "medium": 600, "semibold": 600, "bold": 700 }, "headingScale": [48, 40, 32, 28, 20, 18] },
  "radius": { "button": 64, "input": 4, "card": 8, "chip": 6, "modal": 16 },
  "button": { "height": { "sm": 44, "md": 56, "lg": 80 }, "paddingX": null, "minWidth": null, "fontSize": 16, "fontWeight": 600, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#FFCC00", "text": "#000000", "hoverBg": "#FFDE56", "activeBg": "#FDBF17", "disabledBg": "#E0E0E0", "disabledText": "#D9D9D9" },
              "secondary": { "bg": "transparent", "text": "#45484A", "border": "#45484A", "hoverBg": null },
              "ghost": { "text": "#2F7185", "hoverBg": null },
              "focus": { "style": "MUI default focus-visible (no custom ring in theme); fields switch border to secondary teal", "width": null, "offset": null, "color": "#2F7185" } },
  "input": { "height": 56, "border": "#9D9EA3", "borderWidth": 1, "radius": 4, "placeholder": "#45484A", "focusBorder": "#2F7185", "errorBorder": "#CD2026" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 4, "itemHeight": null, "itemHoverBg": "#F5F5F5", "itemSelectedBg": "#F5F5F5", "itemSelectedText": "#45484A", "shadow": "0px 4px 8px 0px rgba(0,0,0,0.08)" },
  "tabs": { "style": "underline", "activeIndicator": "#FFCC00", "activeText": "#000000" },
  "elevation": { "card": "0px 4px 8px 0px rgba(0,0,0,0.16)", "menu": "0px 4px 8px 0px rgba(0,0,0,0.08)", "modal": null },
  "spacingBase": 4,
  "iconStyle": "custom SVG icon set on MUI SvgIcon, 2px stroke (outline), default colour secondary teal"
}
```

### Notes behind the values (Vulcan `hertzTheme`)
- **Palette**:
  - primary `100 #FFF9DF · 300 #FFDE56 · 500 #FFCC00 · 700 #FDBF17 · 900 #DBA208`
  - secondary `100 #F6FDFF · 300 #73BDD4 · 500 #2F7185 · 700 #205D70 · 900 #083B4A`
  - error `#FEEFF0 #F03C42 #CD2026 #B4151A`
  - info `#ECF6FC #0D8ED9 #007BC3 #00598D`
  - success `#EBF9F5 #0AB284 #088764 #036248`
  - warning `#FFF9ED #FCB022 #E68938 #AF5403`
  - monochrome `#F5F5F5 #D9D9D9 #9D9EA3 #767676 #45484A`
  - "vibrant" gradient: `linear-gradient(112deg, #FCE92C 18.93%, #FFCC00 67.36%)`, used on promotion badges and the vibrant button.
  - Text tokens: primary `#45484A`, secondary `#767676`, disabled `#D9D9D9`. Backgrounds: primary `#FFFFFF`, secondary `#F5F5F5`.
- **Button** (`customComponents.Button`):
  - Heights small 44, medium 56, large 80. `borderRadius: 64` (pill). Label 16px/600, line-height 1, `textTransform: none`. No shadow in any state. Ripple disabled.
  - Contained primary: `#FFCC00` → hover `#FFDE56` → active `#FDBF17`, black contrast text.
  - Contained secondary: `#2F7185` → `#205D70` → `#083B4A`, white text.
  - Contained neutral (the **default**): `#000000` → hover `#45484A` → active `#000000`.
  - Outlined neutral: `#45484A` → hover `#000000`. I mapped this to `secondary` above.
  - Text buttons: `#2F7185` → `#205D70` → `#083B4A`.
- **Disabled**: `action.disabled #D9D9D9`. The disabled background is MUI's untouched default `rgba(0,0,0,.12)`, about `#E0E0E0` on white. Contrast is weak, but it is what the source does.
- **TextField**: border `#9D9EA3`, filled border `#45484A`, focused border `#2F7185`, radius 4, placeholder `#45484A`, input weight 600, disabled bg `#F5F5F5`, icon size 24. The 56px height is MUI's outlined default; the theme does not override it (medium confidence).
- **Dropdown**: radius 4, menu elevation 2 (`0 4px 8px rgba(0,0,0,.08)`), border 0, options with square corners, padding 8px vertical and 8–16px horizontal. Selected/hover uses `action.selected #F5F5F5`.
- **Tabs**: padding 16×20px, **uppercase**, indicator `#FFCC00`. **Chip**: radius 6, teal fill (hover `#205D70`). **Card**: radius 8, border `#D9D9D9`. Value-add cards use elevation 3 and a **4px yellow bottom border on the media**. **Modal**: radius 16. **Alert/Popover**: radius 4. Popover highlight runs teal on top and yellow on the bottom.
- **Link**: primary `#2F7185`, underlined, hover `#205D70` with no underline, active `#083B4A`. Secondary link: black.
- **Header**: 64/72/80px tall, yellow `borderBackground`, bottom border 4/4/6px, elevation shadow. The logo is 24/32/40px tall.
- **Footer**: **yellow `#FFCC00` background with black text**, plus monochrome and black variants. The legacy header is **white with a 4px yellow bottom rule**. For the Bluebird brand-colour banner I propose **yellow with a black logo and text**: white on yellow fails contrast. A black banner with a yellow logo is the alternative.
- **Typography**: `'Open Sans', sans-serif`. h1 32/42/48, h2 28/36/40, h3 24/28/32, h4 22/24/28, h5 20, h6 18, all weight 400. body1 18, body2 16, body3 14, caption 12, line-height 1.4. Weights map light/regular 400, medium/semibold 600, bold 700.
- **Spacing**: 4px base. Shadows ladder `0 0 6px rgba(0,0,0,.16)`, then `0 4px 8px` at .08/.16/.20/.24/.28/.32, `0 8px 12px .32`, `0 8px 16px .40`, `0 8px 32px .08`.
- **Legacy rentacar site (live)**:
  - Body Open Sans 12px `#222222` on `#F3F4F8`. White header 64px. Nav links 14px `#222222`. Utility links bold 16px `#365AD8` (legacy blue, not in Vulcan).
  - "View Vehicles" CTA: `#FFCC00` with black 18px/700 label, 72px tall, **2px radius**, 2px yellow border. The square legacy CTA has been replaced by the pill in Vulcan.
  - Inputs: 70px floating-label fields with a 1px `#C4C6CC` border and square corners. Select: 4px radius, `#CCCCCC` border.

## Typography
- **Open Sans**, served from hertz.com as a webfont. It is free on Google Fonts, so no fallback is needed. Not proprietary.
- The bundle also declares Rubik and Public Sans. These belong to the Dollar and Thrifty themes, not Hertz.

## Logo
- Black "Hertz" wordmark inside a **yellow parallelogram** (USPTO description), or black on white with a yellow underline in the web header.
- On yellow surfaces the black wordmark is used. A reversed white logo is **not** observed, so prefer black on yellow or yellow on black.
- No public clear-space rule was found. Third-party Pantone values disagree (PMS 803 C / `#FFF400` vs `#F9DC30`) and are unverified. The UI token is `#FFCC00`.

## Sources
- https://www.hertz.com/ (redirects to https://www.hertz.com/rentacar/reservation/) — computed styles for the header, CTA, inputs and links. **Live computed, high** for the legacy site.
- https://www.hertz.com/us/en — the page body was blocked by Imperva in headless Chromium, so nothing could be measured. The served bundle `…/etc.clientlibs/vulcan-aem/clientlibs/…chunk.js` contains the Vulcan `hertzTheme`. **Design-system source, high** for palette, type, shape and button tokens; **medium** for how they render, since I could not see them rendered.
- https://trademark.justia.com/878/90/hertz-87890365.html — logo description (medium).
- https://brandpalettes.com/hertz-global-holdings-logo-colors/, https://madegooddesigns.com/hertz-brand-guidelines/ — Pantone claims, **third-party, low**, not used for tokens.
- https://www.communicatemagazine.com/article/paint-the-world-yellow/ — background on the 2009 "own the colour yellow" identity (low).

## Differs from current Figma
- Hertz is a **new brand**: there is no mode in the current Figma table.
- The earlier quick value (another file) was primary `#FFD100` on a dark theme. The Hertz design system and the live site both use **`#FFCC00`**: change it.
- "Dark theme" is **not supported** by the evidence. Vulcan's Hertz theme is light (white and `#F5F5F5` surfaces, `#45484A` text). Black appears as the default button colour and as an optional footer, not as the page theme.
- Add secondary **`#2F7185`** (teal) for links, focus and selection, and add black as the default (neutral) button colour.
