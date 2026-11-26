# Merck KGaA, Darmstadt, Germany: Liquid design system

## Summary
Merck KGaA's open-source design system is **Liquid** (`@emdgroup-liquid/liquid`, Stencil web components). The public docs are **Liquid Oxygen** (oxygen.liquid.merck.design, v5.15.0). The docs now say Oxygen "will shortly be deprecated" in favour of **Liquid Carbon**, but carbon.merck.design sits behind a Merck Azure sign-in, so Oxygen is the latest public evidence.

Liquid is recognisable for:
- its named Merck palette: **Rich** Purple/Blue/Green/Red, **Vibrant** Magenta/Cyan/Yellow/Green, plus "Sensitive" pastels;
- switchable themes: Ocean (Rich Blue + Vibrant Cyan) is the default; **Shake** (Rich Purple + Vibrant Magenta) is the purple corporate pairing;
- Lato for UI text, with the proprietary uppercase **MWeb** (Merck) face for big display lines;
- bold 16 px button labels, 4 px corners and 8 px cards;
- borders drawn as **2 px inset box-shadows**;
- a navy-tinted dark text colour `#0F1A2E` and cool lilac-grey neutrals.

merckgroup.com (and emdgroup.com) return **403 Access Denied** to headless Chromium. I did not try to bypass that, so there is no live corporate-site measurement. Brand guidelines are behind the log-in at brand-hub.emdgroup.com.

## Proposed tokens
```json
{
  "id": "merckgroup",
  "theme": "light",
  "colors": { "primary": "#503291", "primaryHover": "#3C2274", "primaryActive": "#23183D", "secondary": "#EB3C96",
              "accent": ["#2DBECD", "#FFC832", "#A5CD50", "#0F69AF"], "link": "#503291", "focusRing": "#8A68D2",
              "headerBg": "#503291", "headerText": "#FFFFFF", "pageBg": "#FFFFFF", "surface": "#F8F8FC", "border": "#E1E1EA",
              "textPrimary": "#0F1A2E", "textSecondary": "#5E5E72", "textDisabled": "#A9A9BA",
              "success": "#01884C", "warning": "#FFC832", "error": "#E61E50", "info": "#0F69AF",
              "neutralRamp": { "010": "#F8F8FC", "050": "#ECECF4", "100": "#E1E1EA", "200": "#C7C7D1", "300": "#A9A9BA", "400": "#8B8B9C",
                               "500": "#777788", "600": "#5E5E72", "700": "#454554", "800": "#2B2B3B", "900": "#0F1A2E" } },
  "typography": { "uiFamily": "Lato", "displayFamily": "MWeb", "monoFamily": null, "proprietary": false,
                  "googleFallbackUi": "Lato", "googleFallbackDisplay": "Montserrat",
                  "bodySize": 16, "bodyLineHeight": 25.6, "weights": { "regular": 400, "medium": 700, "semibold": 700, "bold": 700 },
                  "headingScale": [14, 16, 18, 22, 26, 32] },
  "radius": { "button": 4, "input": 4, "card": 8, "chip": null, "modal": null },
  "button": { "height": { "sm": 32, "md": 40, "lg": null }, "paddingX": 14, "minWidth": null, "fontSize": 16, "fontWeight": 700, "textTransform": "none", "borderWidth": 0,
              "primary": { "bg": "#503291", "text": "#FFFFFF", "hoverBg": "#3C2274", "activeBg": "#23183D", "disabledBg": "#DCD6E9", "disabledText": "#FFFFFF" },
              "secondary": { "bg": "#FFFFFF", "text": "#503291", "border": "#503291", "hoverBg": "#EEEAF4" },
              "ghost": { "text": "#503291", "hoverBg": "#EEEAF4" },
              "focus": { "style": "fill swaps to primary-focus (solid); 2px inset border turns primary-focus (secondary/inputs); no outer ring", "width": 2, "offset": 0, "color": "#8A68D2" } },
  "input": { "height": 40, "border": "#E1E1EA", "borderWidth": 2, "radius": 4, "placeholder": "#6F7682", "focusBorder": "#503291", "errorBorder": "#E61E50" },
  "dropdown": { "menuBg": "#FFFFFF", "menuRadius": 4, "itemHeight": 40, "itemHoverBg": "#FAF7FF", "itemSelectedBg": "#FAF7FF", "itemSelectedText": "#503291", "shadow": "0 0 4px rgba(15,26,46,0.15), 0 8px 12px rgba(15,26,46,0.15)" },
  "tabs": { "style": "boxed", "activeIndicator": "#503291", "activeText": "#503291" },
  "elevation": { "card": "0 1px 4px rgba(15,26,46,0.15), 0 0 1px rgba(15,26,46,0.15)", "menu": "0 0 4px rgba(15,26,46,0.15), 0 8px 12px rgba(15,26,46,0.15)", "modal": "0 0 4px rgba(15,26,46,0.15), 0 24px 40px rgba(15,26,46,0.15)" },
  "spacingBase": 4,
  "iconStyle": "Liquid ld-icon SVG set (style not verified)"
}
```

