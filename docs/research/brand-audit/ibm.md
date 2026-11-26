# IBM — Carbon Design System (v11)

## Summary
Carbon is very recognisable. It uses square corners (0 px) on buttons, inputs, tiles and modals, and only tags are pills. The UI is flat with no shadows except on menus. Text fields are grey fills with a 1 px bottom rule, not boxed. Buttons are 48 px tall with left-aligned 14 px regular-weight text and wide right padding, which leaves room for an icon. One IBM Blue (`#0F62FE`) drives every interactive state, and focus is a 2 px blue inset ring. The type is IBM Plex Sans, which is open source and on Google Fonts, set in light (300) for large display sizes. Product shells (IBM Cloud, watsonx) use the dark Gray 100 `#161616` UI Shell header over a white or Gray 10 body. ibm.com itself now uses a white masthead and **4 px** rounded CTAs and cards. That is a marketing variant, not the Carbon product default.

## Proposed tokens
```json
{
  "id": "ibm",
  "theme": "light",
  "colors": { "primary": "#0F62FE", "primaryHover": "#0050E6", "primaryActive": "#002D9C", "secondary": "#393939",
              "accent": ["#009D9A", "#8A3FFC", "#1192E8"], "link": "#0F62FE", "focusRing": "#0F62FE",
              "headerBg": "#161616", "headerText": "#F4F4F4", "pageBg": "#FFFFFF", "surface": "#F4F4F4", "border": "#C6C6C6",
              "textPrimary": "#161616", "textSecondary": "#525252", "textDisabled": "#C6C6C6",
              "success": "#24A148", "warning": "#F1C21B", "error": "#DA1E28", "info": "#0043CE",
              "neutralRamp": { "10": "#F4F4F4", "20": "#E0E0E0", "30": "#C6C6C6", "40": "#A8A8A8", "50": "#8D8D8D",
                               "60": "#6F6F6F", "70": "#525252", "80": "#393939", "90": "#262626", "100": "#161616" } },
  "typography": { "uiFamily": "IBM Plex Sans", "displayFamily": "IBM Plex Sans", "monoFamily": "IBM Plex Mono", "proprietary": false,
                  "googleFallbackUi": "IBM Plex Sans", "googleFallbackDisplay": "IBM Plex Sans",
                  "bodySize": 14, "bodyLineHeight": 20, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [14, 16, 20, 28, 32, 42, 54] },
  "radius": { "button": 0, "input": 0, "card": 0, "chip": 16, "modal": 0 },
  "button": { "height": { "sm": 32, "md": 40, "lg": 48 }, "paddingX": 15, "minWidth": null, "fontSize": 14, "fontWeight": 400, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#0F62FE", "text": "#FFFFFF", "hoverBg": "#0050E6", "activeBg": "#002D9C", "disabledBg": "#C6C6C6", "disabledText": "#8D8D8D" },
              "secondary": { "bg": "#393939", "text": "#FFFFFF", "border": "#393939", "hoverBg": "#474747" },
              "ghost": { "text": "#0F62FE", "hoverBg": "#E8E8E8" },
              "focus": { "style": "inset ring: 2px #0F62FE border + 1px #FFFFFF inner inset", "width": 2, "offset": 0, "color": "#0F62FE" } },
  "input": { "height": 40, "border": "#8D8D8D", "borderWidth": 1, "radius": 0, "placeholder": "#A2A2A2", "focusBorder": "#0F62FE", "errorBorder": "#DA1E28" },
  "dropdown": { "menuBg": "#F4F4F4", "menuRadius": 0, "itemHeight": 40, "itemHoverBg": "#E8E8E8", "itemSelectedBg": "#E0E0E0", "itemSelectedText": "#161616", "shadow": "0 2px 6px rgba(0,0,0,0.3)" },
  "tabs": { "style": "underline", "activeIndicator": "#0F62FE", "activeText": "#161616" },
  "elevation": { "card": "none", "menu": "0 2px 6px rgba(0,0,0,0.3)", "modal": "0 2px 6px rgba(0,0,0,0.3)" },
  "spacingBase": 8,
  "iconStyle": "outline, 16/20/24/32 px, Carbon icons (@carbon/icons, 2 px-ish stroke, square terminals)"
}
```

