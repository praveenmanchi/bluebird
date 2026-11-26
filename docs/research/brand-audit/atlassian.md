# Atlassian — brand audit

## Summary
Atlassian apps (Jira, Confluence, Loom…) use the **Atlassian Design System** (ADS) through `@atlaskit/tokens` v20.15.0. The values below
come from the **2025 refreshed theme**, which is now live on atlassian.design. It is recognisable by a bright **brand blue `#1868DB`**
(replacing the old `#0052CC`) for primary buttons, links, selected tabs and selection. Neutrals are warm-neutral greys (`#292A2E` text,
`#505258` subtle text), built from translucent overlays. Buttons are compact (32px) with **6px radius**, there is a 2px focus ring offset by
2px, and the default button has a hairline border. The app font is **Atlassian Sans** (a custom typeface) at 14px/20px with a 653 "bold".
Marketing (atlassian.com) uses **Charlie Display / Charlie Text** and **pill-shaped** CTAs in the same blue. The product UI is
**light by default** with a **white top navigation**. Dark mode is fully tokenised.

## Proposed tokens (ADS refreshed light)
```json
{
  "id": "atlassian",
  "theme": "light",
  "colors": { "primary": "#1868DB", "primaryHover": "#1558BC", "primaryActive": "#144794", "secondary": "#292A2E",
              "accent": ["#964AC0", "#FBC828", "#6A9A23"], "link": "#1868DB", "focusRing": "#4688EC",
              "headerBg": "#FFFFFF", "headerText": "#292A2E", "pageBg": "#FFFFFF", "surface": "#F8F8F8", "border": "#DDDEE1",
              "textPrimary": "#292A2E", "textSecondary": "#505258", "textDisabled": "#B7B9BE",
              "success": "#5B7F24", "warning": "#FBC828", "error": "#C9372C", "info": "#1868DB",
              "neutralRamp": { "0": "#FFFFFF", "100": "#F8F8F8", "200": "#F0F1F2", "300": "#DDDEE1", "400": "#B7B9BE", "500": "#8C8F97",
                               "600": "#7D818A", "700": "#6B6E76", "800": "#505258", "900": "#3B3D42", "1000": "#292A2E", "1100": "#1E1F21" } },
  "typography": { "uiFamily": "Atlassian Sans", "displayFamily": "Charlie Display", "monoFamily": "Atlassian Mono", "proprietary": true,
                  "googleFallbackUi": "Inter", "googleFallbackDisplay": "Inter Tight",
                  "bodySize": 14, "bodyLineHeight": 20, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 653 },
                  "headingScale": [32, 28, 24, 20, 16, 14, 12] },
  "radius": { "button": 6, "input": 6, "card": 8, "chip": 4, "modal": 12 },
  "button": { "height": { "sm": 24, "md": 32, "lg": 40 }, "paddingX": 12, "minWidth": null, "fontSize": 14, "fontWeight": 500, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#1868DB", "text": "#FFFFFF", "hoverBg": "#1558BC", "activeBg": "#144794", "disabledBg": "#F0F1F2", "disabledText": "#B7B9BE" },
              "secondary": { "bg": "#FFFFFF", "text": "#505258", "border": "#DDDEE1", "hoverBg": "#F0F1F2" },
              "ghost": { "text": "#505258", "hoverBg": "#F0F1F2" },
              "focus": { "style": "solid outline outside the element", "width": 2, "offset": 2, "color": "#4688EC" } },
  "input": { "height": 40, "border": "#8C8F97", "borderWidth": 1, "radius": 6, "placeholder": "#6B6E76", "focusBorder": "#4688EC", "errorBorder": "#E2483D" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 8, "itemHeight": 40, "itemHoverBg": "#F0F1F2", "itemSelectedBg": "#E9F2FE", "itemSelectedText": "#1868DB",
                "shadow": "0px 8px 12px #1E1F2126, 0px 0px 1px #1E1F214F" },
  "tabs": { "style": "underline", "activeIndicator": "#1868DB", "activeText": "#1868DB" },
  "elevation": { "card": "0px 1px 1px #1E1F2140, 0px 0px 1px #1E1F214F", "menu": "0px 8px 12px #1E1F2126, 0px 0px 1px #1E1F214F",
                 "modal": "0px 8px 12px #1E1F2126, 0px 0px 1px #1E1F214F" },
  "spacingBase": 8,
  "iconStyle": "Atlassian icons (@atlaskit/icon, refreshed set): outline/line glyphs, 16px core and 12px small"
}
```
Notes on the JSON:
- ADS neutrals are **translucent tokens**. The solid equivalents on white are listed above, and they line up exactly with the palette:
  `color.border` `#0B120E24` ≈ Neutral300 `#DDDEE1`, `background.neutral.subtle.hovered` `#0515240F` ≈ Neutral200 `#F0F1F2`,
  `background.neutral.subtle.pressed` `#0B120E24` ≈ `#DDDEE1`, and `color.text.disabled` `#080F214A` ≈ Neutral400 `#B7B9BE`.
  If you keep the alpha versions, the buttons stay correct on any surface.
- Status: success, error and info are the `background.*.bold` fills. Their text-safe colours are `color.text.success` `#4C6B1F`,
  `color.text.warning` `#9E4C00`, `color.text.danger` `#AE2E24` and `color.text.information` `#1558BC`. The warning bold fill `#FBC828`
  takes dark text (`#292A2E`).
