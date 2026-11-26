# Adobe — Spectrum 2 (S2)

## Summary
Adobe's product UI, Spectrum 2, is soft, rounded and light. All buttons are **pills** (radius = height/2) with **bold** Adobe Clean text. Fields and menus are rounded rectangles: inputs are 8 px with a **2 px** light-grey (`#DADADA`) border, and popovers are about 10 px. The interactive "accent" is a vivid blue `#3B63FB`. Adobe Red `#EB1000` is reserved for the logo and brand moments and **is not a UI control colour** in Spectrum. The neutral "primary" button is near-black `#292929`. The grey ramp is neutral (no blue tint) and runs from `#F8F8F8` page to `#292929` text. Focus is a 2 px blue `#4B75FF` outline offset 2 px outside the control. App frames are light by default, with white or `#F8F8F8` layers. Desktop Creative Cloud apps (Photoshop and others) default to dark.

## Proposed tokens
```json
{
  "id": "adobe",
  "theme": "light",
  "colors": { "primary": "#3B63FB", "primaryHover": "#274DEA", "primaryActive": "#274DEA", "secondary": "#292929",
              "accent": ["#EB1000", "#4B75FF"], "link": "#3B63FB", "focusRing": "#4B75FF",
              "headerBg": "#FFFFFF", "headerText": "#292929", "pageBg": "#F8F8F8", "surface": "#FFFFFF", "border": "#DADADA",
              "textPrimary": "#292929", "textSecondary": "#505050", "textDisabled": "#C6C6C6",
              "success": "#05834E", "warning": "#C24E00", "error": "#D73220", "info": "#3B63FB",
              "neutralRamp": { "25": "#FFFFFF", "50": "#F8F8F8", "75": "#F3F3F3", "100": "#E9E9E9", "200": "#E1E1E1", "300": "#DADADA",
                               "400": "#C6C6C6", "500": "#8F8F8F", "600": "#717171", "700": "#505050", "800": "#292929", "900": "#131313", "1000": "#000000" } },
  "typography": { "uiFamily": "Adobe Clean Spectrum VF", "displayFamily": "Adobe Clean Spectrum VF", "monoFamily": "Source Code Pro", "proprietary": true,
                  "googleFallbackUi": "Source Sans 3", "googleFallbackDisplay": "Source Sans 3",
                  "bodySize": 14, "bodyLineHeight": 21, "weights": { "regular": 400, "medium": 500, "semibold": null, "bold": 700 },
                  "headingScale": [14, 18, 20, 22, 28, 36, 45, 58] },
  "radius": { "button": 9999, "input": 8, "card": 10, "chip": 8, "modal": 16 },
  "button": { "height": { "sm": 24, "md": 32, "lg": 40 }, "paddingX": 16, "minWidth": 72, "fontSize": 14, "fontWeight": 700, "textTransform": "none", "borderWidth": 2,
              "primary": { "bg": "#3B63FB", "text": "#FFFFFF", "hoverBg": "#274DEA", "activeBg": "#274DEA", "disabledBg": "#E9E9E9", "disabledText": "#C6C6C6" },
              "secondary": { "bg": "#E9E9E9", "text": "#292929", "border": "#E9E9E9", "hoverBg": "#E1E1E1" },
              "ghost": { "text": "#292929", "hoverBg": "#E9E9E9" },
              "focus": { "style": "outline ring outside control", "width": 2, "offset": 2, "color": "#4B75FF" } },
  "input": { "height": 32, "border": "#DADADA", "borderWidth": 2, "radius": 8, "placeholder": "#717171", "focusBorder": "#292929", "errorBorder": "#D73220" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 10, "itemHeight": 32, "itemHoverBg": "#E9E9E9", "itemSelectedBg": "#FFFFFF", "itemSelectedText": "#292929",
                "shadow": "0 4px 12px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.12), 0 0 2px rgba(0,0,0,0.08)" },
  "tabs": { "style": "underline", "activeIndicator": "#292929", "activeText": "#131313" },
  "elevation": { "card": "0 2px 8px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)", "menu": "0 4px 12px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.12), 0 0 2px rgba(0,0,0,0.08)", "modal": "0 4px 12px rgba(0,0,0,0.16), 0 2px 6px rgba(0,0,0,0.12), 0 0 2px rgba(0,0,0,0.08)" },
  "spacingBase": 8,
  "iconStyle": "outline, Spectrum 2 workflow icons (20 px default, rounded 1.5-2 px strokes)"
}
```

