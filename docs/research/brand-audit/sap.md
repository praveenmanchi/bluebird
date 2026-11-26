# SAP — Fiori Horizon (sap_horizon)

## Summary
SAP's product UI is **SAP Fiori "Horizon"** (theme id `sap_horizon`, a.k.a. Morning Horizon), the default theme for SAPUI5 / UI5 Web Components and S/4HANA Cloud. It is light, airy and blue: a **white shell bar** (not a coloured banner), a pale grey-blue page (`#F5F6F7`), white cards with 12–16px corners and soft blue-grey shadows, and the proprietary **"72"** typeface at a 14px base. Buttons are 36px tall with 8px corners. The default ("Standard") button is white with **blue text** and a grey border. The "Emphasized" button is solid SAP blue `#0070F2`, and when pressed it **inverts to white with a blue border**. Text fields have no full outline, only a **bottom line** (`#556B81`) on a 4px-radius box. Focus is a 2px solid dark blue `#0032A5` ring. Joule/AI surfaces use a violet accent `#5D36FF`.

## Proposed tokens
```json
{
  "id": "sap",
  "theme": "light",
  "colors": { "primary": "#0070F2", "primaryHover": "#0064D9", "primaryActive": "#FFFFFF", "secondary": "#0064D9",
              "accent": ["#5D36FF", "#F0AB00", "#046C7A"], "link": "#0064D9", "focusRing": "#0032A5",
              "headerBg": "#FFFFFF", "headerText": "#131E29", "pageBg": "#F5F6F7", "surface": "#FFFFFF", "border": "#D9D9D9",
              "textPrimary": "#131E29", "textSecondary": "#556B82", "textDisabled": "#717880",
              "success": "#256F3A", "warning": "#E76500", "error": "#AA0808", "info": "#0070F2",
              "neutralRamp": { "0": "#FFFFFF", "50": "#F5F6F7", "100": "#EFF1F2", "150": "#EAECEE", "200": "#E5E5E5", "250": "#D9D9D9",
                               "300": "#BCC3CA", "400": "#A8B2BD", "500": "#788FA6", "600": "#758CA4", "700": "#556B82", "800": "#223548", "900": "#131E29" } },
  "typography": { "uiFamily": "72", "displayFamily": "72 (72-Bold for headers)", "monoFamily": "72Mono", "proprietary": true,
                  "googleFallbackUi": "Inter", "googleFallbackDisplay": "Inter",
                  "bodySize": 14, "bodyLineHeight": 20, "weights": { "regular": 400, "medium": 600, "semibold": 600, "bold": 700 },
                  "headingScale": [48, 32, 24, 20, 16, 14] },
  "radius": { "button": 8, "input": 4, "card": 16, "chip": 8, "modal": 12 },
  "button": { "height": { "sm": 26, "md": 36, "lg": null }, "paddingX": 9, "minWidth": 36, "fontSize": 14, "fontWeight": 600, "textTransform": "none", "borderWidth": 1,
              "primary": { "bg": "#0070F2", "text": "#FFFFFF", "hoverBg": "#0064D9", "activeBg": "#FFFFFF", "disabledBg": "#99C6FA", "disabledText": "#FFFFFF" },
              "secondary": { "bg": "#FFFFFF", "text": "#0064D9", "border": "#BCC3CA", "hoverBg": "#EAECEE" },
              "ghost": { "text": "#0064D9", "hoverBg": "#EAECEE" },
              "focus": { "style": "solid outline", "width": 2, "offset": 1, "color": "#0032A5" } },
  "input": { "height": 36, "border": "#556B81", "borderWidth": 1, "radius": 4, "placeholder": "#556B82", "focusBorder": "#0032A5", "errorBorder": "#E90B0B" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 8, "itemHeight": 40, "itemHoverBg": "#EAECEE", "itemSelectedBg": "#EBF8FF", "itemSelectedText": "#131E29",
                "shadow": "0 0 0 1px rgba(34,53,72,0.48), 0 2px 8px 0 rgba(34,53,72,0.3)" },
  "tabs": { "style": "underline", "activeIndicator": "#0064D9", "activeText": "#0064D9" },
  "elevation": { "card": "0 0 2px 0 rgba(34,53,72,0.2), 0 2px 4px 0 rgba(34,53,72,0.2)",
                 "menu": "0 0 0 1px rgba(34,53,72,0.48), 0 10px 30px 0 rgba(34,53,72,0.25)",
                 "modal": "0 0 0 1px rgba(34,53,72,0.48), 0 20px 80px 0 rgba(34,53,72,0.25)" },
  "spacingBase": 4,
  "iconStyle": "SAP-icons v5 (Horizon), single-colour outline glyphs, 16px (1rem) in controls"
}
```