### Notes on the tokens
- **Theme choice:** I mapped to Liquid's **Shake** theme. It is the closest match to the current Figma pairing and to Merck's purple corporate identity, where Rich Purple carries the brand. Shake tokens: `--ld-thm-shake-primary` = `rp` `#503291`, hover `rp-800` `#3C2274`, active `rp-900` `#23183D`, focus `rp-500` `#8A68D2`, highlight `rp-010` `#FAF7FF`. Secondary is `vm` `#EB3C96`, with hover `vm-600` `#BE227B`, active `vm-800` `#6C093F` and focus `vm-300` `#FF8DC8`. Liquid's **default** theme is Ocean: primary Rich Blue `#0F69AF` (hover `#085897`, active `#0A3B61`, focus `#50A0DE`) and secondary Vibrant Cyan `#2DBECD`. The docs site renders in Ocean, so every *live* measurement below shows blue. Swap to Ocean if the client's product teams use the default.
- **Palette** (`--ld-col-*`): rp Rich Purple `#503291`, rb Rich Blue `#0F69AF`, rg Rich Green `#01884C`, rr Rich Red `#E61E50`, vm Vibrant Magenta `#EB3C96`, vc Vibrant Cyan `#2DBECD`, vy Vibrant Yellow `#FFC832`, vg Vibrant Green `#A5CD50`. The Sensitive pastels are sb `#96D7D2`, sg `#B4DC96`, sp `#E1C3CD` and sy `#FFDCB9`. Each colour has a 010–900 ramp plus 20 %/10 % alpha variants.
- **Buttons (measured on the ld-button docs page):**
  - Primary (Ocean): 40 px high, 14 px side padding, 4 px radius, Lato 700 16 px. Hover is `#085897`, which equals primary-hover.
  - Size sm: 32 px, 10 px padding, 14 px text.
  - Secondary: transparent fill with a **2 px inset box-shadow** in primary. Hover fills with primary at 10 % and the border goes to primary-hover.
  - Ghost: no border, same 10 % hover.
  - Focus: the solid fill changes to primary-focus; the secondary border changes to primary-focus.
  - Disabled is **opacity 0.2**. For Shake that is `#DCD6E9` composited.
  - Size lg exists (padding 21 × 12 px) but was not measured.
- **Inputs (ld-input):**
  - 40 px md (32 sm, 50 lg), white fill, 4 px radius.
  - Border is a 2 px inset shadow in `#E1E1EA`. Hover changes it to `#A9A9BA`, focus to primary, and invalid to error `#E61E50` (invalid fill is a pale error tint).
  - Placeholder is text `#0F1A2E` at 60 % opacity, which is `#6F7682` on white.
  - Disabled is a `#F8F8FC` fill with `#A9A9BA` text.