### Notes on values
- **Button radius `9999`** means pill. Measured radius is 16 px at 32 px high and 20 px at 40 px. S2 token corner radii: button S 12, L 20, XL 24. Min-width is `2.25 × height` (`button-minimum-width-multiplier`), so 72 px at M. Padding is about height/2 (16 at M, 20 at L). XL is 48 px.
- **Variants**: *accent* is blue fill `#3B63FB`, the CTA. *primary* is neutral fill `#292929`, hover `#131313`. *secondary* is grey fill `#E9E9E9`, hover `#E1E1E1`, text `#292929`. Each fill variant also has an *outline* style: transparent with a 2 px border in the same colour. *negative* is `#D73220`. Pressed state in S2 also uses a slight scale-down.
- **Disabled**: bg `#E9E9E9`, text and border `#C6C6C6`, border `#DADADA` (`disabled-*` tokens).
- **Input**: 2 px `#DADADA` border (gray-300, measured on spectrum.adobe.com), radius 8, 32 px high, 14 px text. Hover border `#C6C6C6`. Error uses `negative-border-color-default` `#D73220`. Keyboard focus adds the `#4B75FF` 2 px ring with offset 2. Focus border `#292929` is **medium** confidence (from S2 docs, not measured).
- **Menus/pickers**: popover is white (`background-elevated` / `background-layer-2`) with no border (`popover-border-opacity 0`), radius about 10 px (`corner-radius-large-default`), and 8 px internal padding. Items are 32 px with hover/keyboard-focus `#E9E9E9` (`menu-item-background-color-*` = gray-100). The selected item is shown with a checkmark, not a fill.
- **Tabs**: 48 px items (32 px compact), 24 px gap, 2 px `tab-selection-indicator-thickness`. The indicator is neutral dark (**medium** confidence: S2 docs, not measured).
- **Links**: the accent link is `#3B63FB` with an underline. Secondary links are `#292929` with an underline, hover `#131313` (measured on react-spectrum.adobe.com).
- **Checkbox**: 16 px with a small radius, 2 px border, `#292929` fill when checked (neutral, like the primary button). **Switch**: pill, neutral dark when on. **Radio**: 14 px.
- **Status (content-safe 900 shades)**: negative `#D73220`, positive `#05834E`, notice `#C24E00`, informative `#3B63FB`. Background fills: notice `#FC7D00`, positive `#05834E`, negative `#D73220`.
- **Type**: Adobe Clean Spectrum VF (proprietary, Adobe Fonts). Body 14 px with line-height 1.5. Headings use extra-bold (800) with line-height 1.3. "Detail" style is uppercase medium with 0.06em spacing. **Source Sans 3** (Adobe's own open-source humanist sans) is the best Google substitute, and Source Code Pro is already the Spectrum mono.
- **Dark theme option**: base `#111111`, layer-1 `#1B1B1B`, layer-2 `#222222`, text `#DBDBDB`, accent bg `#4069FD`, focus `#4069FD`.
- **Logo**: the Adobe "A" mark is used white on Adobe Red (the classic red tag), so white on an `#EB1000` banner is consistent with the brand. Clear-space rule: Adobe brand guidelines, **not verified**.

## Live verification (Playwright, 2026-11-25)
- **www.adobe.com returned "Access Denied"** (Akamai edge block) to headless Chromium, and business.adobe.com gave an HTTP/2 protocol error. No attempt was made to bypass them. The marketing site is therefore **unverified**.
- Fallback to Adobe's own Spectrum 2 sites:
  - spectrum.adobe.com, `a.btn.accent`: `#3B63FB`, hover `#274DEA`, 32 px, radius 16, 2 px border in the fill colour, focus outline 2 px `#3B63FB` offset 2. `a.btn.primary` is `#131313`. Input: 32 px, 2 px `#DADADA`, radius 8.
  - react-spectrum.adobe.com: "Subscribe" accent button `#3B63FB` → hover `#274DEA`, 40 px, radius 20, padding 20, Adobe Clean 700. Secondary "Show toast" `#E9E9E9` → `#E1E1E1`, text `#292929` → `#131313`. Focus outline 2 px `#4B75FF` offset 2. Font stack `adobe-clean-spectrum-vf, adobe-clean-variable, adobe-clean`.

## Sources
| Value group | Source | Confidence |
|---|---|---|
| Colours (light/dark), grey ramp, status, radii, heights, type sizes and weights, menu/tab/popover tokens, shadows | npm `@adobe/spectrum-tokens@15.9.1` `dist/json/variables.json` + `src/*.json` (S2 values) | high |
| Button shape/weight/hover, input border, focus ring, links | Live computed style on https://spectrum.adobe.com/ and https://react-spectrum.adobe.com/ | high |
| Input focus border, tab indicator colour, card radius 10 | Spectrum 2 docs knowledge, not measured | medium |
| adobe.com marketing UI | Blocked (Access Denied); not measured | n/a |
| Adobe Red `#EB1000`, logo reversal | Adobe brand convention (red tag logo); guideline page not fetched | medium / low |
- https://www.npmjs.com/package/@adobe/spectrum-tokens
- https://spectrum.adobe.com/
- https://react-spectrum.adobe.com/
- https://www.adobe.com/ (blocked)
- https://business.adobe.com/ (protocol error)

## Differs from current Figma
- **Primary `#EB1000`** (Adobe Red) is the *brand/logo* colour. Spectrum never uses it for buttons, links or focus, and red reads as "negative/destructive" in Spectrum, whose negative is `#D73220`. Suggest UI primary **`#3B63FB`** (S2 accent blue-900), and keep `#EB1000` for the banner/logo only.
- **Secondary `#1473E6`** is the old **Spectrum 1** blue-400/500 accent, replaced in S2 by `#3B63FB`. Suggest secondary `#292929` (the S2 neutral "primary" button).
- From the AkzoNobel copy-over, change: buttons to full pills with **bold** text; inputs to 8 px radius with a **2 px** `#DADADA` border; font Noto Sans → **Source Sans 3**; focus to a 2 px `#4B75FF` outer ring with offset 2.
- **Banner decision for the team**: Adobe's product header is white with dark text. If we keep a coloured brand banner, use `#EB1000` with the white "A" logo rather than blue.