### Notes on values
- **Button layout**: padding is `15px` start and `63px` end (`calc(1rem*3 + 1rem - 1px)`). Text is left-aligned with `justify-content: space-between`, and the icon sits at the far right. Max width is `20rem`. There is no min-width token. Default size is `lg` 48 px, with `sm` 32, `md` 40, `xl` 64 and `2xl` 80. Product forms and modals often use `md` 40.
- **Tertiary** (outline) button: transparent background, 1 px `#0F62FE` border and blue text. On hover it fills `#0050E6` with white text. Carbon calls the text-only button "ghost": blue text that gets a `#E8E8E8` (layer-hover) background on hover.
- **Disabled**: bg `#C6C6C6` and text `#8D8D8D` (`button-disabled` and `text-on-color-disabled`).
- **Input**: fill `#F4F4F4` (field-01) with a 1 px bottom border only, `#8D8D8D` (border-strong-01). On focus it gets a 2 px `#0F62FE` outline with offset -2. The error state also uses a 2 px `#DA1E28` outline. Placeholder is `rgba(22,22,22,0.4)`, about `#A2A2A2` on the field. Hover fill is `#E8E8E8`.
- **Dropdown**: the trigger looks like the input (grey fill, bottom rule, chevron). Menu items are 14 px in `#525252` (text-secondary), and the selected item is `#E0E0E0` with `#161616` text.
- **Tabs**: line tabs. Every tab has a 2 px `#E0E0E0` bottom border, and the selected tab has a 2 px `#0F62FE` bottom border with `#161616` semibold text. Inactive tabs are `#525252`. A "contained" variant also exists (grey filled tabs, selected one white with a top blue bar).
- **Checkbox**: 16 px box, radius 2 px, 1 px `#161616` border, and `#161616` fill when checked (not blue). **Toggle**: 48×24 pill, `#24A148` green when on. **Radio**: 1 px `#161616` ring.
- **Links**: `#0F62FE` with no underline. On hover they turn `#0043CE` and get an underline. On focus they get a 2 px `#0F62FE` outline. Visited links are `#8A3FFC`.
- **Tiles/cards**: `#F4F4F4` fill, no border, no shadow, square corners. ibm.com cards use a white fill, a 1 px `#C6C6C6` border, 4 px radius and a `#E8E8E8` hover.
- **Dark theme option** (g100): background `#161616`, layer `#262626`, text `#F4F4F4`, link `#78A9FF`, focus `#FFFFFF`, interactive `#4589FF`. Primary button stays `#0F62FE`.
- **Type**: body-01 is 14/20 with letter-spacing 0.16 px, and body-compact-01 is 14/18. Productive headings: 01 14/18 600, 02 16/22 600, 03 20/28 400, 04 28/36 400, 05 32/40 400, 06 42/50 300, 07 54/64 300. ibm.com hero h1 measured at 300 weight, about 54 px.
- **Logo**: the IBM 8-bar logo is used in white on dark and IBM Blue grounds (the ibm.com footer and UI Shell show it reversed), so a white logo on our banner is acceptable. Clear-space rule: IBM Brand Center (ibm.com/brand) defines it relative to the logo height. **Not verified** in this audit.

## Live verification (Playwright, 2026-11-25)
- `ibm.com/products/watsonx-ai`, `button.cds--btn--primary` "Start free trial": bg `#0F62FE`, hover `#0050E6`, 48 px high, padding 15/63, IBM Plex Sans 16/400 (the expressive size on marketing pages), radius **4 px**. Focus is an inset 1 px white plus 2 px `#161616`, because that button sits on a dark section.
- Masthead (`c4d-masthead` and `.cds--header`): bg `#FFFFFF`, 48 px plus a 1 px border, nav items 16 px `#525252`. Header search focus: 2 px `#0F62FE` border.
- Body links: `#0F62FE`, hover `#0043CE` with underline, focus 2 px solid `#0F62FE` outline offset 1.
- Anchor-nav "tabs": active `#0F62FE` 600, inactive `#161616` 400.
- Cookie banner (TrustArc) had only "Accept All" and "More options", so it was **not accepted**. The page was read underneath it.
- `:root` exposes `--cds-*` tokens. ibm.com sets g100 values on root for its dark sections (`--cds-background #161616`, `--cds-link-primary #78A9FF`).

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Colour tokens (white and g100 themes), button, input, menu, tab, tag and modal CSS | npm `@carbon/styles@1.120.0` compiled `css/styles.css` (`.cds--white`, `.cds--g100`) and `@carbon/colors@11.62.0` | high (design-system package) |
| Type scale, Plex families | `@carbon/styles` type tokens; ibm.com `document.fonts` list (IBM Plex Sans/Mono/Serif) | high |
| Primary button, link, masthead, card, focus | Live computed style: https://www.ibm.com/us-en and https://www.ibm.com/products/watsonx-ai | high |
| Header = `#161616` for product shells | Carbon UI Shell g100 convention (IBM Cloud). Not measured live (needs login) | medium |
| Logo reversal and clear space | IBM Brand Center (ibm.com/brand). Not fetched | low |
- https://www.npmjs.com/package/@carbon/styles
- https://www.npmjs.com/package/@carbon/colors
- https://carbondesignsystem.com/
- https://www.ibm.com/us-en
- https://www.ibm.com/products/watsonx-ai

## Differs from current Figma
- **Primary `#0F62FE`**: matches Carbon `blue-60` / `button-primary` exactly. Add hover `#0050E6` and active `#002D9C`. The Carbon hover is not blue-70; `#0043CE` is used for link hover.
- **Secondary `#009D9A`**: this is Carbon **teal-50**, a data-vis and accent colour. It is not used for UI controls. Carbon's secondary button is Gray 80 `#393939`. Suggest secondary `#393939` and keeping `#009D9A` as an accent only. Note that teal-60 is `#007D79`.
- The AkzoNobel copy-over is wrong on most structural points for IBM. Radius should be **0** (only tags are 16 px pills). The font should be **IBM Plex Sans**, free on Google Fonts, instead of Noto Sans. Inputs should be grey-filled with a bottom border only. Buttons should be 48/40/32 px with regular-weight 14 px text. The banner should be `#161616` with white text and a white logo.