- **Select popper:** white menu, 1 px `#E1E1EA` border, 4 px radius and the "sticky" shadow. Options are at least 40 px high. Hover, focus and active all use the highlight colour (`#FAF7FF` in Shake). The check-mark colour follows primary, primary-hover and primary-active.
- **Tabs (ld-tabs):** filled tab buttons (`#F8F8FC`, hover `#E1E1EA`, active `#C7C7D1`), 40 px min-height, Lato 700 16 px. The selected tab gets primary-coloured text and a primary bottom indicator. A "brand-color" tablist variant fills the tabs with primary instead.
- **Cards** have an 8 px radius and the "stacked" shadow. **Checkbox** is 20 px with a 4 px radius.
- **Shadows:** stacked, sticky, hover and active, all tinted navy `rgba(15,26,46,.15)`. The modal value uses `--ld-shadow-active`, which is my assumption.
- **Radii:** `--ld-br-s` 2, `-m` 4, `-l` 8, `-full` 4000 px.
- **Spacing:** `--ld-sp-` 1, 2, 4, 6, 8, 12, 16, 24, 32, 40 px.
- **Type:**
  - Body text: `--ld-typo-body-m` is 16/160 %. Body-s is 14/176 % and xs is 12/180 %.
  - Headings: h1–h6 are 32/26/22/18/16/14 at weight 700 and 140 %.
  - Display: b1–b6 (48→22) and xb1–xb3 (92/72/64) use **MWeb**. Docs require them in **uppercase** and never black.
  - Weights: Lato 400/700/900 are loaded. There is no medium or semibold, so Bluebird's medium and semibold map to 700.
- **Mono** (Source Code Pro) appears only on the docs site, not in Liquid tokens.
- **Header:** no measurable evidence, because the corporate site is blocked. `#503291` with a white logo is a recommendation (**low**). Merck's 2015 identity, by FutureBrand, uses a "Vibrant M" logo designed to appear in many colours. Reversal and clear-space rules are confidential on the Brand Hub.

## Sources
- https://unpkg.com/@emdgroup-liquid/liquid@5.15.0/dist/css/liquid.global_no_fonts.css and `/dist/css/liquid.css`: palette, themes, radii, spacing, shadows, typography (published package, **high**)
- https://unpkg.com/@emdgroup-liquid/liquid@5.15.0/dist/css/{ld-button,ld-input,ld-select}.css and `dist/collection/components/{ld-select/ld-option-internal,ld-select/ld-select-popper,ld-tabs/ld-tab,ld-tabs/ld-tablist}/*.shadow.css`: component token usage (published package, **high**)
- https://oxygen.liquid.merck.design/liquid/components/ld-button/, `/ld-input/`, `/ld-select/`, `/ld-tabs/`, `/ld-card/`, `/ld-checkbox/`: rendered sizes plus hover and focus states (live computed style on design-system docs, Ocean theme, **high**)
- https://oxygen.liquid.merck.design/liquid/global/typography/: font stacks and the uppercase rule for display type (design-system docs, **high**)
- https://carbon.merck.design/: the successor Liquid Carbon is login-gated, not accessed (**unverified**)
- https://www.merckgroup.com/en and https://www.emdgroup.com/en: 403 to headless Chromium, not bypassed (**no data**)
- https://brand-hub.emdgroup.com/en/terms-and-conditions.html: brand guidelines are confidential and behind a log-in (**high** that rules are not public)
- https://www.designweek.co.uk/inspiration/merck-identity-by-futurebrand/: background on the Vibrant M identity (third-party, **low**)
- Headline-font fallback (MWeb → Montserrat) and header colour: my judgement (**low**)

## Differs from current Figma
- **Primary:** current `#503291` **matches** Liquid `--ld-col-rp` (Rich Purple), the Shake theme primary.
- **Secondary:** current `#EB3C96` **matches** `--ld-col-vm` (Vibrant Magenta), the Shake theme secondary. Keep both, but note that Liquid's default theme is Ocean (`#0F69AF` / `#2DBECD`).
- What should change from the AkzoNobel copy:
  - Font: Noto Sans becomes **Lato** (free on Google Fonts, so no fallback is needed).
  - Buttons: Lato **Bold 16 px**, 40 px high, 4 px radius. Secondary buttons get a 2 px primary border.
  - Inputs: 2 px `#E1E1EA` inset border.
  - Colours: text `#0F1A2E` (navy-black), secondary text `#5E5E72`, lilac-grey neutrals `#F8F8FC` / `#E1E1EA`.
  - Status: success `#01884C`, error `#E61E50`, warning `#FFC832` (yellow fill, needs dark text).
  - Tabs: filled ("boxed") with a primary indicator.
