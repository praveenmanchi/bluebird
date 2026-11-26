# Salesforce — Lightning Design System 2 (SLDS 2, "Cosmos" theme)

## Summary
Salesforce's current product UI is **SLDS 2 with the Cosmos theme**, the "Enhanced Lightning UI". Compared with SLDS 1 (Lightning Blue `#0176D3`, 4px corners), Cosmos is brighter and rounder. The brand button is **electric blue `#066AFE`** and every button is a **full pill** (`--slds-g-radius-border-pill` 15rem). Cards and modals have 20px corners, inputs and menus 8px. Text is navy (`#03234D` for titles, `#2E2E2E`/`#5C5C5C` for body) on white containers over a light grey page (`#F3F3F3`). The type is a **system-ui stack** at a dense **13px** base. Focus is a double inset ring: 2px deep navy `#001E5B` with 2px white inside it. Hovering a button adds a hard 2px "lift" shadow under it. Tabs use a 3px blue underline. The global header is white with a soft shadow. The marketing sites still use SLDS 1 blue `#0176D3`, 4px-radius buttons, Salesforce Sans and ITC Avant Garde headings.

## Proposed tokens
```json
{
  "id": "salesforce",
  "theme": "light",
  "colors": { "primary": "#066AFE", "primaryHover": "#0250D9", "primaryActive": "#0250D9", "secondary": "#032D60",
              "accent": ["#0250D9", "#022AC0", "#0176D3"], "link": "#0250D9", "focusRing": "#001E5B",
              "headerBg": "#FFFFFF", "headerText": "#03234D", "pageBg": "#F3F3F3", "surface": "#FFFFFF", "border": "#C9C9C9",
              "textPrimary": "#2E2E2E", "textSecondary": "#5C5C5C", "textDisabled": "#757575",
              "success": "#056764", "warning": "#8C4B02", "error": "#B60554", "info": "#0B5CAB",
              "neutralRamp": { "0": "#000000", "10": "#181818", "15": "#242424", "20": "#2E2E2E", "30": "#444444", "40": "#5C5C5C", "50": "#757575",
                               "60": "#939393", "65": "#A0A0A0", "70": "#AEAEAE", "80": "#C9C9C9", "90": "#E5E5E5", "95": "#F3F3F3", "100": "#FFFFFF" } },
  "typography": { "uiFamily": "system-ui (-apple-system, Segoe UI, Roboto, Helvetica Neue, Arial)", "displayFamily": "ITC Avant Garde Gothic (marketing only)", "monoFamily": "Consolas, Menlo, Monaco, Courier, monospace",
                  "proprietary": false, "googleFallbackUi": "Inter", "googleFallbackDisplay": "Questrial",
                  "bodySize": 13, "bodyLineHeight": 19.5, "weights": { "regular": 400, "medium": 500, "semibold": 600, "bold": 700 },
                  "headingScale": [32, 24, 20, 16, 14] },
  "radius": { "button": 240, "input": 8, "card": 20, "chip": 240, "modal": 20 },
  "button": { "height": { "sm": null, "md": 32, "lg": null }, "paddingX": 16, "minWidth": null, "fontSize": 13, "fontWeight": 600, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#066AFE", "text": "#FFFFFF", "hoverBg": "#0250D9", "activeBg": "#0250D9", "disabledBg": "#C9C9C9", "disabledText": "#757575" },
              "secondary": { "bg": "#FFFFFF", "text": "#0250D9", "border": "#5C5C5C", "hoverBg": "#F3F3F3" },
              "ghost": { "text": "#0250D9", "hoverBg": "transparent" },
              "focus": { "style": "inset double ring (2px #001E5B outer, 2px #FFFFFF inner); border goes transparent", "width": 2, "offset": 0, "color": "#001E5B" } },
  "input": { "height": 32, "border": "#5C5C5C", "borderWidth": 1, "radius": 8, "placeholder": "#5C5C5C", "focusBorder": "#001E5B", "errorBorder": "#B60554" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 8, "itemHeight": 34, "itemHoverBg": "#D6E6FF", "itemSelectedBg": null, "itemSelectedText": "#2E2E2E",
                "shadow": "0 0 5px 0 rgba(0,0,0,0.16), 0 3px 3px 0 rgba(0,0,0,0.16), 0 -1px 2px 0 rgba(0,0,0,0.09)" },
  "tabs": { "style": "underline", "activeIndicator": "#0250D9", "activeText": "#022AC0" },
  "elevation": { "card": "none",
                 "menu": "0 0 5px 0 rgba(0,0,0,0.16), 0 3px 3px 0 rgba(0,0,0,0.16), 0 -1px 2px 0 rgba(0,0,0,0.09)",
                 "modal": "0 0 10px 0 rgba(0,0,0,0.12), 0 7px 7px 0 rgba(0,0,0,0.12), 0 -1px 3px 0 rgba(0,0,0,0.07)" },
  "spacingBase": 4,
  "iconStyle": "SLDS utility icons (@salesforce-ux/icons), single-colour solid glyphs; standard-object icons on coloured rounded squares"
}
```

