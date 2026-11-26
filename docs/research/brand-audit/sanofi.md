# Sanofi: Elements design system

## Summary
Sanofi's digital estate runs on its own design system, **Elements**. It is built with Rangle, uses Tokens Studio, and was a Design System Awards 2025 entry. The docs are not public, but sanofi.com ships the full Elements token set as `--elements-*` CSS variables on `:root`, and those variables are the source here. The look is clean and white, with a white header, black (`#171717`) text, and one saturated **violet `#7A00E6`** used for CTAs, accents and links. Hover darkens it to `#5718B0`, and the deepest brand shade is aubergine `#23004C`. Type is the proprietary **Sanofi Sans** (bold for headings, regular for buttons), and Sanofi's own CSS falls back to **Work Sans**. Corners are soft rather than round: 4 px on buttons and 8 px on cards. Focus is a thick **4 px dark-violet (`#3C217B`) box-shadow ring**. Greys are neutral, with no tint.

## Proposed tokens
```json
{
  "id": "sanofi",
  "theme": "light",
  "colors": { "primary": "#7A00E6", "primaryHover": "#5718B0", "primaryActive": "#3C217B", "secondary": "#23004C",
              "accent": ["#8966DB", "#B3A8E6", "#FAF5FF"], "link": "#7A00E6", "focusRing": "#3C217B",
              "headerBg": "#7A00E6", "headerText": "#FFFFFF", "pageBg": "#FFFFFF", "surface": "#F5F5F5", "border": "#C9C9C9",
              "textPrimary": "#171717", "textSecondary": "#5D5D5D", "textDisabled": "#AEAEAE",
              "success": "#067647", "warning": "#B54708", "error": "#B42318", "info": "#175CD3",
              "neutralRamp": { "50": "#F5F5F5", "100": "#E4E4E4", "200": "#C9C9C9", "300": "#AEAEAE", "400": "#939393", "500": "#757575",
                               "600": "#5D5D5D", "700": "#434343", "800": "#282828", "900": "#171717", "950": "#0A0A0A" } },
  "typography": { "uiFamily": "Sanofi Sans", "displayFamily": "Sanofi Sans", "monoFamily": null, "proprietary": true,
                  "googleFallbackUi": "Work Sans", "googleFallbackDisplay": "Work Sans",
                  "bodySize": 16, "bodyLineHeight": 24, "weights": { "regular": 400, "medium": 400, "semibold": 700, "bold": 700 },
                  "headingScale": [20, 24, 28, 36, 48] },
  "radius": { "button": 4, "input": 4, "card": 8, "chip": null, "modal": null },
  "button": { "height": { "sm": null, "md": 44, "lg": 48 }, "paddingX": 24, "minWidth": null, "fontSize": 16, "fontWeight": 400, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#7A00E6", "text": "#FFFFFF", "hoverBg": "#5718B0", "activeBg": "#3C217B", "disabledBg": "#AEAEAE", "disabledText": "#FFFFFF" },
              "secondary": { "bg": "#F5F5F5", "text": "#7A00E6", "border": "#F5F5F5", "hoverBg": "#F5F5F5" },
              "ghost": { "text": "#7A00E6", "hoverBg": "#EDEBF1" },
              "focus": { "style": "box-shadow ring 0 0 0 4px, no offset", "width": 4, "offset": 0, "color": "#3C217B" } },
  "input": { "height": null, "border": "#5D5D5D", "borderWidth": 1, "radius": 4, "placeholder": "#5D5D5D", "focusBorder": "#3C217B", "errorBorder": "#D72B3F" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": null, "itemHeight": null, "itemHoverBg": "#FAF5FF", "itemSelectedBg": "#FAF5FF", "itemSelectedText": "#7A00E6", "shadow": "0 2px 8px 0 rgba(0,0,0,0.2)" },
  "tabs": { "style": "underline", "activeIndicator": "#7A00E6", "activeText": "#171717" },
  "elevation": { "card": "0 1px 4px 0 rgba(0,0,0,0.2)", "menu": "0 2px 8px 0 rgba(0,0,0,0.2)", "modal": "0 6px 24px 0 rgba(0,0,0,0.2)" },
  "spacingBase": 4,
  "iconStyle": "Font Awesome 6/7 (loaded on sanofi.com), regular-weight glyphs"
}
```