### Notes on the values
- **Primary pressed state is inverted.** `sapButton_Emphasized_Active_Background` is `#FFFFFF`, with border and text `#0064D9`. If our button component cannot invert, use `#0064D9` as a filled fallback.
- **Disabled** is not a separate colour. Horizon applies `opacity: 0.4` (`sapContent_DisabledOpacity`) to the whole control. `#99C6FA` is `#0070F2` at 40% opacity on white. `textDisabled` is `#131E29` at 60% (`sapContent_DisabledTextColor`) flattened on white.
- **Button font**: Standard buttons use `72-SemiboldDuplex` (600). Emphasized buttons use `72-Bold` (700, `sapButton_Emphasized_FontWeight: bold`).
- **Inputs** draw only a 1px bottom line (`sapField_BackgroundStyle`, `sapField_BorderStyle: none`) on a 4px box. On hover the line turns blue `#0064D9`. On focus a 1px `#0032A5` outline is added. In the error state the line is `#E90B0B` and the background is `#FFEAF4`.
- **Sizes**: cozy height is 36px (`sapElement_Height` 2.25rem) and compact is 26px (`sapElement_Compact_Height` 1.625rem). Plain list items are 44px (`sapElement_LineHeight`). Dropdown list items are 40px (`_ui5_list_item_dropdown_base_height`). Our 400px Figma plugin would suit **compact** (26px).
- **Radius**: button 8px (`sapButton_BorderCornerRadius`), field 4px (`sapField_BorderCornerRadius`), popover/menu 8px (`sapPopover_BorderCornerRadius`), dialog 12px (`sapElement_BorderCornerRadius`), card/tile 16px (`sapTile_BorderCornerRadius`), token 6px, tag 8px.
- **Tabs** (IconTabBar, text-only): the selected tab has `#0064D9` text and a 3px underline (`sapTab_Selected_Indicator_Dimension` .1875rem). The tab strip is white.
- **Switch**: a pill track 40×24 (cozy). Off is `#788FA6` and on is `#0064D9`. **Checkbox**: 4px radius, `#556B81` 1px border.
- **Status ramp**: tinted backgrounds are error `#FFEAF4`, warning `#FFF8D6`, success `#F5FAE5`, info `#E1F4FF`.
- **Accent palette** (`sapAccentColor1–10`): #D27700 #AA0808 #BA066C #A100C2 #5D36FF #0057D2 #046C7A #256F3A #6C32A9 #5B738B.
- **Header/banner**: Horizon's shell bar is **white** (`sapShellColor` #FFFFFF) with dark text. The logo sits on white. The shell background behind content is `#EFF1F2`. A brand-blue banner would not match Horizon. A white banner with a `#D9D9D9` bottom border (`sapShell_BorderColor`) would. The dark variant is `sap_horizon_dark` (shell `#12171C`, not measured here).
- **Font**: "72" is proprietary. SAP offers it free to download, but it is not on Google Fonts, so Figma needs a manual install. The suggested fallback is Inter (similar x-height and neutral grotesque shapes). Medium confidence on that choice.

## Logo
- The SAP logo is the blue gradient "box" with white SAP letters, shown on white in the shell bar. I could not verify a reversed/white-only version or a published clear-space rule: the brand pages on sap.com returned 403 to headless Chromium. Treat as **unverified**.

## Sources
- `@sap-theming/theming-base-content@11.36.5` (npm), `content/Base/baseLib/sap_horizon/css_variables.css`: all colours, fonts, radii, heights, shadows, focus. **Design-system tokens, high.**
- `@ui5/webcomponents@2.29.0` (npm), `dist/css/themes/sap_horizon/parameters-bundle.css` and generated Card/Dialog/Tag CSS: button padding/min-width, focus offset, input focus, list item heights, switch, popup/token/card radius. **Design-system tokens, high.**
- https://help.sap.com/docs/ measured live with Playwright: body font `"72", Arial, sans-serif`, header `#F5F6F7` 64px, H1 48px/700. This confirms the 72 font and heading scale. **Live computed, medium** (help portal, not the core app).
- https://www.sap.com/ and https://experience.sap.com/fiori-design-web/ returned **403 Access Denied** to headless Chromium. Not bypassed, so the marketing site was not measured.
- https://sap.github.io/ui5-webcomponents/ loaded (380 root vars), but its per-component pages returned 404 headers. Not used for values.

## Differs from current Figma
- **Primary `#0070F2`** matches Horizon `sapBrandColor`, so no change.
- **Secondary `#F0AB00`** (SAP Gold) is a brand/marketing colour and does not appear anywhere in Horizon's UI tokens. Propose `#0064D9` (`sapHighlightColor`, used for links, standard-button text and selected tabs) as the UI secondary. Keep `#F0AB00` only as a decorative accent.
- Copied from AkzoNobel and should change: header (white, not brand colour), page bg `#F5F6F7`, text `#131E29`/`#556B82`, 8px button radius, 4px bottom-line inputs, 36/26px heights, 2px `#0032A5` focus ring, and the 72 font (or Inter fallback) instead of Noto Sans.