### Notes on the values
- **Primary, hover and active**: brand-button `:hover` and `:active` share one rule in `slds2.cosmos.css`, so both are `#0250D9` (`--slds-g-color-accent-container-2`). The hooks also define `accent-container-3` `#022AC0` as "the strongest background for high-emphasis actions", which could serve as a deeper pressed state. On hover, brand and outline buttons get `box-shadow: 0 2px 0 #002775` and neutral buttons get `0 1.5px 0 #2E2E2E`.
- **Neutral (secondary) button**: white, text `#0250D9`, border `#5C5C5C`. On hover the background is `#F3F3F3` and the text `#03234D`. The **outline-brand** variant is the same with a `#066AFE` border. Disabled neutral: bg `#E5E5E5`, text and border `#757575`.
- **Text roles** (styling hook index): `on-surface-1` `#5C5C5C` is body copy and icons. `on-surface-2` `#2E2E2E` is secondary headings and dark body. `on-surface-3` `#03234D` is page and component titles. The measured card body was `#5C5C5C` and headings were `#03234D`.
- **Borders**: `border-1` `#C9C9C9` is decorative and `border-2` `#5C5C5C` is functional (inputs, checkboxes).
- **Status** (text / container / border): error `#B60554`/`#FDDDE3`/`#B60554` (a magenta-red, not the SLDS 1 `#EA001E`). Warning `#8C4B02`/`#F9E3B6`/`#CA8501`. Success `#056764`/`#ACF3E4`/`#056764` (teal). Info `#0B5CAB`/`#D8E6FE`.
- **Inputs**: 32px tall, 8px radius, 13px text `#2E2E2E`. On focus the border goes transparent and a `0 0 0 2px #001E5B` ring appears. The error state is a `#B60554` border with a `#FDDDE3` background tint.
- **Menu**: items are 34px with 12px horizontal padding and 12px text. Hover and focus use `#D6E6FF` (brand-90). Selected items get a check icon but no background change.
- **Tabs**: 40px tall, 14px/600. Active text is `#022AC0` with a 3px `#0250D9` bar (`::after`). Inactive text is `#5C5C5C`. The nav has a 1px `#C9C9C9` bottom border.
- **Other**: the badge is `#E5E5E5`/`#5C5C5C` with 4px radius. Pills are white, pill-shaped, `#5C5C5C` border, 24px tall. The checkbox is 16px with 4px radius and checks to `#066AFE`. The global header is 50px white with `--slds-g-shadow-1`. The page header is `#F3F3F3`.
- **Radius hooks**: border-1 4, border-2 8, border-3 12, border-4 20, pill 240 (15rem), circle 100%.
- **Font**: SLDS 2 uses `--slds-g-font-family-base: system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, 'Helvetica Neue', Arial, sans-serif`. That is not proprietary. In Figma use Inter, or SF Pro on Mac. On trailhead.salesforce.com and developer.salesforce.com the body font is **"Salesforce Sans"** and headings are **"ITC Avant Garde"**. Both are proprietary. Questrial is a low-confidence geometric stand-in for Avant Garde.
- **Density**: comfy is the default. The compact density hooks shrink font-scale-var-2 from 16 to 14px.

## Logo
- The Salesforce logo is the blue cloud with white wordmark. I could not confirm whether a white/reversed logo is allowed on brand colour, or a clear-space rule: salesforce.com returned 403 to headless Chromium. **Unverified**. Because the Cosmos header is white, the full-colour cloud on white is the safe default.

## Sources
- `@salesforce-ux/design-system-2@2.264.2` (npm), `dist/css/bundled/slds2.cosmos.css`: rendered locally in a Playwright harness with real SLDS markup. Button/input/menu/tabs/card/modal/checkbox computed styles, hover/focus/active. **Design-system CSS, computed, high.**
- https://www.lightningdesignsystem.com/2e1ef8501/p/98b493-styling-hook-index (SLDS 2 docs, rendered with Playwright): surface/on-surface/accent/status/disabled/neutral hooks (light and dark), radius, font scale/weights, shadows, spacing. **Design-system docs, high.**
- https://www.lightningdesignsystem.com/2e1ef8501/p/7770b4-borders-and-radius/b/514f2c and https://www.lightningdesignsystem.com/2e1ef8501/p/93288f-typography/b/995dcd: radius and type-style guidance. **Docs, high.**
- `@salesforce-ux/design-system@2.264.3` (SLDS 1) and `@salesforce-ux/sds-styling-hooks`: SLDS 1 brand ramp (`#0176D3` = brand-base-50, `#032D60` = brand-base-20), used only for comparison. **Design-system tokens, high.**
- https://trailhead.salesforce.com/ and https://developer.salesforce.com/ measured live: CTA `#0176D3`, 4px radius, 40–52px tall, 16px/700, Salesforce Sans, ITC Avant Garde headings `#032D60`, pill search input 32px. **Live computed, medium** (marketing/learning sites, not the app).
- https://www.salesforce.com/ returned **403 Access Denied** to headless Chromium. Not bypassed.
- Search context: https://developer.salesforce.com/docs/platform/lwc/guide/create-components-css-slds1-slds2.html, https://trailhead.salesforce.com/content/learn/modules/salesforce-lightning-design-system-2-for-developers/explore-salesforce-lightning-design-system-2

## Differs from current Figma
- **Primary `#0176D3`** is the SLDS 1 / marketing blue. The current product (SLDS 2 Cosmos) uses **`#066AFE`**. Recommend `#066AFE` for a "feels like the product" theme. Keep `#0176D3` only if the client wants to match their marketing sites.
- **Secondary `#032D60`** matches the SLDS navy (`surface-inverse-1`, brand-base-20), so keep it. Titles use the slightly darker `#03234D`.
- Copied from AkzoNobel and should change: pill buttons (radius 240), 32px controls, 13px system-ui type, 20px card/modal radius, 8px inputs/menus, double inset navy focus ring, magenta-red error `#B60554`, teal success `#056764`, and a white header (not a brand-colour banner).