### Notes on the tokens
- **Brand ramp** (`--elements-core-brand-*`): lightest `#FAF5FF`, lighter `#B3A8E6`, light `#8966DB`, **base `#7A00E6`**, dark `#5718B0`, darker `#3C217B`, darkest `#23004C`. Semantic mapping: `accent-default` = base, `accent-hover` = dark, `accent-active` and `accent-focus` = darker, `border-highlight` and `text-highlight` = darkest. `brand-secondary-*` and `brand-tertiary-*` are currently identical to brand, so the slots exist but this mode does not fill them.
- **Measured CTA (live):** "Learn more" is `#7A00E6`, white, 44 px high, 24 px side padding, 4 px radius, Sanofi Sans 400 16 px, no border. Hover is `#5718B0`. Focus is `box-shadow: 0 0 0 4px #3C217B` with no outline. The secondary "Global" button is 48 px, `#F5F5F5` fill with a 1 px `#F5F5F5` border and `#7A00E6` text. On hover only the text changes, to `#5718B0`.
- **Token versus site:** the Elements component tokens say secondary and tertiary buttons use `brand-darkest_alpha` = `rgba(35,0,76,.08)`, which is `#EDEBF1` on white. I used that for ghost hover. The live site's neutral `#F5F5F5` comes from a site override.
- **Disabled:** `semantic-accent-disabled` and `text-disabled` are both neutral-300 `#AEAEAE`. Button disabled styling was not observed live.
- **Inputs:** no text input appears on the public pages (the search icon opens a separate route that returned 404 to the headless browser). The values come from tokens: `border-default` `#5D5D5D`, `border-error` `#D72B3F`, focus from `accent-focus` `#3C217B`, helper or placeholder text `#5D5D5D`, border width thin = 1 px (`.063rem`). Radius 4 px matches the button and `--elements-radius-sm`. Height is unknown.
- **Status (text/accent defaults):** success `#067647`, warning ("alert") `#B54708`, error `#B42318`, info `#175CD3`. Fill bases are green `#079455`, orange `#EE7404`, red `#D72B3F` and blue `#1570EF`. Subtle backgrounds are `#F6FEF9` / `#FFFCF5` / `#FFFBFA` / `#F5FAFF`.
- **Radius scale:** none 0, sm 4, md 8, lg 12, xl 16, rounded 9999. Link cards on the home page measure 8 px.
- **Spacing:** 3xs 2, 2xs 4, xs 8, sm 12, md 16, lg 20, xl 24, 2xl 32, 3xl 40, 4xl 48, 5xl 64. The base is 4 px.
- **Elevation 01–05:** `0 1px 4px`, `0 2px 8px`, `0 4px 16px`, `0 6px 24px`, `0 12px 32px`, all at `rgba(0,0,0,.2)`.
- **Type:** font sizes 12, 14, 16, 18, 20, 24, 28, 32, 36, 40, 48, 56, 64, 72, 80. Weights are only Light 300, Regular 400 and Bold 700; there is no medium or semibold. Measured h1 is 48/72 Bold and h2 36/54 Bold, with body 16/24 and body2 14/21. There is also a **Sanofi Serif** editorial face, with fallback IBM Plex Serif.
- **headerBg:** sanofi.com's header is white (`#FFFFFF`, 1 px `#F5F5F5` bottom rule, black logo with a violet dot). The footer is **black** with a **white logo**, so a reversed logo is in real use. For our coloured banner, `#7A00E6` with a white logo is the recognisable choice. `#23004C` is the quieter alternative if contrast or brand teams object.
- **Tabs and dropdowns** were not observable. Their values are inferred from the semantic tokens (**low**).

## Sources
- https://www.sanofi.com/en: `:root` `--elements-*` token set (colours, radius, spacing, type, elevation, motion), header, H1/H2 and CTA computed styles, and hover/focus states via Playwright. The cookie banner was dismissed with "Reject all". (live computed style, **high**)
- https://rangle.io/cases/sanofi: background on Elements as Sanofi's token-based design system (third-party case study, **medium**)
- https://awards.zeroheight.com/images/Elements.pdf: Design System Awards 2025 entry for Elements (third-party, **medium**)
- The Elements documentation site is not publicly reachable; no public npm package was found.
- Logo: the white reversed wordmark appears on the sanofi.com footer (live, **medium**). No public clear-space rule was found (**unverified**).

## Differs from current Figma
- **Primary:** current `#7A00E6` **matches** `--elements-core-brand-base` exactly.
- **Secondary:** current `#23004C` **matches** `--elements-core-brand-darkest` exactly. Keep both.
- What should change from the AkzoNobel copy: font becomes Sanofi Sans, with **Work Sans** as the installable fallback (Sanofi's own CSS stack). Button labels are **regular 400**, not bold. Buttons are 44 px with a 4 px radius and 24 px padding. Focus is a 4 px `#3C217B` ring. Greys are neutral (`#171717` text, `#5D5D5D` secondary, `#C9C9C9` borders). Status colours follow the Elements values above.