- `secondary` `#292A2E` is `color.background.neutral.bold` (Neutral1000). ADS has no second brand hue. The purple discovery colour
  `#964AC0` is the next most "Atlassian" accent if you want a coloured secondary.
- Bold is **653** (a variable-font weight). In Figma with Inter, use **700**.
- Radii for card 8 (`radius.large`), chip 4 (`radius.small`) and modal 12 (`radius.xlarge`) come from the shape token scale. I did not
  measure them on live components. **Confidence: medium.**
- `lg` 40 is the large text-field height. ADS buttons come in only two heights: default 32 and compact 24.
- Space tokens: `space.025`=2, `.050`=4, `.075`=6, `.100`=8, `.150`=12… This is an 8px base with 4px and 2px half-steps.

## Dark alternative (ADS refreshed dark) — values that change
`surface` `#1F1F21`, raised `#242528`, overlay/menu `#2B2C2F`, sunken `#18191A`, input bg `#242528`. Text is `#CECFD2`, subtle `#A9ABAF`,
subtlest `#96999E`. Border `#E3E4F21F` (≈ `#37373A` solid), input border `#7E8188`. Brand/primary `#669DF1`, hover `#8FB8F6`, pressed
`#ADCBFB`, with text on brand `#1F1F21`. Link `#669DF1`, focus `#8FB8F6`, selected bg `#1C2B42`. Status fills: success `#94C748`,
warning `#FBC828`, danger `#F87168`.

## Measured live (Playwright, headless Chromium, 2026-11-25)
- atlassian.design → Button examples:
  - **Primary** is `#1868DB` → hover `#1558BC` → pressed `#144794`, 32px high, 12px padding, 6px radius, Atlassian Sans 14px/500, white text.
  - **Default** is transparent with a 1px `#0B120E24` border drawn by `::after`, text `#505258`. Hover is `#0515240F`, pressed `#0B120E24`.
  - **Subtle** has no border; its hover and pressed match Default.
  - Warning is `#FBC828`, text `#292A2E`, hover `#FCA700`. Danger is `#C9372C` → `#AE2E24` → `#872821`.
  - Discovery is `#964AC0`.
  - Keyboard focus is `outline: 2px solid #4688EC` at `outline-offset: 2px`.
- Text field: the wrapper is 40px with a 1px `#8C8F97` border, 6px radius and white background. On focus the border turns `#4688EC`
  with a 1px inset `#4688EC` ring.
- Dropdown menu: the surface is `#FFFFFF`, **8px radius**, with shadow `0 8px 12px #1E1F2126, 0 0 1px #1E1F214F`. Items are **40px**
  with text `#292A2E`. Hover is `#0515240F`.
- Tabs: the active tab text is `#1868DB` at 14px/500 with a **2px `#1868DB` underline** (`::after`).
- Body text on atlassian.design is `#292A2E`, `"Atlassian Sans", ui-sans-serif, …` at 14px/20px. The header is white.
- www.atlassian.com (marketing): font is "Charlie Text" for body and "Charlie Display" for the h1 (54px/500, `#101214`). The header is
  white, 68px. CTAs ("Get Jira free") are **`#1868DB` pills** (radius 10000px), 40px or 48px high, with 22–26px padding.
  These are marketing only. The product uses 6px.

## Logo
From atlassian.design/foundations/logos: on white, the logo is primary blue and the program name is neutral. **On darker backgrounds, both
are white**, so a white logo on a blue or dark banner is allowed. Logos need clear space free of type and graphics. Ideal and minimum
clearance are drawn in the guideline, but no number is given in the page text. App logos sit in coloured tiles, and you must not change
the tile radius.

## Sources
- https://www.npmjs.com/package/@atlaskit/tokens (v20.15.0: `dist/esm/artifacts/themes/atlassian-light.js`, `atlassian-dark.js`,
  `atlassian-shape.js`, `atlassian-typography.js`, `atlassian-spacing.js`, `palettes-raw/palette-brand-refresh.js`). Colours, radii,
  type and spacing come from the **design-system tokens. Confidence: high.**
- https://atlassian.design/components/button/examples, …/textfield/examples, …/dropdown-menu/examples and …/tabs/examples: button
  states, focus, input, menu and tabs. **Live computed style. Confidence: high.**
- https://atlassian.design/foundations/typography confirms that Atlassian Sans and Atlassian Mono are the app fonts, Charlie Sans is
  the brand font, and gives the heading scale. **Docs. Confidence: high.**
- https://atlassian.design/foundations/logos: logo colour and clearance. **Docs. Confidence: high.**
- https://www.atlassian.com/: marketing fonts and pill CTA. **Live computed style. Confidence: high.**
- Google fallbacks (Inter for Atlassian Sans, Inter Tight for Charlie Display) are my own visual match. I did not find them published,
  but my understanding is that Atlassian Sans is derived from Inter. **Confidence: medium.**

## Differs from current Figma
Atlassian is a **new brand**. It is not in the brief's table, and no earlier quick value was given.
- Use the **refreshed blue `#1868DB`** (`color.background.brand.bold`), not the legacy Atlassian blue `#0052CC`. The legacy `#0052CC`
  and navy `#172B4D` belong to the pre-2024 theme (`atlassian-legacy-light`) and are no longer what Jira and Confluence ship.
- The secondary is a neutral (`#292A2E`) because ADS has only one brand hue. The alternative is discovery purple `#964AC0`.
- Use Inter (700 for bold) as the Figma fallback for Atlassian Sans, in place of the Noto Sans placeholder.
